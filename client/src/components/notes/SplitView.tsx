import { useState, useRef, useCallback } from "react";
import { X, ChevronDown } from "lucide-react";
import { useNotes, Page } from "./NotesContext";
import BlockEditor from "./BlockEditor";

function MiniPageView({ page }: { page: Page }) {
  const fontClass = page.font === "serif" ? "font-serif" : page.font === "mono" ? "font-mono" : "font-sans";
  const textSizeClass = page.smallText ? "text-sm" : "text-base";
  return (
    <div className={`px-8 py-6 ${fontClass} ${textSizeClass}`}>
      {page.cover && (
        <div className={`h-[100px] w-full bg-gradient-to-r ${page.cover} rounded-b-lg relative mb-2`}>
          <div className="absolute bottom-2 right-2 text-white/60 text-xs">Split view</div>
        </div>
      )}
      <div className="text-4xl -mt-5 ml-1 relative z-10 mb-2">{page.icon}</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{page.title || "Untitled"}</h1>
      <div className="text-xs text-gray-400 mb-4">Read-only preview</div>
      <div className="space-y-2 opacity-70 pointer-events-none">
        {page.blocks.slice(0, 12).map(b => {
          if (b.type === "heading1") return <p key={b.id} className="text-xl font-bold text-gray-900">{b.content}</p>;
          if (b.type === "heading2") return <p key={b.id} className="text-lg font-semibold text-gray-800">{b.content}</p>;
          if (b.type === "heading3") return <p key={b.id} className="text-base font-medium text-gray-800">{b.content}</p>;
          if (b.type === "bullet_list") return <div key={b.id} className="flex gap-2 text-sm text-gray-700"><span className="text-gray-400 mt-0.5">•</span><span>{b.content}</span></div>;
          if (b.type === "todo") return <div key={b.id} className="flex gap-2 text-sm text-gray-700"><span className={b.properties.checked ? "line-through text-gray-400" : ""}>{b.content}</span></div>;
          if (b.type === "divider") return <hr key={b.id} className="border-gray-200 my-2" />;
          if (b.type === "quote") return <blockquote key={b.id} className="border-l-4 border-gray-300 pl-3 italic text-gray-500 text-sm">{b.content}</blockquote>;
          if (b.type === "callout") return <div key={b.id} className="bg-blue-50 border-l-4 border-blue-400 p-2 rounded text-sm text-gray-700">{b.properties.icon} {b.content}</div>;
          if (b.type === "code") return <pre key={b.id} className="bg-gray-900 rounded p-2 text-xs text-green-400 font-mono overflow-x-auto">{b.content}</pre>;
          if (b.content) return <p key={b.id} className="text-sm text-gray-700 leading-relaxed">{b.content}</p>;
          return null;
        })}
      </div>
    </div>
  );
}

interface PagePickerProps {
  pages: Page[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function PagePicker({ pages, selectedId, onSelect }: PagePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = pages.find(p => p.id === selectedId);

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-md px-2 py-1 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {selected ? <><span>{selected.icon}</span><span className="max-w-[120px] truncate">{selected.title || "Untitled"}</span></> : <span>Pick a page...</span>}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-50 bg-white rounded-xl shadow-xl border w-[220px] max-h-[300px] overflow-y-auto py-1">
          {pages.map(p => (
            <button
              key={p.id}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm ${p.id === selectedId ? "text-blue-600 bg-blue-50" : "text-gray-700"}`}
              onClick={() => { onSelect(p.id); setOpen(false); }}
            >
              <span>{p.icon}</span>
              <span className="truncate">{p.title || "Untitled"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SplitView() {
  const { pages, selectedPage, selectedPageId, selectPage, setSplitViewOpen } = useNotes();
  const [rightPageId, setRightPageId] = useState<string | null>(pages.find(p => p.id !== selectedPageId)?.id ?? null);
  const [splitPercent, setSplitPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const rightPage = pages.find(p => p.id === rightPageId) ?? null;

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.min(70, Math.max(30, ((ev.clientX - rect.left) / rect.width) * 100));
      setSplitPercent(pct);
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div className="flex flex-col overflow-hidden" style={{ width: `${splitPercent}%` }}>
        <div className="h-9 bg-gray-50 border-b border-gray-200 flex items-center px-3 gap-2 shrink-0">
          <span className="text-xs font-medium text-gray-700 flex-1 truncate">
            {selectedPage ? `${selectedPage.icon} ${selectedPage.title || "Untitled"}` : "No page selected"}
          </span>
          <PagePicker pages={pages} selectedId={selectedPageId} onSelect={(id) => selectPage(id)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedPage ? <MiniPageView page={selectedPage} /> : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Select a page</div>}
        </div>
      </div>

      <div
        className="w-1.5 bg-gray-200 hover:bg-blue-400 cursor-col-resize relative flex items-center justify-center shrink-0 transition-colors"
        onMouseDown={onDividerMouseDown}
      >
        <div className="flex flex-col gap-0.5 items-center justify-center h-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-0.5 h-0.5 rounded-full bg-gray-400" />
          ))}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden flex-1">
        <div className="h-9 bg-gray-50 border-b border-gray-200 flex items-center px-3 gap-2 shrink-0">
          <span className="text-xs font-medium text-gray-700 flex-1 truncate">
            {rightPage ? `${rightPage.icon} ${rightPage.title || "Untitled"}` : "Pick a page"}
          </span>
          <PagePicker pages={pages.filter(p => p.id !== selectedPageId)} selectedId={rightPageId} onSelect={setRightPageId} />
          <button className="text-gray-400 hover:text-gray-600 ml-1" onClick={() => setSplitViewOpen(false)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rightPage ? <MiniPageView page={rightPage} /> : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-gray-400 text-sm">Select a page to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
