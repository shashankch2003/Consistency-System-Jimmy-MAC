import { useState, useEffect, useRef } from "react";
import { Search, Plus, Maximize2, Map, SplitSquareVertical, Zap, Clock, FileText } from "lucide-react";
import { useNotes, Page } from "./NotesContext";

function getSnippet(page: Page, query: string) {
  if (!query.trim()) return "";
  const q = query.toLowerCase();
  const match = page.blocks.find(b => b.content.toLowerCase().includes(q));
  if (!match) return "";
  const idx = match.content.toLowerCase().indexOf(q);
  const start = Math.max(0, idx - 30);
  const end = Math.min(match.content.length, idx + q.length + 60);
  return (start > 0 ? "..." : "") + match.content.slice(start, end) + (end < match.content.length ? "..." : "");
}

function getBreadcrumb(page: Page, pages: Page[]) {
  const chain: string[] = [];
  let cur: Page | undefined = page;
  while (cur?.parentId) {
    const par = pages.find(p => p.id === cur!.parentId);
    if (par) { chain.unshift(par.title || "Untitled"); cur = par; } else break;
  }
  return chain.join(" › ");
}

export default function SearchCommandPalette() {
  const {
    pages, setSearchOpen, selectPage, createPage,
    setFocusModeOpen, setSplitViewOpen, setContentMapOpen,
    recentPageIds, addInboxItem, templates, createFromTemplate,
  } = useNotes();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mode, setMode] = useState<"search" | "capture" | "template">("search");
  const [captureText, setCaptureText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setSearchOpen]);

  const filteredPages = query.trim()
    ? pages.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.blocks.some(b => b.content.toLowerCase().includes(query.toLowerCase()))
      )
    : pages.filter(p => recentPageIds.includes(p.id)).slice(0, 6);

  const quickActions = [
    { icon: <Plus className="w-4 h-4 text-blue-500" />, label: "New Page", kbd: "⌘N", action: () => { createPage(); setSearchOpen(false); } },
    { icon: <Zap className="w-4 h-4 text-yellow-500" />, label: "Quick Capture", kbd: "", action: () => setMode("capture") },
    { icon: <FileText className="w-4 h-4 text-purple-500" />, label: "New from Template", kbd: "", action: () => setMode("template") },
    { icon: <Maximize2 className="w-4 h-4 text-purple-500" />, label: "Toggle Focus Mode", kbd: "⌃⇧F", action: () => { setFocusModeOpen(true); setSearchOpen(false); } },
    { icon: <SplitSquareVertical className="w-4 h-4 text-green-500" />, label: "Open Split View", kbd: "⌘\\", action: () => { setSplitViewOpen(true); setSearchOpen(false); } },
    { icon: <Map className="w-4 h-4 text-orange-500" />, label: "Open Content Map", kbd: "", action: () => { setContentMapOpen(true); setSearchOpen(false); } },
  ];

  const allResults = [...filteredPages];

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === "capture") {
      if (e.key === "Enter" && captureText.trim()) { addInboxItem(captureText.trim()); setSearchOpen(false); }
      if (e.key === "Escape") setMode("search");
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allResults.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && allResults[selectedIdx]) { selectPage(allResults[selectedIdx].id); setSearchOpen(false); }
  };

  if (mode === "capture") {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
        <div className="w-[560px] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center px-5 border-b border-gray-100">
            <Zap className="w-5 h-5 text-yellow-500 shrink-0" />
            <input autoFocus type="text" className="h-12 w-full border-0 px-3 text-base text-gray-800 outline-none placeholder:text-gray-400 bg-transparent"
              placeholder="Capture a thought or idea..." value={captureText} onChange={e => setCaptureText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && captureText.trim()) { addInboxItem(captureText.trim()); setSearchOpen(false); } if (e.key === "Escape") setMode("search"); }} />
          </div>
          <div className="px-5 py-3 text-xs text-gray-400 flex items-center justify-between">
            <span>Saved to Inbox in the sidebar</span>
            <div className="flex gap-3">
              <span>Enter to save</span>
              <span>Esc to go back</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "template") {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
        <div className="w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center px-5 border-b border-gray-100">
            <FileText className="w-5 h-5 text-purple-500 shrink-0" />
            <span className="h-12 flex items-center px-3 text-base text-gray-700 font-medium">Choose a Template</span>
            <button className="ml-auto text-sm text-gray-400 hover:text-gray-600" onClick={() => setMode("search")}>← Back</button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
            {templates.map(t => (
              <button key={t.id} className="text-left p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                onClick={() => { createFromTemplate(t.id); setSearchOpen(false); }}>
                <div className="text-2xl mb-2">{t.icon}</div>
                <div className="text-sm font-medium text-gray-800 mb-1">{t.name}</div>
                <div className="text-xs text-gray-400 line-clamp-2">{t.description}</div>
                <div className="mt-2 text-xs text-gray-300">{t.category}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
      <div className="w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-5 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input ref={inputRef} type="text" className="h-12 w-full border-0 px-3 text-base text-gray-800 outline-none placeholder:text-gray-400 bg-transparent"
            placeholder="Search pages, blocks, or type a command..."
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown} />
          {query && <button className="text-gray-400 hover:text-gray-600 text-sm shrink-0" onClick={() => setQuery("")}>Clear</button>}
        </div>

        {!query && (
          <div className="px-4 py-2 border-b border-gray-50">
            <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Quick Actions</div>
            {quickActions.map((action, i) => (
              <div key={i} className="h-9 px-3 rounded-md hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 cursor-pointer" onClick={action.action}>
                {action.icon}
                <span className="flex-1">{action.label}</span>
                {action.kbd && <span className="text-xs text-gray-300 font-mono">{action.kbd}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-2 max-h-72 overflow-y-auto">
          <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">
            {query ? `Results (${allResults.length})` : "Recent"}
          </div>
          {allResults.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-6">
              {query ? `No pages found for "${query}"` : "No recent pages"}
            </div>
          )}
          {allResults.map((p, i) => {
            const snippet = getSnippet(p, query);
            const breadcrumb = getBreadcrumb(p, pages);
            return (
              <div key={p.id}
                className={`px-3 py-2 rounded-md cursor-pointer flex items-start gap-3 ${i === selectedIdx ? "bg-blue-50 border border-blue-100" : "hover:bg-gray-50"}`}
                onClick={() => { selectPage(p.id); setSearchOpen(false); }}
                onMouseEnter={() => setSelectedIdx(i)}>
                <span className="text-lg shrink-0 mt-0.5">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{p.title || "Untitled"}</span>
                    {!query && recentPageIds.includes(p.id) && <Clock className="w-3 h-3 text-gray-300 shrink-0" />}
                  </div>
                  {breadcrumb && <span className="text-xs text-gray-400">{breadcrumb}</span>}
                  {snippet && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{snippet}</p>}
                </div>
                <span className="text-xs text-gray-300 shrink-0 self-center">{p.tags.slice(0, 2).join(", ")}</span>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-300">
          <span>↑↓ navigate · Enter select · Esc close</span>
          <span>⌘K to open</span>
        </div>
      </div>
    </div>
  );
}
