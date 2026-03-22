import { useState, useEffect, useRef } from "react";
import { Link, Highlighter, AtSign, MessageSquare, Sparkles, ChevronDown } from "lucide-react";

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onColorPicker: (mode: "text" | "bg") => void;
  onAiAction?: (action: string, selection: string) => void;
  onComment?: () => void;
}

const AI_OPTIONS = [
  { group: "Edit", items: [
    { label: "✨ Improve writing", action: "improve" },
    { label: "🔤 Fix grammar", action: "grammar" },
    { label: "⬇️ Make shorter", action: "shorter" },
    { label: "⬆️ Make longer", action: "longer" },
    { label: "📝 Summarize", action: "summarize" },
    { label: "▶️ Continue writing", action: "continue" },
  ]},
  { group: "Transform", items: [
    { label: "💼 Professional tone", action: "tone_professional" },
    { label: "😊 Casual tone", action: "tone_casual" },
    { label: "🤝 Friendly tone", action: "tone_friendly" },
  ]},
  { group: "Other", items: [
    { label: "🌐 Translate", action: "translate" },
    { label: "❓ Explain", action: "explain" },
    { label: "💡 Generate from prompt", action: "generate" },
  ]},
];

const TURN_INTO = [
  "Text","Heading 1","Heading 2","Heading 3",
  "Bullet List","Numbered List","To-Do","Quote","Code","Callout",
];

