import { useState, useEffect, useRef } from "react";
import { Search, Plus, Maximize2, Map, SplitSquareVertical, Zap } from "lucide-react";
import { useNotes } from "./NotesContext";

export default function SearchCommandPalette() {
  const { pages, setSearchOpen, selectPage, createPage, setFocusModeOpen, setSplitViewOpen, setContentMapOpen } = useNotes();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setSearchOpen]);

  const filtered = query.trim()
    ? pages.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.blocks.some(b => b.content.toLowerCase().includes(query.toLowerCase())))
    : pages.slice(0, 4);

  const quickActions = [
    { icon: <Plus className="w-4 h-4 text-blue-500" />, label: "New Page", action: () => { createPage(); setSearchOpen(false); } },
    { icon: <Zap className="w-4 h-4 text-yellow-500" />, label: "Quick Capture", action: () => setSearchOpen(false) },
    { icon: <Maximize2 className="w-4 h-4 text-purple-500" />, label: "Toggle Focus Mode", action: () => { setFocusModeOpen(true); setSearchOpen(false); } },
    { icon: <SplitSquareVertical className="w-4 h-4 text-green-500" />, label: "Open Split View", action: () => { setSplitViewOpen(true); setSearchOpen(false); } },
    { icon: <Map className="w-4 h-4 text-orange-500" />, label: "Open Content Map", action: () => { setContentMapOpen(true); setSearchOpen(false); } },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
      <div className="w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-5 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="h-12 w-full border-0 px-3 text-base text-gray-800 outline-none placeholder:text-gray-400 bg-transparent"
            placeholder="Search pages, blocks, or type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="text-gray-400 hover:text-gray-600 text-sm shrink-0" onClick={() => setQuery("")}>Clear</button>
          )}
        </div>

        {!query && (
          <div className="px-4 py-2 border-b border-gray-50">
            <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Actions</div>
            {quickActions.map((action, i) => (
              <div key={i} className="h-9 px-3 rounded-md hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 cursor-pointer" onClick={action.action}>
                {action.icon}
                {action.label}
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-2 max-h-72 overflow-y-auto">
          <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">
            {query ? "Results" : "Recent"}
          </div>
          {filtered.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-6">No pages found for "{query}"</div>
          )}
          {filtered.map(p => (
            <div
              key={p.id}
              className="h-9 px-3 rounded-md hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
              onClick={() => { selectPage(p.id); setSearchOpen(false); }}
            >
              <span className="text-base">{p.icon}</span>
              <span className="flex-1">{p.title || "Untitled"}</span>
              <span className="text-xs text-gray-400">{p.tags.join(", ")}</span>
            </div>
          ))}
        </div>

        {!query && (
          <div className="px-4 py-2 text-right text-xs text-gray-300 border-t border-gray-50">
            Ctrl+K to open · Esc to close
          </div>
        )}
      </div>
    </div>
  );
}
