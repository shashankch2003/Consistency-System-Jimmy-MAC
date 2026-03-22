import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { useNotes } from "./NotesContext";

const AMBIENT_SOUNDS = [
  { id: "rain", emoji: "🌧️", label: "Rain" },
  { id: "forest", emoji: "🌲", label: "Forest" },
  { id: "cafe", emoji: "☕", label: "Café" },
  { id: "silence", emoji: "🔇", label: "Silence" },
];

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusMode() {
  const { selectedPage, setFocusModeOpen } = useNotes();

  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(true);
  const [activeSound, setActiveSound] = useState<string>("silence");
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [customMins, setCustomMins] = useState("25");

  useEffect(() => {
    if (!timerRunning || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const resetTimer = useCallback((mins: number) => {
    const secs = mins * 60;
    setTimerDuration(secs);
    setTimeLeft(secs);
    setTimerRunning(true);
    setShowDurationPicker(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusModeOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setFocusModeOpen]);

  if (!selectedPage) return null;

  const wordCount = selectedPage.blocks.reduce((acc, b) => acc + b.content.split(/\s+/).filter(Boolean).length, 0);
  const wordGoal = 500;
  const progress = Math.min(wordCount / wordGoal, 1);
  const radius = 20;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (1 - progress);

  const timerProgress = 1 - timeLeft / timerDuration;
  const timerRadius = 22;
  const timerCirc = 2 * Math.PI * timerRadius;

  const paragraphs = selectedPage.blocks.filter(b => ["text", "heading1", "heading2", "heading3", "bullet_list", "numbered_list", "quote"].includes(b.type));

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      <div className="flex justify-between items-center px-8 py-4 shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-white/60 text-sm font-medium">Focus Mode</span>

          <div className="flex items-center gap-2">
            {AMBIENT_SOUNDS.map(s => (
              <button
                key={s.id}
                title={s.label}
                onClick={() => setActiveSound(activeSound === s.id ? "none" : s.id)}
                className={`text-lg transition-all ${activeSound === s.id ? "opacity-100 scale-110" : "opacity-30 hover:opacity-60"}`}
              >
                {s.emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center cursor-pointer" onClick={() => setShowDurationPicker(v => !v)}>
            <svg className="w-14 h-14" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 50 50">
              <circle cx="25" cy="25" r={timerRadius} fill="none" stroke="#374151" strokeWidth="3" />
              <circle cx="25" cy="25" r={timerRadius} fill="none" stroke={timeLeft === 0 ? "#ef4444" : "#60a5fa"} strokeWidth="3"
                strokeDasharray={timerCirc} strokeDashoffset={timerCirc * (1 - timerProgress)} strokeLinecap="round" />
            </svg>
            <span className="absolute text-white text-[10px] font-mono font-bold">{formatTime(timeLeft)}</span>
          </div>

          {showDurationPicker && (
            <div className="absolute top-16 right-36 bg-gray-800 rounded-xl p-3 flex flex-col gap-2 z-10 shadow-xl border border-white/10">
              {[15, 25, 45, 60].map(m => (
                <button key={m} className="text-white/70 hover:text-white text-sm px-4 py-1.5 hover:bg-white/10 rounded-lg" onClick={() => resetTimer(m)}>{m} min</button>
              ))}
              <div className="flex gap-2 items-center mt-1">
                <input
                  type="number" min="1" max="180" className="w-16 bg-white/10 text-white text-sm rounded px-2 py-1 outline-none" placeholder="min"
                  value={customMins} onChange={e => setCustomMins(e.target.value)}
                />
                <button className="text-blue-400 text-sm hover:text-blue-300" onClick={() => resetTimer(parseInt(customMins) || 25)}>Set</button>
              </div>
            </div>
          )}

          <button
            className="text-white/40 hover:text-white/70 text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setTimerRunning(r => !r)}
          >
            {timerRunning ? "⏸ Pause" : "▶ Resume"}
          </button>

          <div className="relative flex items-center justify-center">
            <svg className="w-12 h-12" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 50 50">
              <circle cx="25" cy="25" r={radius} fill="none" stroke="#374151" strokeWidth="3" />
              <circle cx="25" cy="25" r={radius} fill="none" stroke="#34d399" strokeWidth="3" strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round" />
            </svg>
            <span className="absolute text-white text-[9px] font-mono">{wordCount}w</span>
          </div>

          <button className="text-white/40 hover:text-white/70" onClick={() => setFocusModeOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto flex-1 py-12 px-4 w-full overflow-y-auto">
        <div className="text-3xl font-bold text-white outline-none mb-8">
          {selectedPage.icon} {selectedPage.title || "Untitled"}
        </div>

        <div className="space-y-4">
          {paragraphs.length > 0 ? paragraphs.map((block, i) => {
            const isCurrent = i === paragraphs.findIndex(b => b.content && b.content.length > 0);
            const isHeading = block.type.startsWith("heading");
            const isBullet = block.type === "bullet_list" || block.type === "numbered_list";
            return (
              <div key={block.id} className={`leading-relaxed transition-all duration-300 ${
                isHeading ? "text-2xl font-semibold text-white mt-6" :
                isBullet ? "flex items-start gap-3 text-lg" :
                block.type === "quote" ? "border-l-4 border-white/30 pl-4 italic text-white/50 text-lg" :
                `text-lg ${i === 0 ? "text-white" : "text-white/50"}`
              }`}>
                {isBullet && <span className="text-white/30 mt-1 shrink-0">•</span>}
                <span>{block.content || <span className="opacity-30 italic">Empty block...</span>}</span>
              </div>
            );
          }) : (
            <p className="text-lg text-white/30 italic">Start writing to see your content here...</p>
          )}
        </div>
      </div>

      <div className="text-center py-4 shrink-0">
        <div className="text-white/30 text-sm mb-1">{wordCount} / {wordGoal} words · {activeSound !== "silence" && activeSound !== "none" ? `🎵 ${AMBIENT_SOUNDS.find(s => s.id === activeSound)?.label}` : "Silent"}</div>
        <div className="text-white/20 text-xs">Press Esc to exit · Click timer to change duration</div>
      </div>
    </div>
  );
}
