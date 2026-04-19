"use client"
import React, { useState, useCallback, useRef } from "react";
import ImageViewer from "./ImageViewer";
import {BlockMath} from 'react-katex'

export default function Emphasizer({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [action, setAction] = useState("shift");
  const [domain, setDomain] = useState("spatial");
  const [resultImg, setResultImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [params, setParams] = useState<Record<string, any>>({
    dx: 50, dy: 50,
    u0: 10, v0: 10,
    fx: 1.5, fy: 1.5,
    axis: "x",
    mode: "even",
    angle: 45,
    type: "gaussian",
    kernel_size: 15,
    stride: 1,
    sigma: 4.0,
    normalize: true,
    times: 2,
  });

  // Stable setter — identity doesn't change between renders
  const hUpdate = useCallback((k: string, v: any) =>
    setParams(prev => ({ ...prev, [k]: v })), []);

  // Sliders write directly to state (display updates live); the Compute
  // button reads the final committed value from `params` at click time.
  // Using a ref to avoid stale closures when the slider fires rapidly.
  const sliderRef = useRef(params);
  sliderRef.current = params;

  const handleCompute = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/emphasizer/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port: "5", action, domain, params: sliderRef.current }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.detail ?? `Server error (${res.status})`);
        return;
      }

      if (data.spatial_b64) {
        setResultImg(`data:image/png;base64,${data.spatial_b64}`);
      } else {
        setError("Backend returned no image.");
      }
    } catch (err: any) {
      setError(`Network error: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  // ── shared style tokens
  const inp = "bg-[#120e09] border border-[#4a3c30] w-full p-2 rounded text-[#f5ede6] text-xs mt-1";
  const sel = "bg-[#120e09] border border-[#4a3c30] p-2 rounded w-full text-[#f5ede6] text-xs mt-1";
  const lbl = "text-[#8a7a6a] uppercase tracking-widest text-[10px]";

  // Reusable slider row — shows live label value and a synchronized input
  const renderSlider = (k: string, min: number, max: number, step = 1, unit = "") => (
    <div className="flex flex-col gap-1" key={k}>
      <div className="flex justify-between mb-0.5">
        <span className={lbl}>{k.replace(/_/g, " ")}</span>
      </div>
      <div className="flex gap-3 items-center">
        <input
          type="range" min={min} max={max} step={step}
          value={params[k]}
          onChange={e => hUpdate(k, +e.target.value)}
          className="flex-1 h-1 accent-[#c8956c]"
        />
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min={min} max={max} step={step}
            value={params[k]}
            onChange={e => hUpdate(k, +e.target.value)}
            className="w-14 bg-[#120e09] border border-[#4a3c30] rounded px-1.5 py-1 text-[#f5ede6] font-mono text-[10px] text-right outline-none focus:border-[#c8956c] transition-colors"
          />
          {unit && <span className="text-[#a89a8c] text-[10px] min-w-[12px]">{unit}</span>}
        </div>
      </div>
    </div>
  );

  const renderParams = () => {
    switch (action) {
      case "shift": return (
        <div className="flex gap-2">
          <div className="flex-1">
            <span className={lbl}>dx</span>
            <input type="number" value={params.dx} onChange={e => hUpdate('dx', +e.target.value)} className={inp} />
          </div>
          <div className="flex-1">
            <span className={lbl}>dy</span>
            <input type="number" value={params.dy} onChange={e => hUpdate('dy', +e.target.value)} className={inp} />
          </div>
        </div>
      );
      case "multiply_exp": return (
        <div>
          <div className="flex gap-2">
            <div className="flex-1">
              <span className={lbl}>u₀</span>
              <input type="number" value={params.u0} onChange={e => hUpdate('u0', +e.target.value)} className={inp} />
            </div>
            <div className="flex-1">
              <span className={lbl}>v₀</span>
              <input type="number" value={params.v0} onChange={e => hUpdate('v0', +e.target.value)} className={inp} />
            </div>
          </div>
          <div className="my-5">
            <label className="font-medium text-[#8a7a6a] uppercase tracking-widest">Equation</label>
            <div className="ml-2 mt-2 font-medium text-[#786859] tracking-widest text-xl">
              <BlockMath math="e^{-j(u_0 x + v_0 y)}" />
            </div>
          </div>
        </div>
      );
      case "stretch": return (
        <div className="flex gap-2">
          <div className="flex-1">
            <span className={lbl}>fx</span>
            <input type="number" step="0.1" value={params.fx} onChange={e => hUpdate('fx', +e.target.value)} className={inp} />
          </div>
          <div className="flex-1">
            <span className={lbl}>fy</span>
            <input type="number" step="0.1" value={params.fy} onChange={e => hUpdate('fy', +e.target.value)} className={inp} />
          </div>
        </div>
      );
      case "mirror": return (
        <div>
          <span className={lbl}>Axis</span>
          <select value={params.axis} onChange={e => hUpdate('axis', e.target.value)} className={sel}>
            <option value="x">Flip Vertical (X axis)</option>
            <option value="y">Flip Horizontal (Y axis)</option>
            <option value="both">Both axes</option>
          </select>
        </div>
      );
      case "even_odd": return (
        <div>
          <span className={lbl}>Decomposition</span>
          <select value={params.mode} onChange={e => hUpdate('mode', e.target.value)} className={sel}>
            <option value="even">Even part</option>
            <option value="odd">Odd part</option>
          </select>
        </div>
      );
      case "rotate": return renderSlider("angle", 0, 360, 1, "°");
      case "differentiate":
      case "integrate": return (
        <div>
          <span className={lbl}>Axis</span>
          <select value={params.axis} onChange={e => hUpdate('axis', e.target.value)} className={sel}>
            <option value="x">X axis</option>
            <option value="y">Y axis</option>
          </select>
        </div>
      );

      case "window": return (
        <div className="flex flex-col gap-3">
          {/* Kernel type */}
          <div>
            <span className={lbl}>Kernel Type</span>
            <select
              value={params.type}
              onChange={e => hUpdate('type', e.target.value)}
              className={sel}
            >
              <option value="rectangular">Rectangular (Box)</option>
              <option value="gaussian">Gaussian</option>
              <option value="hamming">Hamming</option>
              <option value="hanning">Hanning</option>
            </select>
          </div>

          {/* Kernel size — backend enforces odd */}
          {renderSlider("kernel_size", 1, 99, 2, "px")}

          {/* Stride */}
          {renderSlider("stride", 1, 20, 1, "px")}

          {/* Sigma — Gaussian only */}
          {params.type === "gaussian" && (
            <div>
              <span className={lbl}>Sigma (σ)</span>
              <input
                type="number" step="0.5" min="0.5"
                value={params.sigma}
                onChange={e => hUpdate('sigma', +e.target.value)}
                className={inp}
              />
            </div>
          )}

          {/* Normalize toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-[#3a2e24]">
            <span className={lbl}>Normalize Kernel</span>
            <button
              type="button"
              onClick={() => hUpdate('normalize', !params.normalize)}
              className={`px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase transition-colors ${
                params.normalize
                  ? "bg-[#c8956c] text-[#0d0a07]"
                  : "bg-[#231c16] border border-[#4a3c30] text-[#8a7a6a]"
              }`}
            >
              {params.normalize ? "On" : "Off"}
            </button>
          </div>
        </div>
      );

      case "multiple_ft": return (
        <div>
          <span className={lbl}>Times</span>
          <input
            type="number" value={params.times} min={1} max={10}
            onChange={e => hUpdate('times', +e.target.value)}
            className={inp}
          />
        </div>
      );
    }
  };

  return (
    <div className="flex w-full h-full gap-6 font-sans text-[#c8b8a0]">
      {/* ── Left panel ── */}
      <div className="w-[320px] flex flex-col gap-4 bg-[#1a1410] border border-[#3a2e24] rounded-xl p-5 shadow-xl overflow-y-auto">
        <h3 className="font-semibold text-sm tracking-wide text-[#c8956c] uppercase border-b border-[#4a3c30] pb-3">
          Properties Emphasizer
        </h3>

        {/* Action selector */}
        <div className="flex flex-col gap-1 text-xs">
          <label className="font-medium text-[#8a7a6a] uppercase tracking-widest">Action</label>
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setError(null); setResultImg(null); }}
            className="bg-[#120e09] text-[#f5ede6] border border-[#4a3c30] rounded p-2 outline-none focus:border-[#c8956c] transition-colors"
          >
            <option value="shift">Shift Image</option>
            <option value="multiply_exp">Multiply by Complex Exponent</option>
            <option value="stretch">Stretch</option>
            <option value="mirror">Mirror Symmetry</option>
            <option value="even_odd">Even / Odd</option>
            <option value="rotate">Rotate</option>
            <option value="differentiate">Differentiate</option>
            <option value="integrate">Integrate</option>
            <option value="window">Multiply 2D Window (Conv)</option>
            <option value="multiple_ft">Take Fourier Multiple Times</option>
          </select>
        </div>

        {/* Domain toggle */}
        <div className="flex flex-col gap-1 text-xs">
          <label className="font-medium text-[#8a7a6a] uppercase tracking-widest">Apply On</label>
          <div className="flex gap-2">
            {(["spatial", "frequency"] as const).map(d => (
              <button key={d}
                type="button"
                onClick={() => setDomain(d)}
                className={`flex-1 py-1.5 px-2 rounded border uppercase tracking-wider font-semibold transition-colors text-[10px] ${
                  domain === d
                    ? "bg-[#c8956c] border-[#c8956c] text-[#0d0a07]"
                    : "bg-[#231c16] border-[#4a3c30] text-[#8a7a6a] hover:bg-[#2e2418]"
                }`}
              >{d}</button>
            ))}
          </div>
        </div>

        {/* Dynamic params */}
        <div className="flex flex-col gap-2 text-xs">
          <label className="font-medium text-[#8a7a6a] uppercase tracking-widest">Parameters</label>
          {renderParams()}
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded px-3 py-2 text-xs text-red-300 break-words">
            ⚠ {error}
          </div>
        )}

        {/* Compute */}
        <div className="mt-auto pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleCompute}
            className={`w-full uppercase tracking-widest font-bold text-xs py-3 rounded transition-colors shadow ${
              loading
                ? "bg-[#8a6a4a] text-[#4a3a2a] cursor-not-allowed"
                : "bg-[#c8956c] hover:bg-[#d4a574] text-[#0d0a07]"
            }`}
          >
            {loading ? "Computing…" : `Compute ${action}`}
          </button>
        </div>
      </div>

      {/* ── Right: two viewports ── */}
      <div className="flex-1 grid grid-cols-1 grid-rows-2 gap-6 min-h-0">
        <div className="flex flex-col gap-2 overflow-hidden h-full">
          <span className="text-xs font-semibold text-[#8a7a6a] uppercase tracking-widest pl-1">
            Original — double-click to load
          </span>
          <div className="flex-1 min-h-0">
            <ImageViewer id={5} refreshTrigger={refreshTrigger} />
          </div>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden h-full">
          <span className="text-xs font-semibold text-[#8a7a6a] uppercase tracking-widest pl-1">
            Transformed Result
          </span>
          <div className="flex-1 min-h-0">
            <ImageViewer id={6} externalSrc={resultImg} isOutput={true} refreshTrigger={refreshTrigger} forceShowFrequency={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
