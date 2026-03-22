import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronRight, Settings, Lock, Unlock, Monitor } from "lucide-react";
import { useNotes, Page, PageStatus, FontType } from "./NotesContext";
import BlockEditor from "./BlockEditor";

const COVERS = [
  "from-blue-400 to-purple-500","from-green-400 to-teal-500","from-rose-400 to-pink-500",
  "from-yellow-400 to-orange-500","from-indigo-400 to-purple-500","from-cyan-400 to-teal-500",
];

const EMOJIS = ["📄","📝","📋","📌","⭐","🎯","💡","🔥","📊","🎨","💼","🏠","📱","🎬","🎵","📚","🌟","🚀","💰","🔑","🔬","📁","🗂️","🗓️","📎","✏️","🎓","🏆","🌐","⚡","🔐","🎪","🎭","🖼️","🗺️","🏔️","🌿","🌊","🎵","🎺","🎸","🎹","🎻","🥁"];

const STATUS_MAP: Record<PageStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-gray-100 text-gray-600" },
  in_progress: { label: "In Progress", cls: "bg-yellow-100 text-yellow-700" },
  review: { label: "Review", cls: "bg-blue-100 text-blue-700" },
  final: { label: "Final", cls: "bg-green-100 text-green-700" },
  archived: { label: "Archived", cls: "bg-gray-200 text-gray-400" },
};

const AI_SUGGESTIONS = [
  "This sentence could be clearer.",
  "Consider a stronger verb here.",
  "Reading level: Grade 8.",
  "Try starting with the key point.",
  "Good structure — keep going!",
  "This paragraph is dense. Consider splitting it.",
  "Active voice would be more engaging.",
  "Great use of examples here.",
  "Add a transition to connect these ideas.",
  "This could benefit from more specifics.",
];

function Breadcrumbs({ page, pages }: { page: Page; pages: Page[] }) {
  const { selectPage } = useNotes();
  const chain: Page[] = [];
  let cur: Page | undefined = page;
  while (cur?.parentId) {
    const par = pages.find(p => p.id === cur!.parentId);
    if (par) { chain.unshift(par); cur = par; } else break;
  }
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400 mt-3 flex-wrap">
      <span className="hover:text-gray-600 cursor-pointer">Notes</span>
      {chain.map(p => (
        <span key={p.id} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          <span className="hover:text-gray-600 cursor-pointer" onClick={() => selectPage(p.id)}>{p.title || "Untitled"}</span>
        </span>
      ))}
      <ChevronRight className="w-3 h-3" />
      <span className="text-gray-600">{page.title || "Untitled"}</span>
    </div>
  );
}

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

