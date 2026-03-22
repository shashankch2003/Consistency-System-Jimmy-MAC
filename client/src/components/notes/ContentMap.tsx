import { useEffect } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useNotes } from "./NotesContext";

interface NodePos { id: string; x: number; y: number; }

const CENTER = { x: 350, y: 220, w: 100, h: 36 };
const ORBIT_POSITIONS = [
  { dx: -200, dy: -130 }, { dx: 150, dy: -140 },
  { dx: 270, dy: 10 },   { dx: 170, dy: 150 },
  { dx: -150, dy: 150 }, { dx: -230, dy: 20 },
];

export default function ContentMap() {
  const { pages, setContentMapOpen, selectPage } = useNotes();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setContentMapOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setContentMapOpen]);

  const rootPages = pages.filter(p => p.parentId === null).slice(0, 6);

  const nodePositions: NodePos[] = [
    { id: "center", x: CENTER.x, y: CENTER.y },
    ...rootPages.map((p, i) => ({
      id: p.id,
      x: CENTER.x + (ORBIT_POSITIONS[i]?.dx ?? 0) - 45,
      y: CENTER.y + (ORBIT_POSITIONS[i]?.dy ?? 0) - 18,
    })),
  ];

  const getCenter = (id: string) => {
    const pos = nodePositions.find(n => n.id === id);
    if (!pos) return { x: 0, y: 0 };
    if (id === "center") return { x: CENTER.x + CENTER.w / 2, y: CENTER.y + CENTER.h / 2 };
    return { x: pos.x + 45, y: pos.y + 18 };
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="h-12 border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <span className="font-semibold text-gray-900">Content Map</span>
        <div className="flex items-center gap-3">
          <button className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600" onClick={() => setContentMapOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="relative" style={{ width: 800, height: 500, margin: "20px auto" }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {rootPages.map((p) => {
              const from = getCenter("center");
              const to = getCenter(p.id);
              return (
                <path key={p.id}
                  d={`M ${from.x} ${from.y} C ${from.x} ${(from.y + to.y) / 2}, ${to.x} ${(from.y + to.y) / 2}, ${to.x} ${to.y}`}
                  fill="none" stroke="#d1d5db" strokeWidth="2"
                />
              );
            })}
          </svg>

          <div
            className="absolute bg-blue-500 text-white rounded-xl px-4 py-2 shadow-lg font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-blue-600 transition-colors whitespace-nowrap z-10"
            style={{ left: CENTER.x, top: CENTER.y }}
          >
            <span>📒</span>
            My Notes
          </div>

          {rootPages.map((p, i) => {
            const pos = nodePositions.find(n => n.id === p.id);
            if (!pos) return null;
            return (
              <div
                key={p.id}
                className="absolute bg-white rounded-lg shadow-md px-3 py-2 text-sm border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow flex items-center gap-2 whitespace-nowrap z-10"
                style={{ left: pos.x, top: pos.y }}
                onClick={() => { selectPage(p.id); setContentMapOpen(false); }}
              >
                <span>{p.icon}</span>
                <span className="text-gray-700">{p.title || "Untitled"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
