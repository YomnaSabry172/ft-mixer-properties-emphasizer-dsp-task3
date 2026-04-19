"use client";
import React, { useState, useRef, useEffect } from "react";

interface ViewerProps {
  id: string | number;
  externalSrc?: string | null;
  regionSize?: number;
  regionInner?: boolean;
  regionOffset?: { x: number; y: number };
  setRegionOffset?: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isOutput?: boolean;
  refreshTrigger?: number;
  forceShowFrequency?: boolean;
}

export default function ImageViewer({
  id,
  externalSrc,
  regionSize = 100,
  regionInner = true,
  regionOffset = { x: 0, y: 0 },
  setRegionOffset,
  isOutput = false,
  refreshTrigger = 0,
  forceShowFrequency = false,
}: ViewerProps) {
  const [component, setComponent] = useState("magnitude");
  const [internalImageSrc, setInternalImageSrc] = useState<string | null>(null);



  const imageSrc = externalSrc !== undefined ? externalSrc : internalImageSrc;

  const [freqImgSrc, setFreqImgSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Brightness / Contrast only for spatial image
  const [spatialBC, setSpatialBC] = useState({ b: 100, c: 100 });

  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startB: number;
    startC: number;
    target: "spatial" | null;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startB: 100,
    startC: 100,
    target: null,
  });

  const panRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const handlePointerDown = (e: React.PointerEvent, target: "spatial") => {
    if (e.button !== 0) return;

    const bc = spatialBC;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startB: bc.b,
      startC: bc.c,
      target,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || !dragRef.current.target) return;

    const { startX, startY, startB, startC } = dragRef.current;

    const newC = Math.max(0, startC + (e.clientX - startX) * 0.5);
    const newB = Math.max(0, startB + (startY - e.clientY) * 0.5);

    setSpatialBC({ b: newB, c: newC });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.target = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleRegionPanStart = (e: React.PointerEvent) => {
    if (e.button !== 0 || !setRegionOffset) return;

    panRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: regionOffset.x,
      startOffsetY: regionOffset.y,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleRegionPanMove = (e: React.PointerEvent) => {
    if (!panRef.current.dragging || !setRegionOffset) return;

    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;

    setRegionOffset({
      x: panRef.current.startOffsetX + dx,
      y: panRef.current.startOffsetY + dy,
    });
  };

  const handleRegionPanEnd = (e: React.PointerEvent) => {
    if (!panRef.current.dragging) return;

    panRef.current.dragging = false;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const [readyStamp, setReadyStamp] = useState(0);

  const fetchCurrentState = async () => {
    if (!readyStamp && !isOutput) return;

    try {
      // 1. Fetch current resized spatial (for inputs and emphasizer original)
      if (!isOutput) {
        const resSpatial = await fetch(`http://127.0.0.1:8000/api/mixer/spatial/${id}`);
        if (resSpatial.ok) {
          const data = await resSpatial.json();
          setInternalImageSrc(`data:image/png;base64,${data.image_b64}`);
        }
      }

      // 2. Fetch current frequency component (only for inputs OR if forced)
      if (!isOutput || forceShowFrequency) {
        const resComp = await fetch(`http://127.0.0.1:8000/api/mixer/component/${id}/${component}`);
        if (resComp.ok) {
          const data = await resComp.json();
          setFreqImgSrc(`data:image/png;base64,${data.image_b64}`);
        }
      }
    } catch (err) {
      console.warn(`Fetch for viewport ${id} failed - likely not uploaded yet or backend down.`);
    }
  };

  useEffect(() => {
    if (externalSrc) {
      setReadyStamp(Date.now());
    }
  }, [externalSrc]);

  useEffect(() => {
    fetchCurrentState();
  }, [id, component, refreshTrigger, readyStamp]);


  const handleDoubleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setInternalImageSrc(objectUrl);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`http://127.0.0.1:8000/api/mixer/upload/${id}`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          console.log("Uploaded successfully to port", id);
          setReadyStamp(Date.now());
        }
      } catch (err) {
        console.error("Backend not running or failed", err);
      }
    }
  };

  return (
    <div className="bg-[#1a1410] rounded-lg border border-[#3a2e24] flex flex-col overflow-hidden shadow-xl h-full group hover:border-[#5a4a3a] transition-all">
      <div className="bg-[#231c16] p-2 border-b border-[#3a2e24] font-semibold text-xs text-[#c8b8a0] flex justify-between items-center z-10 relative">
        <span className="tracking-widest uppercase ml-1">{String(id).startsWith('output') ? id : `image ${id}`}</span>
        {(!isOutput || forceShowFrequency) && (
          <select
            className="bg-[#120e09] text-[#f5ede6] px-2 py-1 rounded text-xs border border-[#4a3c30] outline-none hover:border-[#6a5840] focus:border-[#8a7a60] transition-colors"
            value={component}
            onChange={(e) => setComponent(e.target.value)}
          >
            <option value="magnitude">FT Magnitude</option>
            <option value="phase">FT Phase</option>
            <option value="real">FT Real</option>
            <option value="imaginary">FT Imaginary</option>
          </select>
        )}
      </div>

      <div className={`flex-1 flex overflow-hidden relative group/container ${!isOutput ? 'cursor-pointer' : ''}`}>
        {!isOutput && (
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        )}

        {/* Spatial Display */}
        <div
          className={`flex-1 flex items-center justify-center ${(!isOutput || forceShowFrequency) ? 'border-r border-[#3a2e24] border-dashed' : ''} relative hover:bg-[#f5ede6]/5 transition-colors overflow-hidden select-none`}
          onDoubleClick={!isOutput ? handleDoubleClick : undefined}
          onPointerDown={(e) => handlePointerDown(e, "spatial")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={`Spatial ${id}`}
              className="object-contain w-full h-full p-1 pointer-events-none"
              style={{
                filter: `brightness(${spatialBC.b}%) contrast(${spatialBC.c}%)`,
              }}
            />
          ) : (
            <span className="text-[#6a5a4a] text-xs text-center px-4 leading-relaxed group-hover/container:text-[#8a7a6a] transition-colors pointer-events-none">
              {isOutput ? (
                <>No output</>
              ) : (
                <>Double click <br /> to upload</>
              )}
            </span>
          )}
        </div>

        {/* Frequency Display */}
        {(!isOutput || forceShowFrequency) && (
          <div
            className="flex-1 flex items-center justify-center relative hover:bg-[#f5ede6]/5 transition-colors overflow-hidden bg-[#120e09] select-none"
            onPointerDown={handleRegionPanStart}
            onPointerMove={handleRegionPanMove}
            onPointerUp={handleRegionPanEnd}
            onPointerCancel={handleRegionPanEnd}
          >
            {freqImgSrc ? (
              <>
                <img
                  src={freqImgSrc}
                  alt={`Freq ${id}`}
                  className="object-contain w-full h-full p-1 pointer-events-none z-0"
                />

                {regionSize < 100 && (
                  <div
                    className={`absolute pointer-events-none z-10 ${
                      regionInner
                        ? "bg-[#c8956c]/20 shadow-[inset_0_0_0_2px_rgba(200,149,108,0.8)]"
                        : "outline outline-[9999px] outline-black/70 shadow-[inset_0_0_0_2px_rgba(139,69,19,0.8)]"
                    }`}
                    style={{
                      width: `${regionSize}%`,
                      height: `${regionSize}%`,
                      top: `calc(${(100 - regionSize) / 2}% + ${regionOffset.y}px)`,
                      left: `calc(${(100 - regionSize) / 2}% + ${regionOffset.x}px)`,
                    }}
                  />
                )}
              </>
            ) : (
              <span className="text-[#5a4a3a] text-xs text-center px-4 font-mono pointer-events-none">
                {component} <br />
                render
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}