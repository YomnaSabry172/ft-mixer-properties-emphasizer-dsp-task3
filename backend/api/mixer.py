from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import numpy as np
import cv2
import base64
import asyncio
from core.fourier import ImageFT, mix_components

router = APIRouter()

image_cache: dict[str, ImageFT] = {}
raw_image_cache: dict[str, np.ndarray] = {}
original_raw_image_cache: dict[str, np.ndarray] = {}

task_state = {"current_mix_task_id": 0}

@router.post("/clear")
def clear_caches():
    image_cache.clear()
    raw_image_cache.clear()
    original_raw_image_cache.clear()
    task_state["current_mix_task_id"] += 1
    return {"message": "Caches cleared"}


class ResizeRequest(BaseModel):
    mode: str = "smallest"
    aspect: str = "keep"
    fixed_width: int = 512
    fixed_height: int = 512

@router.post("/apply_resize")
def apply_resize(req: ResizeRequest):
    # Only resize if we have images loaded
    active_keys = [k for k in ["1", "2", "3", "4"] if k in original_raw_image_cache]
    if not active_keys:
        return {"success": True, "message": "No input images to resize"}

    # Compute target sizes using the unify policy function
    active_images = [original_raw_image_cache[k] for k in active_keys]
    
    # We call the existing unify_images_by_policy, but it takes a dict
    resize_cfg = req.model_dump()
    resized_images = unify_images_by_policy(active_images, resize_cfg)

    # 1. Update the image_cache and raw_image_cache for the inputs (ports 1,2,3,4)
    for i, port in enumerate(active_keys):
        img_resized = resized_images[i]
        raw_image_cache[port] = img_resized
        image_cache[port] = ImageFT(img_resized)

    # 2. Resize any existing outputs in original_raw_image_cache using the same determined target dimensions
    # so they physically match the new shape
    out1_b64 = None
    if "output1" in original_raw_image_cache:
        target_w = resized_images[0].shape[1]
        target_h = resized_images[0].shape[0]
        out1_resized = (resize_with_aspect(original_raw_image_cache["output1"], target_w, target_h) 
                        if req.aspect == "keep" else resize_ignore_aspect(original_raw_image_cache["output1"], target_w, target_h))
        raw_image_cache["output1"] = out1_resized
        _, encoded = cv2.imencode(".png", out1_resized)
        out1_b64 = base64.b64encode(encoded.tobytes()).decode("utf-8")

    out2_b64 = None
    if "output2" in original_raw_image_cache:
        target_w = resized_images[0].shape[1]
        target_h = resized_images[0].shape[0]
        out2_resized = (resize_with_aspect(original_raw_image_cache["output2"], target_w, target_h) 
                        if req.aspect == "keep" else resize_ignore_aspect(original_raw_image_cache["output2"], target_w, target_h))
        raw_image_cache["output2"] = out2_resized
        _, encoded = cv2.imencode(".png", out2_resized)
        out2_b64 = base64.b64encode(encoded.tobytes()).decode("utf-8")

    # 3. Handle port 5 and 6 (emphasizer) if they exist
    for p_id in ["5", "6"]:
        if p_id in original_raw_image_cache:
            target_w = resized_images[0].shape[1]
            target_h = resized_images[0].shape[0]
            p_resized = (resize_with_aspect(original_raw_image_cache[p_id], target_w, target_h) 
                         if req.aspect == "keep" else resize_ignore_aspect(original_raw_image_cache[p_id], target_w, target_h))
            raw_image_cache[p_id] = p_resized
            image_cache[p_id] = ImageFT(p_resized)

    return {
        "success": True, 
        "message": "All viewports physically resized",
        "output1_b64": out1_b64,
        "output2_b64": out2_b64
    }


def resize_with_aspect(img, target_w, target_h):
    h, w = img.shape[:2]
    scale = min(target_w / w, target_h / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))

    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Create canvas with matching channel count
    canvas_shape = (target_h, target_w, img.shape[2]) if len(img.shape) == 3 else (target_h, target_w)
    canvas = np.zeros(canvas_shape, dtype=np.uint8)
    
    x_off = (target_w - new_w) // 2
    y_off = (target_h - new_h) // 2
    canvas[y_off:y_off + new_h, x_off:x_off + new_w] = resized
    return canvas


def resize_ignore_aspect(img, target_w, target_h):
    return cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_AREA)


def unify_images_by_policy(images, resize_cfg):
    mode = resize_cfg.get("mode", "smallest")
    aspect = resize_cfg.get("aspect", "keep")
    fixed_width = int(resize_cfg.get("fixed_width", 512))
    fixed_height = int(resize_cfg.get("fixed_height", 512))

    widths = [img.shape[1] for img in images]
    heights = [img.shape[0] for img in images]

    if mode == "smallest":
        target_w = min(widths)
        target_h = min(heights)
    elif mode == "largest":
        target_w = max(widths)
        target_h = max(heights)
    elif mode == "fixed":
        target_w = fixed_width
        target_h = fixed_height
    else:
        target_w = min(widths)
        target_h = min(heights)

    resized_images = []
    for img in images:
        if aspect == "keep":
            resized = resize_with_aspect(img, target_w, target_h)
        else:
            resized = resize_ignore_aspect(img, target_w, target_h)
        resized_images.append(resized)

    return resized_images


