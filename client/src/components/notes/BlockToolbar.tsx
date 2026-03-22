import { Link, Highlighter, AtSign, MessageSquare, Sparkles } from "lucide-react";

function ToolBtn({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <button
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center text-white/80 hover:bg-white/20 text-sm transition-colors"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-white/20 mx-0.5" />;
}

export default function BlockToolbar() {
  return (
    <div className="absolute z-50 top-16 left-1/2 -translate-x-1/2">
      <div className="bg-gray-900 rounded-lg shadow-xl px-2 py-1 flex items-center gap-0.5">
        <ToolBtn title="Bold"><span className="font-bold text-sm">B</span></ToolBtn>
        <ToolBtn title="Italic"><span className="italic text-sm">I</span></ToolBtn>
        <ToolBtn title="Underline"><span className="underline text-sm">U</span></ToolBtn>
        <ToolBtn title="Strikethrough"><span className="line-through text-sm">S</span></ToolBtn>
        <ToolBtn title="Code">
          <span className="font-mono text-xs bg-white/10 px-1 rounded">&lt;&gt;</span>
        </ToolBtn>
        <ToolBtn title="Link"><Link className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Text color">
          <span className="relative">
            <span className="text-sm font-bold">A</span>
            <span className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-full bg-red-400" />
          </span>
        </ToolBtn>
        <ToolBtn title="Highlight"><Highlighter className="w-3.5 h-3.5" /></ToolBtn>

        <Sep />

        <ToolBtn title="Mention"><AtSign className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Comment on selection"><MessageSquare className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="AI improve"><Sparkles className="w-3.5 h-3.5" /></ToolBtn>

        <Sep />

        <button className="flex items-center gap-1 text-white/80 hover:bg-white/20 rounded px-2 h-7 text-xs transition-colors">
          Turn into
          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>
        <ToolBtn title="Copy">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </ToolBtn>
      </div>
    </div>
  );
}
