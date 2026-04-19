"use client"
import { useState, useEffect, useCallback } from "react";
import ImageViewer from "@/components/ImageViewer";
import MixerControls from "@/components/MixerControls";
import Emphasizer from "@/components/Emphasizer";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"mixer" | "emphasizer">("mixer");
  const [output1Image, setOutput1Image] = useState<string | null>(null);
  const [output2Image, setOutput2Image] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Region bounds across all viewports
  const [regionSize, setRegionSize] = useState(100);
  const [regionInner, setRegionInner] = useState(true);
  const [regionOffset, setRegionOffset] = useState({ x: 0, y: 0 });
  const [targetPort, setTargetPort] = useState("1");

  const handleResizeApply = useCallback((data: any) => {
    setRefreshTrigger(prev => prev + 1);
    if (data.output1_b64) setOutput1Image(`data:image/png;base64,${data.output1_b64}`);
    if (data.output2_b64) setOutput2Image(`data:image/png;base64,${data.output2_b64}`);
  }, []);

  // Force a backend cache clear when the app first loads or user refreshes
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/mixer/clear", { method: "POST" })
      .catch(() => {}); // silently ignore if backend isn't awake yet
  }, []);

  return (
    <div className="flex flex-col flex-1 h-full font-sans bg-[#0d0a07] relative overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex bg-[#1a1410] border-b border-[#3a2e24] shrink-0 px-4 pt-2 gap-1 items-end">
        <button 
          className={`px-5 py-2 font-semibold text-[11px] tracking-wider uppercase transition-all duration-300 rounded-t-lg ${activeTab === 'mixer' ? 'text-[#f5ede6] bg-[#231c16] border-t border-l border-r border-[#4a3c30]' : 'text-[#6a5a4a] hover:text-[#a89880] hover:bg-[#1a1410]'}`}
          onClick={() => setActiveTab('mixer')}
        >
          FT Mixer
        </button>
        <button 
          className={`px-5 py-2 font-semibold text-[11px] tracking-wider uppercase transition-all duration-300 rounded-t-lg ${activeTab === 'emphasizer' ? 'text-[#f5ede6] bg-[#231c16] border-t border-l border-r border-[#4a3c30]' : 'text-[#6a5a4a] hover:text-[#a89880] hover:bg-[#1a1410]'}`}
          onClick={() => setActiveTab('emphasizer')}
        >
          Properties Emphasizer
        </button>

        {/* Toggle Mixer Config button */}
        {activeTab === "mixer" && (
          <button
            className={`ml-auto px-4 py-2 font-semibold text-[11px] tracking-wider uppercase rounded-t-lg transition-all duration-300 border-t border-l border-r ${sidebarOpen ? 'text-[#0d0a07] bg-[#c8956c] border-[#c8956c]' : 'text-[#c8956c] bg-[#231c16] border-[#4a3c30] hover:bg-[#2e2418]'}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ⚙ Config
          </button>
        )}
      </div>

      {/* Main Content — fills viewport, NO scroll */}
      <div className="flex-1 flex overflow-hidden bg-[#0d0a07] p-3 gap-3">
        {activeTab === "mixer" && (
          <>
            {/* Left: 2x2 image grid */}
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 min-w-0">
              {[1, 2, 3, 4].map(id => (
                <ImageViewer 
                   key={id}
                   id={id} 
                   regionSize={regionSize} 
                   regionInner={regionInner}
                   regionOffset={regionOffset}
                   setRegionOffset={setRegionOffset}
                   refreshTrigger={refreshTrigger}
                />
              ))}
            </div>
            
            {/* Right: Output panels stacked — fills height */}
            <div className="w-[300px] shrink-0 flex flex-col gap-3">
              <div className="flex-1 min-h-0 bg-[#1a1410] rounded-lg border border-[#3a2e24] flex flex-col overflow-hidden shadow-lg">
                <ImageViewer 
                  id="output1"
                  externalSrc={output1Image}
                  isOutput
                  refreshTrigger={refreshTrigger}
                />
              </div>

              <div className="flex-1 min-h-0 bg-[#1a1410] rounded-lg border border-[#3a2e24] flex flex-col overflow-hidden shadow-lg">
                <ImageViewer 
                  id="output2"
                  externalSrc={output2Image}
                  isOutput
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "emphasizer" && (
          <Emphasizer refreshTrigger={refreshTrigger} />
        )}
      </div>

      {/* Collapsible Sidebar — slides from right */}
      {activeTab === "mixer" && (
        <>
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/50 z-20 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar panel */}
          <div
            className={`absolute top-0 left-0 h-full w-[360px] bg-[#1a1410] border-r border-[#3a2e24] shadow-2xl z-30 transition-transform duration-300 ease-in-out flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3a2e24] bg-[#231c16] shrink-0">
              <span className="text-xs font-bold tracking-widest uppercase text-[#c8956c]">Mixer Config</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-[#6a5a4a] hover:text-[#f5ede6] transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Sidebar content — scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              <MixerControls
                targetPort={targetPort}
                setTargetPort={setTargetPort}
                onResult={(src) => {
                  if (targetPort === "1") setOutput1Image(src);
                  else setOutput2Image(src);
                }}
                onResizeApply={handleResizeApply}
                regionSize={regionSize}
                setRegionSize={setRegionSize}
                regionInner={regionInner}
                setRegionInner={setRegionInner}
                regionOffset={regionOffset}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