class MixRequest(BaseModel):
    ports: List[str]
    mix_mode: str = "magnitude_phase"
    mag_weights: List[float] = Field(default_factory=list)
    phase_weights: List[float] = Field(default_factory=list)
    real_weights: List[float] = Field(default_factory=list)
    imaginary_weights: List[float] = Field(default_factory=list)
    target_port: str | None = None
    region: Dict[str, Any]
    resize: Dict[str, Any]
    simulate_slow: bool = False


@router.get("/spatial/{port_id}")
def get_spatial(port_id: str):
    if port_id not in raw_image_cache:
        raise HTTPException(status_code=404, detail=f"No image in port {port_id}")
    
    img = raw_image_cache[port_id]
    _, encoded = cv2.imencode(".png", img)
    image_b64 = base64.b64encode(encoded.tobytes()).decode("utf-8")
    return {"image_b64": image_b64}


@router.post("/upload/{port_id}")
async def upload_image(port_id: str, file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    original_raw_image_cache[port_id] = img.copy()
    raw_image_cache[port_id] = img
    image_cache[port_id] = ImageFT(img)

    return {"message": f"Image uploaded to port {port_id}"}

@router.get("/component/{port_id}/{component_type}")
def get_component(port_id: str, component_type: str):
    if port_id not in image_cache:
        raise HTTPException(status_code=404, detail=f"No image loaded in port {port_id}")

    img_ft = image_cache[port_id]
    component_type = component_type.lower()

    if component_type == "magnitude":
        # FT magnitude has extreme DC spike → log1p compresses dynamic range
        # so that non-DC frequency content is visible. Standard in signal textbooks.
        comp = np.log1p(img_ft.magnitude)

    elif component_type == "phase":
        # Phase is already bounded in [-π, π]. Simple min-max maps to [0, 255].
        # DC phase = 0 for real-valued input → maps near mid-grey (correct).
        comp = img_ft.phase

    elif component_type == "real":
        # Real part has a very large DC bin (= sum of all pixel values) that dwarfs
        # all other bins under linear normalization. Fix: sign-preserving log1p so
        # the DC spike is compressed and non-DC content remains visible, while
        # positive and negative frequencies map symmetrically around mid-grey.
        real = img_ft.real
        comp = np.sign(real) * np.log1p(np.abs(real))

    elif component_type == "imaginary":
        # Imaginary DC is always 0 for real-valued input → no spike problem.
        # Standard min-max normalization is fine.
        comp = img_ft.imag

    else:
        raise HTTPException(status_code=400, detail="Invalid component type. Use: magnitude, phase, real, imaginary")

    comp = comp.astype(np.float64)
    min_v, max_v = comp.min(), comp.max()
    if max_v > min_v:
        comp = (comp - min_v) / (max_v - min_v)
    else:
        comp = np.zeros_like(comp)

    comp = (comp * 255).astype(np.uint8)

    _, encoded = cv2.imencode(".png", comp)
    image_b64 = base64.b64encode(encoded.tobytes()).decode("utf-8")

    return {"image_b64": image_b64}

    
@router.post("/mix")
async def mix_images(req: MixRequest):
    task_state["current_mix_task_id"] += 1
    my_task_id = task_state["current_mix_task_id"]

    if req.mix_mode not in {"magnitude_phase", "real_imaginary"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid mix mode. Use 'magnitude_phase' or 'real_imaginary'."
        )

    if req.mix_mode == "real_imaginary":
        primary_weights = req.real_weights
        secondary_weights = req.imaginary_weights
    else:
        primary_weights = req.mag_weights
        secondary_weights = req.phase_weights

    if len(req.ports) != len(primary_weights) or len(req.ports) != len(secondary_weights):
        raise HTTPException(
            status_code=400,
            detail="Mixer weights must line up with the selected ports."
        )

    if not req.ports:
        raise HTTPException(
            status_code=400,
            detail="Please assign at least one non-zero mixer weight."
        )

    active_images = []
    for port in req.ports:
        if port not in raw_image_cache:
            raise HTTPException(
                status_code=400,
                detail=f"Please load an image in port {port} before mixing."
            )
        active_images.append(raw_image_cache[port])

    resized_images = unify_images_by_policy(active_images, req.resize)
    images_ft = [ImageFT(img) for img in resized_images]

    region_pct = req.region.get("pct", 100) / 100.0
    region_inner = req.region.get("inner", True)
    offset_x = req.region.get("offset_x", 0)
    offset_y = req.region.get("offset_y", 0)

    # Delay for slow simulation, yielding and checking cancelation
    if req.simulate_slow:
        for _ in range(100): # ~2 seconds
            if task_state["current_mix_task_id"] != my_task_id:
                return {"error": "Cancelled"}
            await asyncio.sleep(0.1)

    result = mix_components(
        images_ft=images_ft,
        primary_weights=primary_weights,
        secondary_weights=secondary_weights,
        component_mode=req.mix_mode,
        region_pct=region_pct,
        region_inner=region_inner,
        offset_x=offset_x,
        offset_y=offset_y,
    )

    if task_state["current_mix_task_id"] != my_task_id:
        return {"error": "Cancelled"}

    # Save output to caches for apply_resize functionality
    out_key = "output" + (req.target_port if req.target_port else "1")
    original_raw_image_cache[out_key] = result.copy()
    raw_image_cache[out_key] = result

    _, encoded = cv2.imencode(".png", result)
    mixed_image_b64 = base64.b64encode(encoded.tobytes()).decode("utf-8")

    return {"mixed_image_b64": mixed_image_b64}
