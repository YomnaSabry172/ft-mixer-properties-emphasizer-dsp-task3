from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import numpy as np
import cv2
import base64
from typing import Dict, Any
from api.mixer import image_cache
from core.fourier import ImageFT

router = APIRouter()

class EmphasizeRequest(BaseModel):
    port: str
    action: str
    domain: str
    params: Dict[str, Any] = Field(default_factory=dict)

@router.post("/process")
def process_emphasizer(req: EmphasizeRequest):
    if req.port not in image_cache:
        raise HTTPException(status_code=400, detail="Original image not loaded")
        
    original_ft = image_cache[req.port]
    
    # If the user selects the action to be applied on the Frequency domain,
    # the operation mathematically can be solved by passing the frequency 
    # to the property methods (which applies it on 'spatial' attribute),
    # so we treat `original_ft` frequency complex as the pseudo-spatial.
    if req.domain == "frequency":
        working_ft = ImageFT(original_ft.freq_shifted, is_freq=False)
    else:
        working_ft = original_ft
        
    action = req.action
    p = req.params
    
    if action == "shift":
        if req.domain == "frequency":
            result_ft = original_ft.apply_shift_frequency(p.get("dx", 0), p.get("dy", 0))
            image_cache["6"] = result_ft
            out_spatial = np.abs(result_ft.spatial)
            min_v, max_v = out_spatial.min(), out_spatial.max()
            if max_v - min_v > 0:
                out_spatial = (out_spatial - min_v) / (max_v - min_v)
            out_img = (out_spatial * 255).astype(np.uint8)
            _, encoded_img = cv2.imencode('.png', out_img)
            b64_str = base64.b64encode(encoded_img).decode('utf-8')
            return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
        else:
            result_ft = working_ft.apply_shift(p.get("dx", 0), p.get("dy", 0))
        
    elif action == "multiply_exp":
        if req.domain == "frequency":
            result_ft = original_ft.apply_complex_exp_frequency(p.get("u0", 0), p.get("v0", 0))
            image_cache["6"] = result_ft
            out_spatial = np.abs(result_ft.spatial)
            min_v, max_v = out_spatial.min(), out_spatial.max()
            if max_v - min_v > 0:
                out_spatial = (out_spatial - min_v) / (max_v - min_v)
            out_img = (out_spatial * 255).astype(np.uint8)
            _, encoded_img = cv2.imencode('.png', out_img)
            b64_str = base64.b64encode(encoded_img).decode('utf-8')
            return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
        else:
            result_ft = working_ft.apply_complex_exp(p.get("u0", 0), p.get("v0", 0))
    elif action == "stretch":
        if req.domain == "frequency":
            result_ft = original_ft.apply_stretch_frequency(p.get("fx", 1.0), p.get("fy", 1.0))
            image_cache["6"] = result_ft
            out_spatial = np.abs(result_ft.spatial)
            min_v, max_v = out_spatial.min(), out_spatial.max()
            if max_v - min_v > 0:
                out_spatial = (out_spatial - min_v) / (max_v - min_v)
            out_img = (out_spatial * 255).astype(np.uint8)
            _, encoded_img = cv2.imencode('.png', out_img)
            b64_str = base64.b64encode(encoded_img).decode('utf-8')
            return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
        else:
            result_ft = working_ft.apply_stretch(p.get("fx", 1.0), p.get("fy", 1.0))
    elif action == "mirror":
        if req.domain == "frequency":
            result_ft = original_ft.apply_mirror_frequency(p.get("axis", "x"))
            image_cache["6"] = result_ft
            out_spatial = np.abs(result_ft.spatial)
            min_v, max_v = out_spatial.min(), out_spatial.max()
            if max_v - min_v > 0:
                out_spatial = (out_spatial - min_v) / (max_v - min_v)
            out_img = (out_spatial * 255).astype(np.uint8)
            _, encoded_img = cv2.imencode('.png', out_img)
            b64_str = base64.b64encode(encoded_img).decode('utf-8')
            return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
        else:
            result_ft = working_ft.apply_mirror(p.get("axis", "x"))
    elif action == "even_odd":
        if req.domain == "frequency":
            result_ft = original_ft.apply_even_odd_frequency(p.get("mode", "even"))
            image_cache["6"] = result_ft
            out_spatial = np.abs(result_ft.spatial)
            min_v, max_v = out_spatial.min(), out_spatial.max()
            if max_v - min_v > 0:
                out_spatial = (out_spatial - min_v) / (max_v - min_v)
            out_img = (out_spatial * 255).astype(np.uint8)
            _, encoded_img = cv2.imencode('.png', out_img)
            b64_str = base64.b64encode(encoded_img).decode('utf-8')
            return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
        else:
            result_ft = working_ft.apply_even_odd(p.get("mode", "even"))
    elif action == "rotate":
        if req.domain == "frequency":
            result_ft = original_ft.apply_rotate_frequency(p.get("angle", 0))
            image_cache["6"] = result_ft
            out_spatial = np.abs(result_ft.spatial)
            min_v, max_v = out_spatial.min(), out_spatial.max()
            if max_v - min_v > 0:
                out_spatial = (out_spatial - min_v) / (max_v - min_v)
            out_img = (out_spatial * 255).astype(np.uint8)
            _, encoded_img = cv2.imencode('.png', out_img)
            b64_str = base64.b64encode(encoded_img).decode('utf-8')
            return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
        else:
            result_ft = working_ft.apply_rotate(p.get("angle", 0))
    elif action == "differentiate":
        if req.domain == "frequency":
            # Use the dedicated frequency-domain differentiation (multiply by jω)
            # directly on the original image — bypasses the pseudo-spatial trick
            result_ft = original_ft.apply_differentiate_frequency(p.get("axis", "x"))
            # Skip the generic freq→spatial reversal at the bottom
            image_cache["6"] = result_ft
            out_spatial = np.abs(result_ft.spatial)
            min_v, max_v = out_spatial.min(), out_spatial.max()
            if max_v - min_v > 0:
                out_spatial = (out_spatial - min_v) / (max_v - min_v)
            out_img = (out_spatial * 255).astype(np.uint8)
            _, encoded_img = cv2.imencode('.png', out_img)
            b64_str = base64.b64encode(encoded_img).decode('utf-8')
            return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
        else:
            result_ft = working_ft.apply_differentiate(p.get("axis", "x"))
    elif action == "integrate":
        if req.domain == "frequency":
            result_ft = original_ft.apply_integrate_frequency(p.get("axis", "x"))
            image_cache["6"] = result_ft
            out_spatial = np.abs(result_ft.spatial)
            min_v, max_v = out_spatial.min(), out_spatial.max()
            if max_v - min_v > 0:
                out_spatial = (out_spatial - min_v) / (max_v - min_v)
            out_img = (out_spatial * 255).astype(np.uint8)
            _, encoded_img = cv2.imencode('.png', out_img)
            b64_str = base64.b64encode(encoded_img).decode('utf-8')
            return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
        else:
            result_ft = working_ft.apply_integrate(p.get("axis", "x"))
    elif action == "window":
        if req.domain == "frequency":
            result_ft = original_ft.apply_window_frequency(p.get("type", "rectangular"), p)
            image_cache["6"] = result_ft
            out_spatial = np.abs(result_ft.spatial)
            min_v, max_v = out_spatial.min(), out_spatial.max()
            if max_v - min_v > 0:
                out_spatial = (out_spatial - min_v) / (max_v - min_v)
            out_img = (out_spatial * 255).astype(np.uint8)
            _, encoded_img = cv2.imencode('.png', out_img)
            b64_str = base64.b64encode(encoded_img).decode('utf-8')
            return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
        else:
            result_ft = working_ft.apply_window(p.get("type", "rectangular"), p)
    elif action == "multiple_ft":
        result_ft = working_ft.apply_multiple_ft(p.get("times", 1))
    else:
        result_ft = working_ft
        
    # If we operated on the Frequency domain, the result spatial actually represents the new frequency.
    # We must synthesize a true ImageFT from this new frequency.
    if req.domain == "frequency":
        # we reverse it: the output spatial of result_ft is our new freq
        final_ft = ImageFT(result_ft.spatial, is_freq=True)
    else:
        final_ft = result_ft

    # Save to port 6 (transformed image)
    image_cache["6"] = final_ft
    
    # Send back the spatial image (could be complex, so take real and abs for display)
    out_spatial = np.abs(final_ft.spatial)
    min_v, max_v = out_spatial.min(), out_spatial.max()
    if max_v - min_v > 0:
        out_spatial = (out_spatial - min_v) / (max_v - min_v)
    out_img = (out_spatial * 255).astype(np.uint8)
    
    _, encoded_img = cv2.imencode('.png', out_img)
    b64_str = base64.b64encode(encoded_img).decode('utf-8')
    
    return {"success": True, "spatial_b64": b64_str, "target_port": "6"}