export default function PageView() {
  const { selectedPage, pages, updatePage, setSettingsPanelOpen, aiCoachEnabled, setPresentationModeOpen } = useNotes();
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [coachSuggestions, setCoachSuggestions] = useState<string[]>([]);
  const [smartLinkHints, setSmartLinkHints] = useState<{ title: string; pageId: string }[]>([]);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const coachTimer = useRef<number>(0);
  const smartLinkTimer = useRef<number>(0);

  useEffect(() => {
    if (titleRef.current && selectedPage) {
      const cur = titleRef.current.innerText;
      if (cur !== selectedPage.title) titleRef.current.innerText = selectedPage.title;
    }
  }, [selectedPage?.id]);

  const wordCount = selectedPage?.blocks.reduce((acc, b) => acc + b.content.split(/\s+/).filter(Boolean).length, 0) ?? 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const lastEdited = selectedPage ? relativeTime(selectedPage.updatedAt) : "";

  const refreshCoach = useCallback(() => {
    if (!aiCoachEnabled || !selectedPage) { setCoachSuggestions([]); return; }
    clearTimeout(coachTimer.current);
    coachTimer.current = window.setTimeout(() => {
      const wc = selectedPage.blocks.reduce((a, b) => a + b.content.split(/\s+/).filter(Boolean).length, 0);
      if (wc < 5) { setCoachSuggestions([]); return; }
      const count = wc < 50 ? 1 : wc < 200 ? 2 : 3;
      const shuffled = [...AI_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, count);
      setCoachSuggestions(shuffled);
    }, 2000);
  }, [aiCoachEnabled, selectedPage]);

  const refreshSmartLinks = useCallback(() => {
    if (!selectedPage || pages.length < 2) return;
    clearTimeout(smartLinkTimer.current);
    smartLinkTimer.current = window.setTimeout(() => {
      const allText = selectedPage.blocks.map(b => b.content).join(" ").toLowerCase();
      const matches = pages
        .filter(p => p.id !== selectedPage.id && p.title && p.title.length > 3)
        .filter(p => allText.includes(p.title.toLowerCase()))
        .slice(0, 3);
      setSmartLinkHints(matches.map(p => ({ title: p.title, pageId: p.id })));
    }, 3000);
  }, [selectedPage, pages]);

  useEffect(() => { refreshCoach(); }, [selectedPage?.blocks, aiCoachEnabled]);
  useEffect(() => { refreshSmartLinks(); }, [selectedPage?.blocks]);
  useEffect(() => () => { clearTimeout(coachTimer.current); clearTimeout(smartLinkTimer.current); }, []);

  if (!selectedPage) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <p>Select a page from the sidebar</p>
          <p className="text-xs mt-1">or create a new one</p>
        </div>
      </div>
    );
  }

  const fontClass = selectedPage.font === "serif" ? "font-serif" : selectedPage.font === "mono" ? "font-mono" : "font-sans";
  const textSizeClass = selectedPage.smallText ? "text-sm" : "text-base";

  return (
    <div className={`flex-1 overflow-y-auto ${fontClass} ${textSizeClass}`} style={{ maxWidth: selectedPage.fullWidth ? "100%" : "900px", margin: "0 auto" }}>
      <div className="px-4 md:px-16 py-8 relative">
        <div className={`h-[200px] w-full bg-gradient-to-r ${selectedPage.cover} rounded-b-lg relative`}>
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              className="text-white/70 text-xs hover:text-white bg-black/20 px-2 py-1 rounded flex items-center gap-1"
              onClick={() => setShowPageMenu(v => !v)}
            >
              ⋯ Page menu
            </button>
            <button className="text-white/70 text-xs hover:text-white bg-black/20 px-2 py-1 rounded" onClick={() => setShowCoverPicker(true)}>Change cover</button>
          </div>
        </div>

        {showPageMenu && (
          <div className="absolute top-[200px] right-16 z-50 bg-white rounded-xl shadow-2xl border w-52 py-1" onClick={() => setShowPageMenu(false)}>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2" onClick={() => setPresentationModeOpen(true)}>
              <Monitor className="w-4 h-4 text-gray-400" /> Present
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700" onClick={() => setSettingsPanelOpen(true)}>
              <Settings className="w-4 h-4 text-gray-400 inline mr-2" />Settings
            </button>
          </div>
        )}

        {showCoverPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCoverPicker(false)}>
            <div className="bg-white rounded-xl shadow-2xl p-5 w-80" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-semibold text-gray-700 mb-3">Choose Cover</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {COVERS.map(c => (
                  <div key={c} className={`h-12 rounded-lg bg-gradient-to-r ${c} cursor-pointer hover:scale-105 transition-transform ${selectedPage.cover === c ? "ring-2 ring-blue-500" : ""}`}
                    onClick={() => { updatePage(selectedPage.id, { cover: c }); setShowCoverPicker(false); }} />
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Upload</button>
                <button className="flex-1 border border-red-100 rounded-lg py-2 text-sm text-red-500 hover:bg-red-50" onClick={() => { updatePage(selectedPage.id, { cover: "from-gray-200 to-gray-300" }); setShowCoverPicker(false); }}>Remove</button>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="text-5xl -mt-8 ml-2 relative z-10 cursor-pointer select-none inline-block" onClick={() => setShowIconPicker(v => !v)}>
            {selectedPage.icon}
          </div>
          {showIconPicker && (
            <div className="absolute top-0 left-0 z-50 bg-white rounded-xl shadow-2xl border p-3 w-72" style={{ marginTop: "2rem" }}>
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map(e => (
                  <button key={e} className="text-xl hover:bg-gray-100 rounded p-1" onClick={() => { updatePage(selectedPage.id, { icon: e }); setShowIconPicker(false); }}>{e}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Breadcrumbs page={selectedPage} pages={pages} />

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <div className="relative">
            <button className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${STATUS_MAP[selectedPage.status].cls}`} onClick={() => setShowStatusDrop(v => !v)}>
              {STATUS_MAP[selectedPage.status].label}
            </button>
            {showStatusDrop && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-xl border py-1 min-w-[140px]">
                {(Object.entries(STATUS_MAP) as [PageStatus, { label: string; cls: string }][]).map(([s, info]) => (
                  <button key={s} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm" onClick={() => { updatePage(selectedPage.id, { status: s }); setShowStatusDrop(false); }}>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{wordCount} words · {readingTime} min read · Last edited {lastEdited}</span>
          <button className="text-gray-400 hover:text-gray-600" onClick={() => updatePage(selectedPage.id, { locked: !selectedPage.locked })} title={selectedPage.locked ? "Unlock page" : "Lock page"}>
            {selectedPage.locked ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4" />}
          </button>
          <button className="text-gray-400 hover:text-gray-600" onClick={() => setSettingsPanelOpen(true)}><Settings className="w-4 h-4" /></button>
        </div>

        {smartLinkHints.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {smartLinkHints.map(hint => (
              <div key={hint.pageId} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-1 rounded-full cursor-pointer hover:bg-blue-100 transition-colors"
                title={`"${hint.title}" page found — click to link`}
                onClick={() => setSmartLinkHints(prev => prev.filter(h => h.pageId !== hint.pageId))}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
                <span>Smart link: <span className="underline">{hint.title}</span></span>
                <span className="opacity-50">✕</span>
              </div>
            ))}
          </div>
        )}

        <div
          ref={titleRef}
          contentEditable={!selectedPage.locked}
          suppressContentEditableWarning
          className="text-4xl font-bold text-gray-900 mt-2 outline-none w-full border-0 bg-transparent cursor-text"
          data-placeholder="Untitled"
          onInput={e => updatePage(selectedPage.id, { title: (e.target as HTMLDivElement).innerText })}
          onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
          style={{ minHeight: "2.5rem" }}
        />

        <div className="mt-6 flex gap-4">
          <div className="flex-1 min-w-0">
            <BlockEditor />
          </div>
          {aiCoachEnabled && coachSuggestions.length > 0 && (
            <div className="w-[200px] shrink-0 space-y-2 mt-2">
              <div className="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
                <span>🤖</span> AI Coach
              </div>
              {coachSuggestions.map((s, i) => (
                <div key={i} className="bg-blue-50 rounded-lg p-2 text-xs text-blue-700 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors leading-relaxed" onClick={() => setCoachSuggestions(prev => prev.filter((_, idx) => idx !== i))}>
                  💡 {s}
                </div>
              ))}
              <button className="text-[10px] text-gray-400 hover:text-gray-600 w-full text-left mt-1" onClick={() => setCoachSuggestions([])}>Dismiss all</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
