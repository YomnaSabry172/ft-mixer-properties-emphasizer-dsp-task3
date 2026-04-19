import cv2
import numpy as np
from typing import List, Dict, Any, Optional
from scipy.ndimage import convolve as nd_convolve

def normalize_weights(weights: List[float]) -> List[float]:
    total = sum(weights)
    if total == 0:
        return [0.0 for _ in weights]
    return [w / total for w in weights]

def get_window_kernel(window_type: str, kernel_size: int, window_params: Dict[str, Any]) -> np.ndarray:
    if window_type == 'gaussian':
        sigma = max(0.5, float(window_params.get("sigma", kernel_size / 4.0)))
        win_1d = cv2.getGaussianKernel(kernel_size, sigma).flatten()
    elif window_type == 'hamming':
        win_1d = np.hamming(kernel_size).astype(np.float64)
    elif window_type == 'hanning':
        win_1d = np.hanning(kernel_size).astype(np.float64)
    else:
        win_1d = np.ones(kernel_size, dtype=np.float64)
    
    kernel_2d = np.outer(win_1d, win_1d).astype(np.float64)
    
    if window_params.get("normalize", True):
        kernel_sum = kernel_2d.sum()
        if kernel_sum != 0:
            kernel_2d /= kernel_sum
    return kernel_2d

