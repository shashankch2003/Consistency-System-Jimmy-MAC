import { useEffect, useState, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useNotes } from "./NotesContext";

export default function ContentMap() {
  const { pages, setContentMapOpen, selectPage } = useNotes();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setContentMapOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setContentMapOpen]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  const rootPages = pages.filter(p => p.parentId === null).slice(0, 8);
  const childPages = pages.filter(p => p.parentId !== null).slice(0, 6);

  const cx = 400;
  const cy = 250;

  const ORBIT: { dx: number; dy: number }[] = [
    { dx: -220, dy: -140 }, { dx: 160, dy: -150 },
    { dx: 290, dy: 0 }, { dx: 170, dy: 155 },
    { dx: -160, dy: 160 }, { dx: -260, dy: 20 },
    { dx: -80, dy: -200 }, { dx: 60, dy: -190 },
  ];

  const nodePositions: { id: string; x: number; y: number; wc: number }[] = [
    { id: "__root__", x: cx - 50, y: cy - 18, wc: 100 },
    ...rootPages.map((p, i) => ({
      id: p.id,
      x: cx + (ORBIT[i]?.dx ?? 0) - 40,
      y: cy + (ORBIT[i]?.dy ?? 0) - 16,
      wc: (p.wordCount ?? p.blocks.reduce((a, b) => a + b.content.split(/\s+/).filter(Boolean).length, 0)),
    })),
  ];

  const childPositions: { id: string; x: number; y: number; parentId: string }[] = childPages.map((p, i) => {
    const parentPos = nodePositions.find(n => n.id === p.parentId);
    const angle = (i / Math.max(1, childPages.filter(c => c.parentId === p.parentId).length)) * Math.PI * 2;
    return {
      id: p.id,
      x: (parentPos?.x ?? cx) + Math.cos(angle) * 120 - 35,
      y: (parentPos?.y ?? cy) + Math.sin(angle) * 80 - 14,
      parentId: p.parentId!,
    };
  });

  const getCenter = (id: string) => {
    if (id === "__root__") return { x: cx, y: cy };
    const n = nodePositions.find(n => n.id === id);
    if (n) return { x: n.x + 40, y: n.y + 16 };
    const c = childPositions.find(c => c.id === id);
    if (c) return { x: c.x + 35, y: c.y + 14 };
    return { x: cx, y: cy };
  };

  const getNodeSize = (wc: number) => {
    if (wc > 200) return "px-5 py-2.5 text-sm font-medium";
    if (wc > 50) return "px-4 py-2 text-sm";
    return "px-3 py-1.5 text-xs";
  };

  const linkPageIds = new Set<string>();
  pages.forEach(p => {
    p.blocks.forEach(b => {
      if (b.type === "link_to_page" && b.properties.pageId) linkPageIds.add(b.properties.pageId);
    });
  });

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="h-12 border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <span className="font-semibold text-gray-900">Content Map</span>
        <div className="flex items-center gap-3">
          <button
            className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
            onClick={() => setScale(s => Math.min(2, s + 0.2))}
          ><ZoomIn className="w-4 h-4" /></button>
          <button
            className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
            onClick={() => setScale(s => Math.max(0.4, s - 0.2))}
          ><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs text-gray-400">{Math.round(scale * 100)}%</span>
          <button
            className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
            onClick={() => setContentMapOpen(false)}
          ><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "center center", width: "100%", height: "100%", position: "relative" }}>
          <div style={{ position: "relative", width: 900, height: 560, margin: "0 auto" }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {rootPages.map(p => {
                const from = getCenter("__root__");
                const to = getCenter(p.id);
                const linked = linkPageIds.has(p.id);
                return (
                  <path key={p.id}
                    d={`M ${from.x} ${from.y} C ${from.x} ${(from.y + to.y) / 2}, ${to.x} ${(from.y + to.y) / 2}, ${to.x} ${to.y}`}
                    fill="none" stroke={linked ? "#3b82f6" : "#d1d5db"} strokeWidth={linked ? "2" : "1.5"} strokeDasharray={linked ? "none" : "4 2"}
                  />
                );
              })}
              {childPositions.map(c => {
                const from = getCenter(c.parentId);
                const to = getCenter(c.id);
                return (
                  <line key={c.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#e5e7eb" strokeWidth="1.5" />
                );
              })}
            </svg>

            <div
              data-node="root"
              className="absolute bg-blue-500 text-white rounded-xl px-5 py-2.5 shadow-lg font-semibold text-sm flex items-center gap-2 cursor-pointer hover:bg-blue-600 transition-colors z-10"
              style={{ left: cx - 50, top: cy - 18 }}
            >
              <span>📒</span>
              My Notes
              <span className="text-blue-200 text-xs ml-1">{pages.length} pages</span>
            </div>

            {nodePositions.filter(n => n.id !== "__root__").map(n => {
              const page = pages.find(p => p.id === n.id);
              if (!page) return null;
              const sizeClass = getNodeSize(n.wc);
              return (
                <div
                  key={n.id}
                  data-node={n.id}
                  className={`absolute bg-white rounded-lg shadow-md border border-gray-200 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all flex items-center gap-2 whitespace-nowrap z-10 ${sizeClass}`}
                  style={{ left: n.x, top: n.y }}
                  onClick={() => { selectPage(n.id); setContentMapOpen(false); }}
                >
                  <span>{page.icon}</span>
                  <span className="text-gray-700">{page.title || "Untitled"}</span>
                  {n.wc > 0 && <span className="text-gray-300 text-xs ml-1">{n.wc}w</span>}
                </div>
              );
            })}

            {childPositions.map(c => {
              const page = pages.find(p => p.id === c.id);
              if (!page) return null;
              return (
                <div
                  key={c.id}
                  data-node={c.id}
                  className="absolute bg-gray-50 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:bg-white transition-all flex items-center gap-1.5 whitespace-nowrap z-10 px-2.5 py-1 text-xs"
                  style={{ left: c.x, top: c.y }}
                  onClick={() => { selectPage(c.id); setContentMapOpen(false); }}
                >
                  <span>{page.icon}</span>
                  <span className="text-gray-600">{page.title || "Untitled"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-8 border-t border-gray-100 flex items-center px-6 gap-6 shrink-0">
        <span className="flex items-center gap-2 text-xs text-gray-400"><span className="w-4 h-0.5 bg-blue-400 inline-block rounded"></span>Linked pages</span>
        <span className="flex items-center gap-2 text-xs text-gray-400"><span className="w-4 border-t border-dashed border-gray-400 inline-block"></span>Tree structure</span>
        <span className="text-xs text-gray-400">Drag to pan · +/- to zoom · Click node to open</span>
      </div>
    </div>
  );
}
