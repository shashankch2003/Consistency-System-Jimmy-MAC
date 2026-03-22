import { useEffect, useRef } from "react";
import { Link, Highlighter, AtSign, MessageSquare, Sparkles } from "lucide-react";

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onColorPicker: (mode: "text" | "bg") => void;
}

function ToolBtn({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
  return (
    <button
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center text-white/80 hover:bg-white/20 text-sm transition-colors shrink-0"
      onMouseDown={e => { e.preventDefault(); onClick?.(); }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-white/20 mx-0.5 shrink-0" />;
}

const TURN_INTO = [
  "Text","Heading 1","Heading 2","Heading 3",
  "Bullet List","Numbered List","To-Do","Quote","Code","Callout",
];

export default function BlockToolbar({ x, y, onClose, onColorPicker }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) onClose();
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [onClose]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  };

  const left = Math.max(8, Math.min(x - 180, window.innerWidth - 400));
  const top = Math.max(8, y - 48);

  return (
    <div
      ref={ref}
      className="fixed z-[150] bg-gray-900 rounded-lg shadow-xl px-2 py-1 flex items-center gap-0.5 select-none"
      style={{ left, top }}
      onMouseDown={e => e.preventDefault()}
    >
      <ToolBtn title="Bold (Ctrl+B)" onClick={() => exec("bold")}>
        <span className="font-bold text-sm">B</span>
      </ToolBtn>
      <ToolBtn title="Italic (Ctrl+I)" onClick={() => exec("italic")}>
        <span className="italic text-sm">I</span>
      </ToolBtn>
      <ToolBtn title="Underline (Ctrl+U)" onClick={() => exec("underline")}>
        <span className="underline text-sm">U</span>
      </ToolBtn>
      <ToolBtn title="Strikethrough" onClick={() => exec("strikeThrough")}>
        <span className="line-through text-sm">S</span>
      </ToolBtn>
      <ToolBtn title="Inline code" onClick={() => exec("insertHTML", `<code style="background:#374151;padding:1px 4px;border-radius:3px;font-family:monospace">${window.getSelection()?.toString()}</code>`)}>
        <span className="font-mono text-xs bg-white/10 px-0.5 rounded">&lt;&gt;</span>
      </ToolBtn>
      <ToolBtn title="Link (Ctrl+K)" onClick={() => { const url = prompt("URL:"); if (url) exec("createLink", url); }}>
        <Link className="w-3.5 h-3.5" />
      </ToolBtn>

      <Sep />

      <ToolBtn title="Text color" onClick={() => onColorPicker("text")}>
        <span className="relative">
          <span className="text-sm font-bold leading-none">A</span>
          <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-red-400" />
        </span>
      </ToolBtn>
      <ToolBtn title="Highlight" onClick={() => onColorPicker("bg")}>
        <Highlighter className="w-3.5 h-3.5" />
      </ToolBtn>

      <Sep />

      <ToolBtn title="Mention" onClick={() => exec("insertText", "@")}>
        <AtSign className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn title="Comment">
        <MessageSquare className="w-3.5 h-3.5" />
      </ToolBtn>
      <ToolBtn title="AI improve">
        <Sparkles className="w-3.5 h-3.5" />
      </ToolBtn>

      <Sep />

      <div className="relative">
        <button
          className="flex items-center gap-1 text-white/80 hover:bg-white/20 rounded px-2 h-7 text-xs transition-colors"
          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
        >
          Turn into
          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>
      </div>

      <ToolBtn title="Copy" onClick={() => { const sel = window.getSelection()?.toString(); if (sel) navigator.clipboard.writeText(sel); }}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      </ToolBtn>
    </div>
  );
}