def mix_components(
    images_ft: List['ImageFT'],
    primary_weights: List[float],
    secondary_weights: List[float],
    component_mode: str = "magnitude_phase",
    region_pct: float = 1.0,
    region_inner: bool = True,
    offset_x: float = 0,
    offset_y: float = 0,
) -> np.ndarray:
    primary_weights = normalize_weights(primary_weights)
    secondary_weights = normalize_weights(secondary_weights)

    if component_mode == "real_imaginary":
        mixed_real = np.zeros_like(images_ft[0].real, dtype=np.float64)
        for wt, img in zip(primary_weights, images_ft):
            mixed_real += wt * img.real

        mixed_imag = np.zeros_like(images_ft[0].imag, dtype=np.float64)
        for wt, img in zip(secondary_weights, images_ft):
            mixed_imag += wt * img.imag

        mixed_freq = mixed_real + 1j * mixed_imag
    else:
        mixed_magnitude = np.zeros_like(images_ft[0].magnitude, dtype=np.float64)
        for wt, img in zip(primary_weights, images_ft):
            mixed_magnitude += wt * img.magnitude

        phase_phasor = np.zeros_like(images_ft[0].phase, dtype=np.complex128)
        for wt, img in zip(secondary_weights, images_ft):
            phase_phasor += wt * np.exp(1j * img.phase)
        
        mixed_phase = np.angle(phase_phasor)
        mixed_freq = mixed_magnitude * np.exp(1j * mixed_phase)

    h, w = mixed_freq.shape
    rect_w, rect_h = max(1, int(w * region_pct)), max(1, int(h * region_pct))
    x1 = max(0, min((w - rect_w) // 2 + int(offset_x), w - rect_w))
    y1 = max(0, min((h - rect_h) // 2 + int(offset_y), h - rect_h))
    
    mask = np.zeros((h, w), dtype=np.float32)
    mask[y1:y1 + rect_h, x1:x1 + rect_w] = 1.0
    if not region_inner:
        mask = 1.0 - mask

    mixed_freq *= mask
    mixed_spatial = np.real(np.fft.ifft2(np.fft.ifftshift(mixed_freq)))

    # Output Normalization
    mixed_spatial = (mixed_spatial - mixed_spatial.min()) / (
        mixed_spatial.max() - mixed_spatial.min() + 1e-8
    )
    return (mixed_spatial * 255).astype(np.uint8)


class ImageFT:
    def __init__(self, data: np.ndarray, is_freq: bool = False):
        self._spatial: Optional[np.ndarray] = None
        self._freq_complex: Optional[np.ndarray] = None
        self._freq_shifted: Optional[np.ndarray] = None
        
        # Fourier Property Caches
        self._magnitude: Optional[np.ndarray] = None
        self._phase: Optional[np.ndarray] = None
        self._real: Optional[np.ndarray] = None
        self._imag: Optional[np.ndarray] = None

        if is_freq:
            self._freq_shifted = data.copy()
        else:
            if len(data.shape) == 3:
                gray = cv2.cvtColor(data, cv2.COLOR_BGR2GRAY)
            else:
                gray = data.copy()
            self._spatial = gray.astype(np.float32) if not np.iscomplexobj(gray) else gray

    @property
    def spatial(self) -> np.ndarray:
        if self._spatial is None and self._freq_shifted is not None:
            # Derived from freq_shifted. We don't force np.real here 
            # to allow for complex (modulated) spatial images.
            self._spatial = np.fft.ifft2(np.fft.ifftshift(self._freq_shifted))
        return self._spatial

    @property
    def freq_complex(self) -> np.ndarray:
        if self._freq_complex is None and self.freq_shifted is not None:
            self._freq_complex = np.fft.ifftshift(self.freq_shifted)
        elif self._freq_complex is None and self.spatial is not None:
            self._freq_complex = np.fft.fft2(self.spatial)
        return self._freq_complex

    @property
    def freq_shifted(self) -> np.ndarray:
        if self._freq_shifted is None and self.spatial is not None:
            self._freq_shifted = np.fft.fftshift(np.fft.fft2(self.spatial))
        return self._freq_shifted

    @property
    def magnitude(self) -> np.ndarray:
        if self._magnitude is None:
            self._magnitude = np.abs(self.freq_shifted)
        return self._magnitude

    @property
    def phase(self) -> np.ndarray:
        if self._phase is None:
            self._phase = np.angle(self.freq_shifted)
        return self._phase

    @property
    def real(self) -> np.ndarray:
        if self._real is None:
            self._real = np.real(self.freq_shifted)
        return self._real

    @property
    def imag(self) -> np.ndarray:
        if self._imag is None:
            self._imag = np.imag(self.freq_shifted)
        return self._imag

    # --- Transformers ---

    def apply_shift(self, dx: int, dy: int) -> 'ImageFT':
        shifted = np.roll(self.spatial, dy, axis=0)
        shifted = np.roll(shifted, dx, axis=1)
        return ImageFT(shifted)

    def apply_shift_frequency(self, dx: int, dy: int) -> 'ImageFT':
        # Spectral shift via rolling (Frequency Shift)
        # We roll the centered spectrum directly and return it.
        F_rolled = np.roll(self.freq_shifted, (int(dy), int(dx)), axis=(0, 1))
        return ImageFT(F_rolled, is_freq=True)

    def apply_complex_exp(self, u0: float, v0: float) -> 'ImageFT':
        h, w = self.spatial.shape
        X, Y = np.meshgrid(np.arange(w), np.arange(h))
        exp_term = np.exp(1j * 2 * np.pi * (u0 * X / w + v0 * Y / h))
        return ImageFT(self.spatial * exp_term)

    def apply_complex_exp_frequency(self, u0: float, v0: float) -> 'ImageFT':
        # Apply complex exponential in Frequency Domain (Phase Ramp)
        # Shift in space = phase ramp in frequency. 
        # We work on the centered spectrum for consistency.
        h, w = self.spatial.shape
        # Use shifted frequency coordinates for the centered spectrum
        u = np.linspace(-0.5, 0.5, w, endpoint=False)
        v = np.linspace(-0.5, 0.5, h, endpoint=False)
        U, V = np.meshgrid(u, v)
        # Note: u0, v0 are pixel shifts
        exp_term = np.exp(-1j * 2 * np.pi * (u0 * U + v0 * V))
        return ImageFT(self.freq_shifted * exp_term, is_freq=True)

    def apply_stretch(self, factor_x: float, factor_y: float) -> 'ImageFT':
        h, w = self.spatial.shape
        new_w, new_h = max(1, int(w * factor_x)), max(1, int(h * factor_y))
        stretched = cv2.resize(self.spatial, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        return ImageFT(stretched)

    def apply_stretch_frequency(self, factor_x: float, factor_y: float) -> 'ImageFT':
        F_shifted = self.freq_shifted
        h, w = F_shifted.shape
        new_w, new_h = max(1, int(w / factor_x)), max(1, int(h / factor_y))
        
        real_resized = cv2.resize(np.real(F_shifted), (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        imag_resized = cv2.resize(np.imag(F_shifted), (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        F_resized = real_resized + 1j * imag_resized
        
        F_out = np.zeros((h, w), dtype=np.complex128)
        sy1, sx1 = max(0, (new_h - h) // 2), max(0, (new_w - w) // 2)
        wh, ww = min(new_h, h), min(new_w, w)
        dy1, dx1 = max(0, (h - new_h) // 2), max(0, (w - new_w) // 2)
        
        F_out[dy1:dy1+wh, dx1:dx1+ww] = F_resized[sy1:sy1+wh, sx1:sx1+ww]
        F_out /= (factor_x * factor_y + 1e-8)
        
        return ImageFT(np.real(np.fft.ifft2(np.fft.ifftshift(F_out))))

    def apply_mirror(self, axis: str) -> 'ImageFT':
        if axis == 'x': mirrored = np.flipud(self.spatial)
        elif axis == 'y': mirrored = np.fliplr(self.spatial)
        elif axis == 'both': mirrored = np.flip(self.spatial, axis=(0, 1))
        else: mirrored = self.spatial.copy()
        return ImageFT(mirrored)

    def apply_mirror_frequency(self, axis: str) -> 'ImageFT':
        h, w = self.spatial.shape
        padded = np.pad(self.spatial.astype(np.float64), ((h, h), (w, w)), mode='constant')
        F = np.fft.fft2(padded)
        if axis == 'x': F_mirrored = np.fliplr(F)
        elif axis == 'y': F_mirrored = np.flipud(F)
        elif axis == 'both': F_mirrored = np.flip(F, axis=(0, 1))
        else: F_mirrored = F.copy()
        
        img_out = np.real(np.fft.ifft2(np.conj(F_mirrored)))
        return ImageFT(img_out[h:2*h, w:2*w])

    def apply_even_odd(self, mode: str) -> 'ImageFT':
        mirrored = np.flip(self.spatial, axis=(0, 1))
        if mode == 'even':
            res = 0.5 * (self.spatial + mirrored)
            ft = ImageFT(res)
            ft._freq_shifted = np.real(ft.freq_shifted).astype(np.complex128)
        else:
            res = 0.5 * (self.spatial - mirrored)
            ft = ImageFT(res)
            ft._freq_shifted = (1j * np.imag(ft.freq_shifted)).astype(np.complex128)
        ft._freq_complex = None # reset unshifted
        return ft

    def apply_even_odd_frequency(self, mode: str) -> 'ImageFT':
        if mode == 'even':
            F_decomp = np.real(self.freq_shifted).astype(np.complex128)
        else:
            F_decomp = 1j * np.imag(self.freq_shifted)
        return ImageFT(F_decomp, is_freq=True)

    def apply_rotate(self, angle: float) -> 'ImageFT':
        h, w = self.spatial.shape
        center = (w / 2, h / 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        cos, sin = np.abs(M[0, 0]), np.abs(M[0, 1])
        nw, nh = int((h * sin) + (w * cos)), int((h * cos) + (w * sin))
        M[0, 2] += (nw / 2) - center[0]
        M[1, 2] += (nh / 2) - center[1]
        return ImageFT(cv2.warpAffine(self.spatial, M, (nw, nh)))

    def apply_rotate_frequency(self, angle: float) -> 'ImageFT':
        F_shifted = self.freq_shifted
        h, w = F_shifted.shape
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        rot_real = cv2.warpAffine(np.real(F_shifted), M, (w, h), flags=cv2.INTER_LINEAR)
        rot_imag = cv2.warpAffine(np.imag(F_shifted), M, (w, h), flags=cv2.INTER_LINEAR)
        return ImageFT(np.fft.ifft2(np.fft.ifftshift(rot_real + 1j * rot_imag)))

    def apply_differentiate(self, axis: str) -> 'ImageFT':
        diff = np.diff(self.spatial, axis=(1 if axis == 'x' else 0), append=0)
        return ImageFT(diff)

    def apply_differentiate_frequency(self, axis: str) -> 'ImageFT':
        r, c = self.spatial.shape
        U, V = np.meshgrid(np.fft.fftfreq(c), np.fft.fftfreq(r))
        H = 1j * 2 * np.pi * (U if axis == 'x' else V)
        G = H * np.fft.fftshift(np.fft.fft2(self.spatial))
        return ImageFT(np.fft.ifft2(np.fft.ifftshift(G)))

    def apply_integrate_frequency(self, axis: str) -> 'ImageFT':
        r, c = self.spatial.shape
        U, V = np.meshgrid(np.fft.fftfreq(c), np.fft.fftfreq(r))
        H = 1 / (1j * 2 * np.pi * (U if axis == 'x' else V) + 1e-8)
        return ImageFT(np.fft.ifft2(H * np.fft.fft2(self.spatial)))

    def apply_window(self, window_type: str, window_params: dict) -> 'ImageFT':
        kernel = get_window_kernel(window_type, window_params.get("kernel_size", 15), window_params)
        convolved = nd_convolve(self.spatial.astype(np.float64), kernel, mode='reflect')
        stride = max(1, int(window_params.get("stride", 1)))
        return ImageFT(convolved[::stride, ::stride].astype(np.float32))

    def apply_window_frequency(self, window_type: str, window_params: dict) -> 'ImageFT':
        h, w = self.spatial.shape
        kernel = get_window_kernel(window_type, window_params.get("kernel_size", 15), window_params)
        padded = np.zeros((h, w), dtype=np.float64)
        kh, kw = kernel.shape
        ch, cw = h // 2, w // 2
        
        y1, y2 = max(0, ch - kh // 2), min(h, ch - kh // 2 + kh)
        x1, x2 = max(0, cw - kw // 2), min(w, cw - kw // 2 + kw)
        padded[y1:y2, x1:x2] = kernel[max(0, kh//2-ch):kh//2-ch+(y2-y1), max(0, kw//2-cw):kw//2-cw+(x2-x1)]
        
        H = np.fft.fft2(np.fft.ifftshift(padded))
        img_out = np.fft.ifft2(np.fft.fft2(self.spatial) * H)
        stride = max(1, int(window_params.get("stride", 1)))
        return ImageFT(img_out[::stride, ::stride])

    def apply_integrate(self, axis: str) -> 'ImageFT':
        return ImageFT(np.cumsum(self.spatial, axis=(1 if axis == 'x' else 0)))

    def apply_multiple_ft(self, times: int) -> 'ImageFT':
        curr = self
        for _ in range(times):
            curr = ImageFT(curr.freq_complex)
        return curr