function ToolBtn({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
  return (
    <button title={title} className="w-7 h-7 rounded flex items-center justify-center text-white/80 hover:bg-white/20 text-sm transition-colors shrink-0" onMouseDown={e => { e.preventDefault(); onClick?.(); }}>
      {children}
    </button>
  );
}

function Sep() { return <div className="w-px h-4 bg-white/20 mx-0.5 shrink-0" />; }

function mockAI(action: string, text: string): string {
  if (!text.trim()) return text;
  switch (action) {
    case "improve": return text.replace(/\b(good|nice|great)\b/gi, w => ({ good: "excellent", nice: "outstanding", great: "remarkable" }[w.toLowerCase()] ?? w)) + " (improved)";
    case "grammar": return text.replace(/\si\s/g, " I ").replace(/\bdont\b/g, "don't").replace(/\bcant\b/g, "can't") + ".";
    case "shorter": { const words = text.split(" "); return words.slice(0, Math.max(5, Math.ceil(words.length * 0.6))).join(" ") + (words.length > 5 ? "..." : ""); }
    case "longer": return text + " This provides additional context and elaboration to help readers better understand the concept being discussed.";
    case "summarize": { const words = text.split(" "); return "Summary: " + words.slice(0, Math.min(15, words.length)).join(" ") + (words.length > 15 ? "..." : ""); }
    case "continue": return text + " Furthermore, this approach enables greater flexibility and scalability in the long term.";
    case "tone_professional": return text.replace(/\b(hey|hi|yeah|yep|nope|kinda|gonna|wanna)\b/gi, w => ({ hey: "greetings", hi: "hello", yeah: "yes", yep: "certainly", nope: "no", kinda: "somewhat", gonna: "going to", wanna: "want to" }[w.toLowerCase()] ?? w));
    case "tone_casual": return text.replace(/\b(however|therefore|furthermore|consequently)\b/gi, w => ({ however: "but", therefore: "so", furthermore: "also", consequently: "because of that" }[w.toLowerCase()] ?? w));
    case "tone_friendly": return "😊 " + text + " I hope this helps!";
    case "translate": return `[ES] ${text.split(" ").map(w => `${w}ó`).join(" ")}`;
    case "explain": return `This means: ${text}. In simpler terms, this refers to the concept of ${text.split(" ").slice(0, 3).join(" ")}.`;
    case "generate": { const prompt = window.prompt("Enter your prompt:"); return prompt ? `[Generated for: "${prompt}"] ${text}` : text; }
    default: return text;
  }
}

export default function BlockToolbar({ x, y, onClose, onColorPicker, onAiAction, onComment }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showAI, setShowAI] = useState(false);
  const [showTurnInto, setShowTurnInto] = useState(false);
  const aiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) onClose();
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [onClose]);

  useEffect(() => {
    if (!showAI) return;
    const handler = (e: MouseEvent) => {
      if (aiRef.current && !aiRef.current.contains(e.target as Node) && !ref.current?.contains(e.target as Node)) setShowAI(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAI]);

  const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value);

  const handleAI = (action: string) => {
    const sel = window.getSelection();
    const text = sel?.toString() ?? "";
    const result = mockAI(action, text);
    if (result !== text && text) {
      const range = sel?.getRangeAt(0);
      if (range) {
        range.deleteContents();
        range.insertNode(document.createTextNode(result));
      }
    }
    if (onAiAction) onAiAction(action, text);
    setShowAI(false);
    onClose();
  };

  const left = Math.max(8, Math.min(x - 200, window.innerWidth - 500));
  const top = Math.max(8, y - 48);

  return (
    <>
      <div ref={ref} className="fixed z-[150] bg-gray-900 rounded-lg shadow-xl px-2 py-1 flex items-center gap-0.5 select-none" style={{ left, top }} onMouseDown={e => e.preventDefault()}>
        <ToolBtn title="Bold (Ctrl+B)" onClick={() => exec("bold")}><span className="font-bold text-sm">B</span></ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" onClick={() => exec("italic")}><span className="italic text-sm">I</span></ToolBtn>
        <ToolBtn title="Underline (Ctrl+U)" onClick={() => exec("underline")}><span className="underline text-sm">U</span></ToolBtn>
        <ToolBtn title="Strikethrough" onClick={() => exec("strikeThrough")}><span className="line-through text-sm">S</span></ToolBtn>
        <ToolBtn title="Inline code" onClick={() => exec("insertHTML", `<code style="background:#374151;padding:1px 4px;border-radius:3px;font-family:monospace">${window.getSelection()?.toString()}</code>`)}>
          <span className="font-mono text-xs bg-white/10 px-0.5 rounded">&lt;&gt;</span>
        </ToolBtn>
        <ToolBtn title="Link" onClick={() => { const url = prompt("URL:"); if (url) exec("createLink", url); }}>
          <Link className="w-3.5 h-3.5" />
        </ToolBtn>

        <Sep />

        <ToolBtn title="Text color" onClick={() => onColorPicker("text")}>
          <span className="relative"><span className="text-sm font-bold leading-none">A</span><span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-red-400" /></span>
        </ToolBtn>
        <ToolBtn title="Highlight" onClick={() => onColorPicker("bg")}><Highlighter className="w-3.5 h-3.5" /></ToolBtn>

        <Sep />

        <ToolBtn title="Mention" onClick={() => exec("insertText", "@")}><AtSign className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Comment" onClick={() => { onComment?.(); onClose(); }}><MessageSquare className="w-3.5 h-3.5" /></ToolBtn>

        <button
          title="AI Assist"
          className="relative flex items-center gap-0.5 w-8 h-7 rounded flex-shrink-0 items-center justify-center text-yellow-300 hover:bg-white/20 transition-colors"
          onMouseDown={e => { e.preventDefault(); setShowAI(v => !v); setShowTurnInto(false); }}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        <Sep />

        <button
          className="flex items-center gap-1 text-white/80 hover:bg-white/20 rounded px-2 h-7 text-xs transition-colors shrink-0"
          onMouseDown={e => { e.preventDefault(); setShowTurnInto(v => !v); setShowAI(false); }}
        >
          Turn into <ChevronDown className="w-3 h-3" />
        </button>

        <ToolBtn title="Copy" onClick={() => { const sel = window.getSelection()?.toString(); if (sel) navigator.clipboard.writeText(sel); }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        </ToolBtn>

        {showTurnInto && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[200] min-w-[160px]">
            {TURN_INTO.map(opt => (
              <button key={opt} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" onMouseDown={e => { e.preventDefault(); exec("formatBlock", opt.toLowerCase().replace(" ", "")); setShowTurnInto(false); onClose(); }}>{opt}</button>
            ))}
          </div>
        )}
      </div>

      {showAI && (
        <div ref={aiRef} className="fixed z-[160] bg-white rounded-xl shadow-2xl border border-gray-200 py-2 w-56" style={{ left: Math.max(8, Math.min(x - 100, window.innerWidth - 240)), top: top + 44 }}>
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-yellow-500" /> AI Assistance</span>
          </div>
          {AI_OPTIONS.map(group => (
            <div key={group.group}>
              <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider px-3 py-1">{group.group}</div>
              {group.items.map(item => (
                <button key={item.action} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors" onMouseDown={e => { e.preventDefault(); handleAI(item.action); }}>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
