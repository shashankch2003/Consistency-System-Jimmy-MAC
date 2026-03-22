import { useEffect } from "react";
import { X } from "lucide-react";
import { useNotes } from "./NotesContext";

export default function FocusMode() {
  const { selectedPage, setFocusModeOpen } = useNotes();

  const wordCount = selectedPage?.blocks.reduce((acc, b) => acc + b.content.split(/\s+/).filter(Boolean).length, 0) ?? 0;
  const wordGoal = 500;
  const progress = Math.min(wordCount / wordGoal, 1);
  const radius = 20;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (1 - progress);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusModeOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setFocusModeOpen]);

  if (!selectedPage) return null;

  const paragraphs = selectedPage.blocks.filter(b => ["text", "heading1", "heading2", "heading3"].includes(b.type));

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      <div className="flex justify-between items-center px-8 py-4">
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm">Focus Mode</span>
          <span className="text-white/40 text-sm">Goal: {wordGoal} words</span>
        </div>

        <div className="flex items-center justify-center">
          <svg className="w-12 h-12" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 50 50">
            <circle cx="25" cy="25" r={radius} fill="none" stroke="#374151" strokeWidth="3" />
            <circle cx="25" cy="25" r={radius} fill="none" stroke="#60a5fa" strokeWidth="3" strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round" />
            <text x="25" y="25" textAnchor="middle" dominantBaseline="central" style={{ transform: "rotate(90deg)", transformOrigin: "25px 25px", fill: "white", fontSize: "10px", fontWeight: 500 }}>
              {wordCount}
            </text>
          </svg>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <button className="text-white/40 hover:text-white/70 text-lg" title="Rain sounds">🌧️</button>
            <button className="text-white/40 hover:text-white/70 text-lg" title="Forest sounds">🌲</button>
            <button className="text-white/60 hover:text-white/70 text-lg" title="Silence">🔇</button>
          </div>
          <span className="text-white/60 text-sm font-mono">25:00</span>
          <button className="text-white/40 hover:text-white/70" onClick={() => setFocusModeOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-[700px] mx-auto flex-1 py-12 px-4 w-full overflow-y-auto">
        <div className="text-3xl font-bold text-white outline-none mb-6">
          {selectedPage.title || "Untitled"}
        </div>

        <div className="space-y-4">
          {paragraphs.length > 0 ? paragraphs.map((block, i) => (
            <p key={block.id} className={`leading-relaxed ${block.type.startsWith("heading") ? "text-xl font-semibold text-white" : `text-lg ${i === 0 ? "text-white" : "text-white/40"}`}`}>
              {block.content || <span className="opacity-40 italic">Empty block...</span>}
            </p>
          )) : (
            <p className="text-lg text-white/40 italic">Start writing to see your content here...</p>
          )}
        </div>
      </div>

      <div className="text-center py-4">
        <div className="text-white/30 text-sm mb-1">{wordCount} / {wordGoal} words</div>
        <div className="text-white/20 text-xs">Press Esc to exit</div>
      </div>
    </div>
  );
}
