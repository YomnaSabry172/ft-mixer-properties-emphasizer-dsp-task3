"use client";

import { useRef, useState, useEffect } from "react";

type MixMode = "magnitude_phase" | "real_imaginary";

type MixerProps = {
  onResult: (src: string) => void;
  regionSize: number;
  setRegionSize: (value: number) => void;
  regionInner: boolean;
  setRegionInner: (value: boolean) => void;
  regionOffset: { x: number; y: number };
  targetPort: string;
  setTargetPort: (value: string) => void;
  onResizeApply?: (data: any) => void;
};

export default function MixerControls({
  onResult,
  regionSize,
  setRegionSize,
  regionInner,
  setRegionInner,
  regionOffset,
  targetPort,
  setTargetPort,
  onResizeApply,
}: MixerProps) {
  const [mixMode, setMixMode] = useState<MixMode>("magnitude_phase");
  const [primaryWeights, setPrimaryWeights] = useState([100, 0, 0, 0]);
  const [secondaryWeights, setSecondaryWeights] = useState([100, 0, 0, 0]);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [resizeMode, setResizeMode] = useState("smallest");
  const [aspectMode, setAspectMode] = useState("keep");
  const [fixedWidth, setFixedWidth] = useState(512);
  const [fixedHeight, setFixedHeight] = useState(512);

  const [slowMode, setSlowMode] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/mixer/apply_resize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: resizeMode, aspect: aspectMode, fixed_width: fixedWidth, fixed_height: fixedHeight })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && onResizeApply) {
          onResizeApply(data);
        }
      })
      .catch(err => console.error("Could not apply global resize", err));
  }, [resizeMode, aspectMode, fixedWidth, fixedHeight, onResizeApply]);

  const primaryLabel = mixMode === "magnitude_phase" ? "Magnitude" : "Real";
  const secondaryLabel = mixMode === "magnitude_phase" ? "Phase" : "Imaginary";

  const handlePrimaryChange = (index: number, value: number) => {
    const updated = [...primaryWeights];
    updated[index] = value;
    setPrimaryWeights(updated);
  };

  const handleSecondaryChange = (index: number, value: number) => {
    const updated = [...secondaryWeights];
    updated[index] = value;
    setSecondaryWeights(updated);
  };

  const runMixer = async () => {
    try {
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;
  
      setIsLoading(true);
      setProgress(20);
  
      const allPorts = ["1", "2", "3", "4"];
  
      const activeIndexes = allPorts
        .map((port, i) => ({ port, i }))
        .filter(({ i }) => primaryWeights[i] > 0 || secondaryWeights[i] > 0);

      if (activeIndexes.length === 0) {
        alert("Please assign at least one non-zero mixer weight.");
        setIsLoading(false);
        setProgress(0);
        return;
      }
  
      const reqBody = {
        mix_mode: mixMode,
        ports: activeIndexes.map(({ port }) => port),
        mag_weights: mixMode === "magnitude_phase"
          ? activeIndexes.map(({ i }) => primaryWeights[i])
          : [],
        phase_weights: mixMode === "magnitude_phase"
          ? activeIndexes.map(({ i }) => secondaryWeights[i])
          : [],
        real_weights: mixMode === "real_imaginary"
          ? activeIndexes.map(({ i }) => primaryWeights[i])
          : [],
        imaginary_weights: mixMode === "real_imaginary"
          ? activeIndexes.map(({ i }) => secondaryWeights[i])
          : [],
        target_port: targetPort,
        region: {
          pct: regionSize,
          inner: regionInner,
          offset_x: regionOffset.x,
          offset_y: regionOffset.y,
        },
        resize: {
          mode: resizeMode,
          aspect: aspectMode,
          fixed_width: fixedWidth,
          fixed_height: fixedHeight,
        },
        simulate_slow: slowMode,
      };
  
      setProgress(50);
  
      const res = await fetch("http://127.0.0.1:8000/api/mixer/mix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });
  
      if (currentRequestId !== requestIdRef.current) return;
  
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.detail || "Mix request failed");
        return;
      }
  
      setProgress(80);
  
      const data = await res.json();
  
      if (currentRequestId !== requestIdRef.current) return;
  
      if (data.error) {
        alert(data.error);
        return;
      }
  
      if (data.mixed_image_b64) {
        onResult(`data:image/png;base64,${data.mixed_image_b64}`);
      } else {
        alert("Backend returned no mixed image.");
        return;
      }
  
      setProgress(100);
    } catch (err) {
      console.error("Mix failed", err);
      alert("Something went wrong while mixing.");
    } finally {
      setTimeout(() => {
        if (requestIdRef.current >= 0) {
          setIsLoading(false);
          setProgress(0);
        }
      }, 400);
    }
  };

  return (
    <div className="text-[#f5ede6] text-[11px]">
      {/* Target Port + Resize in a row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="uppercase tracking-widest text-[#8a7a6a] mb-1 text-[10px]">Target Port</div>
          <select
            value={targetPort}
            onChange={(e) => setTargetPort(e.target.value)}
            className="w-full bg-[#120e09] border border-[#4a3c30] rounded px-2 py-1.5 text-[11px] text-[#f5ede6]"
          >
            <option value="1">Output 1</option>
            <option value="2">Output 2</option>
          </select>
        </div>
        <div>
          <div className="uppercase tracking-widest text-[#8a7a6a] mb-1 text-[10px]">Resize</div>
          <select
            value={resizeMode}
            onChange={(e) => setResizeMode(e.target.value)}
            className="w-full bg-[#120e09] border border-[#4a3c30] rounded px-2 py-1.5 text-[11px] text-[#f5ede6]"
          >
            <option value="smallest">Smallest</option>
            <option value="largest">Largest</option>
            <option value="fixed">Fixed Size</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="uppercase tracking-widest text-[#8a7a6a] mb-1 text-[10px]">Aspect</div>
          <select
            value={aspectMode}
            onChange={(e) => setAspectMode(e.target.value)}
            className="w-full bg-[#120e09] border border-[#4a3c30] rounded px-2 py-1.5 text-[11px] text-[#f5ede6]"
          >
            <option value="keep">Keep Ratio</option>
            <option value="ignore">Ignore Ratio</option>
          </select>
        </div>
        <div className="flex items-end">
          <div className="flex items-center gap-2 w-full">
            <div className="uppercase tracking-widest text-[#8a7a6a] text-[10px] shrink-0">Delayed Simulation</div>
            <button
              type="button"
              onClick={() => setSlowMode(!slowMode)}
              className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${
                slowMode ? "bg-[#c8956c] text-[#0d0a07] border border-[#4a3c30]" : "bg-[#231c16] text-[#f5ede6] border border-[#4a3c30]"
              }`}
            >
              {slowMode ? "On" : "Off"}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="uppercase tracking-widest text-[#8a7a6a] mb-1.5 text-[10px]">Mixing Mode</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMixMode("magnitude_phase")}
            className={`px-2 py-2 rounded text-[10px] font-bold tracking-widest uppercase border transition-colors ${
              mixMode === "magnitude_phase"
                ? "bg-[#c8956c] text-[#0d0a07] border-[#c8956c]"
                : "bg-[#231c16] text-[#f5ede6] border-[#4a3c30]"
            }`}
          >
            Magnitude / Phase
          </button>
          <button
            type="button"
            onClick={() => setMixMode("real_imaginary")}
            className={`px-2 py-2 rounded text-[10px] font-bold tracking-widest uppercase border transition-colors ${
              mixMode === "real_imaginary"
                ? "bg-[#c8956c] text-[#0d0a07] border-[#c8956c]"
                : "bg-[#231c16] text-[#f5ede6] border-[#4a3c30]"
            }`}
          >
            Real / Imaginary
          </button>
        </div>
      </div>

      {resizeMode === "fixed" && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Width */}
          <div className="relative">
            <label className="text-[11px] text-[#a89a8c] ml-1">Width</label>
            <input
              type="number"
              min="1"
              value={fixedWidth}
              onChange={(e) => setFixedWidth(Number(e.target.value))}
              className="w-full pr-8 bg-[#120e09] border border-[#4a3c30] rounded px-2 py-1.5 mt-1 text-[11px] text-[#f5ede6]"
              placeholder="Width"
            />
            <span className="absolute right-2 top-9/13 -translate-y-1/2 text-[10px] text-[#a89a8c]">
              px
            </span>
          </div>

          {/* Height */}
          <div className="relative">
            <label className="text-[11px] text-[#a89a8c] ml-1">Height</label>
            <input
              type="number"
              min="1"
              value={fixedHeight}
              onChange={(e) => setFixedHeight(Number(e.target.value))}
              className="w-full pr-8 bg-[#120e09] border border-[#4a3c30] rounded px-2 py-1.5 mt-1 text-[11px] text-[#f5ede6]"
              placeholder="Height"
            />
            <span className="absolute right-2 top-9/13 -translate-y-1/2 text-[10px] text-[#a89a8c]">
              px
            </span>
          </div>
        </div>
      )}

      {/* Selected component weights */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="uppercase tracking-widest text-[#8a7a6a] mb-1.5 text-[10px]">{primaryLabel}</div>
          {primaryWeights.map((w, i) => (
            <div key={`primary-${i}`} className="mb-1.5">
              <div className="flex justify-between text-[10px] text-[#6a5a4a] mb-0.5">
                <span>Img {i + 1}</span>
                <span>{w}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={w}
                onChange={(e) => handlePrimaryChange(i, Number(e.target.value))}
                className="w-full h-1 accent-[#c8956c]"
              />
            </div>
          ))}
        </div>

        <div>
          <div className="uppercase tracking-widest text-[#8a7a6a] mb-1.5 text-[10px]">{secondaryLabel}</div>
          {secondaryWeights.map((w, i) => (
            <div key={`secondary-${i}`} className="mb-1.5">
              <div className="flex justify-between text-[10px] text-[#6a5a4a] mb-0.5">
                <span>Img {i + 1}</span>
                <span>{w}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={w}
                onChange={(e) => handleSecondaryChange(i, Number(e.target.value))}
                className="w-full h-1 accent-[#a67c52]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Crop Config */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="uppercase tracking-widest text-[#8a7a6a] text-[10px]">Crop</div>
          <div>
            <label className="uppercase tracking-widest text-[#8a7a6a] text-[10px] mr-1">select Type</label>
            <button
              type="button" 
              onClick={() => setRegionInner(!regionInner)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${
                regionInner ? "bg-[#c8956c] text-[#0d0a07]" : "bg-[#8b4513] text-[#f5ede6]"
              }`}
            >
              {regionInner ? "Inner" : "Outer"}
            </button>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={regionSize}
          onChange={(e) => setRegionSize(Number(e.target.value))}
          className={`w-full h-1 bg-[#3a2e24] rounded-lg appearance-none cursor-pointer ${
            regionInner ? "accent-[#c8956c]" : "accent-[#8b4513]"
          }`}
        />

        <div className="flex justify-between text-[9px] text-[#6a5a4a] font-mono mt-1">
          <span>0%</span>
          <span className="text-[#f5ede6]">{regionSize}%</span>
          <span>100%</span>
        </div>
      </div>

      <button
        className="mt-2 w-full bg-[#c8956c] hover:bg-[#d4a574] text-[#0d0a07] uppercase tracking-widest font-bold text-[11px] py-2.5 rounded transition-colors shadow"
        onClick={runMixer}
      >
        {isLoading ? "Mixing..." : "Run Mixer"}
      </button>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="w-full bg-[#3a2e24] rounded h-1.5 overflow-hidden">
          <div
            className="bg-[#c8956c] h-1.5 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-right text-[9px] text-[#6a5a4a] mt-0.5">
          {progress}%
        </div>
      </div>
    </div>
  );
}
