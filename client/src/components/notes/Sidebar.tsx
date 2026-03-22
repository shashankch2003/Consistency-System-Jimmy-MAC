import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNotes, Page, TabType } from "./NotesContext";
import { ChevronRight, ChevronDown, ChevronLeft, Plus, Star, Clock, Inbox, BookOpen, Scissors, Bookmark, RefreshCw, Book } from "lucide-react";

const ALL_EMOJIS = ["📄","📝","📋","📌","⭐","🎯","💡","🔥","📊","🎨","💼","🏠","📱","🎬","🎵","📚","🌟","🚀","💰","🔑","🔬","📁","🗂️","🗓️","📎","✏️","🎓","🏆","💡","🌐","⚡","🔐","🎪","🎭","🎨","🖼️","🗺️","🏔️","🌿","🌊"];
const TAGS_LIST = ["Work","Personal","Ideas","Research","Team","Archive","Journal"];

function relativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

function relativeToOld(date?: Date) {
  if (!date) return "Never visited";
  const d = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  return `Last visited ${d} day${d !== 1 ? "s" : ""} ago`;
}

function PageRow({ page, depth }: { page: Page; depth: number }) {
  const { selectedPageId, selectPage, toggleFavorite, createPage, deletePage, duplicatePage, updatePage, pages } = useNotes();
  const [expanded, setExpanded] = useState(depth === 0 && page.id === "p2");
  const [hovered, setHovered] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(page.title);
  const children = pages.filter(p => p.parentId === page.id);
  const isSelected = selectedPageId === page.id;

  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); };
  const closeCtx = () => setCtxMenu(null);
  useEffect(() => { if (!ctxMenu) return; const h = () => closeCtx(); document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, [ctxMenu]);
  const startRename = () => { setRenameVal(page.title); setRenaming(true); closeCtx(); };
  const commitRename = () => { updatePage(page.id, { title: renameVal }); setRenaming(false); };

  return (
    <div>
      <div
        className={`h-8 rounded-md cursor-pointer flex items-center gap-1.5 text-sm group/row relative ${isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700"} ${page.id === "p8" ? "text-gray-400" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: "8px" }}
        onClick={() => selectPage(page.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={e => e.dataTransfer.setData("pageId", page.id)}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          const fromId = e.dataTransfer.getData("pageId");
          if (fromId && fromId !== page.id) updatePage(fromId, { parentId: page.parentId });
        }}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0" onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}>
          {children.length > 0 ? (expanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />) : <span className="w-3 h-3" />}
        </div>
        <span className="text-base leading-none shrink-0">{page.icon}</span>
        {renaming ? (
          <input autoFocus className="flex-1 text-sm bg-transparent border-b border-blue-400 outline-none" value={renameVal} onChange={e => setRenameVal(e.target.value)} onBlur={commitRename} onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }} onClick={e => e.stopPropagation()} />
        ) : (
          <span className="truncate flex-1">{page.title || "Untitled"}</span>
        )}
        {hovered && !renaming && (
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button className={`w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 ${page.isFavorite ? "text-yellow-500" : "text-gray-300"}`} onClick={() => toggleFavorite(page.id)}>
              <Star className="w-3 h-3" fill={page.isFavorite ? "currentColor" : "none"} />
            </button>
            <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400" onClick={() => createPage(page.id)}>
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {ctxMenu && (
        <div className="fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] text-sm" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
          {[
            { label: "Rename", action: startRename },
            { label: "Duplicate", action: () => { duplicatePage(page.id); closeCtx(); } },
            { label: "Add child page", action: () => { createPage(page.id); closeCtx(); } },
            { label: page.isFavorite ? "Remove from Favorites" : "Add to Favorites", action: () => { toggleFavorite(page.id); closeCtx(); } },
            { label: "Delete", action: () => { deletePage(page.id); closeCtx(); }, danger: true },
          ].map(item => (
            <button key={item.label} className={`w-full text-left px-4 py-1.5 hover:bg-gray-50 ${(item as any).danger ? "text-red-500" : "text-gray-700"}`} onClick={item.action}>{item.label}</button>
          ))}
        </div>
      )}

      {expanded && children.map(child => <PageRow key={child.id} page={child} depth={depth + 1} />)}
    </div>
  );
}

const TABS: { id: TabType; icon: typeof BookOpen; label: string }[] = [
  { id: "pages", icon: BookOpen, label: "Pages" },
  { id: "recent", icon: Clock, label: "Recent" },
  { id: "favorites", icon: Star, label: "Favorites" },
  { id: "tags", icon: BookOpen, label: "Tags" },
  { id: "snippets", icon: Scissors, label: "Snippets" },
  { id: "bookmarks", icon: Bookmark, label: "Bookmarks" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const {
    pages, activeTab, setActiveTab, inboxItems, addInboxItem,
    recentPageIds, createPage, selectPage, activeTag, setActiveTag,
    setSearchOpen, setFocusModeOpen, setSplitViewOpen, setContentMapOpen,
    snippets, deleteSnippet, bookmarkedBlocks, removeBookmark,
    journalStreak, recyclerDismissed, dismissFromRecycler, createJournalPage,
  } = useNotes();

  const firstName = (user as any)?.firstName || "";
  const lastName = (user as any)?.lastName || "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "My Notes";

  const [collapsed, setCollapsed] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureText, setCaptureText] = useState("");
  const [recyclerOpen, setRecyclerOpen] = useState(true);
  const captureRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (captureOpen) captureRef.current?.focus(); }, [captureOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") { e.preventDefault(); setSplitViewOpen(true); }
      if (e.ctrlKey && e.shiftKey && e.key === "F") { e.preventDefault(); setFocusModeOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen, setSplitViewOpen, setFocusModeOpen]);

  const rootPages = pages.filter(p => p.parentId === null);
  const favPages = pages.filter(p => p.isFavorite);
  const recentPages = recentPageIds.map(id => pages.find(p => p.id === id)).filter(Boolean) as Page[];
  const filteredRoot = activeTag ? pages.filter(p => p.tags.includes(activeTag) && p.parentId === null) : rootPages;

  const THIRTY_DAYS_AGO = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const recyclerPages = pages.filter(p => {
    if (recyclerDismissed.includes(p.id)) return false;
    const wc = p.wordCount ?? p.blocks.reduce((a, b) => a + b.content.split(/\s+/).filter(Boolean).length, 0);
    if (wc <= 50) return false;
    if (!p.lastVisitedAt) return true;
    return p.lastVisitedAt.getTime() < THIRTY_DAYS_AGO;
  }).slice(0, 3);

  if (collapsed) {
    return (
      <div className="w-10 h-full bg-gray-50 border-r border-gray-200 flex flex-col items-center py-3 gap-3">
        <button onClick={() => setCollapsed(false)} className="text-gray-400 hover:text-gray-700"><ChevronRight className="w-4 h-4" /></button>
        <button onClick={() => createPage()} className="text-gray-400 hover:text-gray-700"><Plus className="w-4 h-4" /></button>
        <button onClick={() => setFocusModeOpen(true)} title="Focus Mode" className="text-gray-400 hover:text-gray-700"><span className="text-xs">🎯</span></button>
      </div>
    );
  }

  return (
    <div className="w-[260px] h-full bg-gray-50 border-r border-gray-200 flex flex-col select-none shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="font-semibold text-sm text-gray-800 truncate">{displayName}</span>
        <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-gray-700"><ChevronLeft className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100">
        <button className="flex-1 h-7 text-xs text-gray-500 hover:bg-gray-100 rounded-md flex items-center gap-1.5 px-2 truncate" onClick={() => setSearchOpen(true)}>
          <span className="text-gray-400">🔍</span> Search
          <span className="ml-auto text-gray-300 text-[10px] shrink-0">⌘K</span>
        </button>
        <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 text-xs" title="Focus Mode (Ctrl+Shift+F)" onClick={() => setFocusModeOpen(true)}>🎯</button>
        <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 text-xs" title="Content Map" onClick={() => setContentMapOpen(true)}>🗺️</button>
        <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 text-xs" title="Split View (Ctrl+\)" onClick={() => setSplitViewOpen(true)}>⊟</button>
      </div>

      <div className="flex flex-wrap border-b border-gray-200 px-2 gap-0.5 pt-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-xs px-2 py-1 rounded-t-md transition-colors ${activeTab === tab.id ? "bg-white shadow-sm text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-100"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col min-h-0">

        {activeTab === "pages" && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              {filteredRoot.map(page => <PageRow key={page.id} page={page} depth={0} />)}
            </div>

            {recyclerPages.length > 0 && (
              <div className="border-t border-gray-200 mt-2 pt-2">
                <button className="w-full flex items-center gap-1.5 px-1 py-1 text-xs text-gray-400 hover:text-gray-600 font-semibold uppercase tracking-wider" onClick={() => setRecyclerOpen(v => !v)}>
                  <RefreshCw className="w-3 h-3" />
                  Rediscover
                  <span className="ml-1 bg-gray-200 text-gray-500 rounded-full text-[10px] px-1.5">{recyclerPages.length}</span>
                  <span className="ml-auto">{recyclerOpen ? "▾" : "▸"}</span>
                </button>
                {recyclerOpen && recyclerPages.map(p => (
                  <div key={p.id} className="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-md cursor-pointer group/recycler" onClick={() => selectPage(p.id)}>
                    <span className="text-base shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{p.title || "Untitled"}</p>
                      <p className="text-[10px] text-gray-400">{relativeToOld(p.lastVisitedAt)}</p>
                    </div>
                    <button className="opacity-0 group-hover/recycler:opacity-100 text-gray-300 hover:text-gray-500 text-xs shrink-0" onClick={e => { e.stopPropagation(); dismissFromRecycler(p.id); }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 mt-2 px-1 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Inbox className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Inbox</span>
                <button className="ml-auto text-gray-400 hover:text-gray-600" onClick={() => setCaptureOpen(true)}><Plus className="w-3 h-3" /></button>
              </div>
              {inboxItems.map((item, i) => (
                <div key={i} className="text-xs text-gray-600 truncate py-1 px-1 hover:bg-gray-100 rounded cursor-pointer">{item}</div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "recent" && (
          <div className="flex-1">
            {recentPages.length === 0 && <p className="text-xs text-gray-400 px-2 py-4">No recently opened pages</p>}
            {recentPages.map(p => (
              <div key={p.id} className="h-8 px-2 rounded-md hover:bg-gray-100 cursor-pointer flex items-center justify-between text-sm text-gray-700" onClick={() => selectPage(p.id)}>
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="truncate">{p.title || "Untitled"}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-1">{relativeTime(p.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "favorites" && (
          <div className="flex-1">
            {favPages.length === 0 && <p className="text-xs text-gray-400 px-2 py-4">Star pages to add them here</p>}
            {favPages.map(p => (
              <div key={p.id} className="h-8 px-2 rounded-md hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-sm text-gray-700" onClick={() => selectPage(p.id)}>
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                <span className="truncate">{p.title || "Untitled"}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "tags" && (
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 p-2">
              {TAGS_LIST.map(tag => (
                <button key={tag} onClick={() => { setActiveTag(activeTag === tag ? null : tag); setActiveTab("pages"); }}
                  className={`text-xs rounded-full px-2 py-1 transition-colors ${activeTag === tag ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "snippets" && (
          <div className="flex-1">
            <div className="px-1 py-2">
              <div className="text-xs text-gray-400 mb-3">Reusable block snippets. Save blocks from the block menu, then insert with /snippet.</div>
              {snippets.length === 0 && <p className="text-xs text-gray-400 italic text-center py-6">No snippets yet.<br/>Select a block → block menu → Save as snippet</p>}
              {snippets.map(s => (
                <div key={s.id} className="border border-gray-200 rounded-xl p-3 mb-2 hover:border-blue-200 bg-white group/snippet">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Scissors className="w-3 h-3 text-gray-400" /> {s.name}
                    </span>
                    <button className="text-gray-300 hover:text-red-400 opacity-0 group-hover/snippet:opacity-100 text-xs transition-all" onClick={() => deleteSnippet(s.id)}>✕</button>
                  </div>
                  <div className="space-y-1 mb-2">
                    {s.blocks.slice(0, 3).map((b, i) => (
                      <div key={i} className={`text-xs text-gray-500 truncate ${b.type === "heading1" ? "font-semibold text-gray-700" : b.type === "heading2" ? "font-medium text-gray-600" : ""}`}>
                        {b.type === "bullet_list" ? "• " : b.type === "todo" ? "☐ " : b.type === "code" ? "{ } " : ""}{b.content || <span className="italic text-gray-300">Empty block</span>}
                      </div>
                    ))}
                    {s.blocks.length > 3 && <div className="text-xs text-gray-300">+{s.blocks.length - 3} more blocks</div>}
                  </div>
                  <div className="text-[10px] text-gray-300">{s.blocks.length} block{s.blocks.length !== 1 ? "s" : ""} · {s.createdAt.toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "bookmarks" && (
          <div className="flex-1">
            <div className="text-xs text-gray-400 px-1 py-2 mb-1">Bookmarked blocks from your pages.</div>
            {bookmarkedBlocks.length === 0 && <p className="text-xs text-gray-400 italic text-center py-6">No bookmarks yet.<br/>Block menu → Bookmark this block</p>}
            {bookmarkedBlocks.map(bm => (
              <div key={bm.id} className="border border-gray-200 rounded-xl p-3 mb-2 hover:border-blue-200 bg-white group/bm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Bookmark className="w-2.5 h-2.5" />
                      <span className="truncate">{bm.pageTitle}</span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{bm.content || <span className="italic text-gray-400">No content</span>}</p>
                    <div className="text-[10px] text-gray-300 mt-1">{bm.type} · {relativeTime(bm.savedAt)}</div>
                  </div>
                  <button className="text-gray-300 hover:text-red-400 opacity-0 group-hover/bm:opacity-100 shrink-0 text-xs" onClick={() => removeBookmark(bm.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <div className="border-t border-gray-200 px-2 py-2 space-y-1">
        <button
          className="w-full h-9 flex items-center gap-2 px-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md border border-transparent hover:border-blue-200 transition-colors"
          onClick={() => createJournalPage()}
        >
          <Book className="w-4 h-4" />
          <span>Today's Journal</span>
          <span className="ml-auto text-xs bg-orange-100 text-orange-600 rounded-full px-2 py-0.5 font-medium">🔥 {journalStreak}d</span>
        </button>
        <button className="w-full h-8 flex items-center gap-2 px-3 text-sm text-gray-500 hover:bg-gray-100 rounded-md" onClick={() => createPage()}>
          <Plus className="w-4 h-4" /> New Page
        </button>
      </div>

      {captureOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setCaptureOpen(false)}>
          <div className="absolute bottom-16 left-4 bg-white rounded-xl shadow-2xl border p-3 w-72" onClick={e => e.stopPropagation()}>
            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Quick Capture</p>
            <input ref={captureRef} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="Capture a thought..." value={captureText} onChange={e => setCaptureText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && captureText.trim()) { addInboxItem(captureText.trim()); setCaptureText(""); setCaptureOpen(false); } if (e.key === "Escape") setCaptureOpen(false); }} />
            <p className="text-xs text-gray-400 mt-1.5">Press Enter to save · Esc to cancel</p>
          </div>
        </div>
      )}
    </div>
  );
}
