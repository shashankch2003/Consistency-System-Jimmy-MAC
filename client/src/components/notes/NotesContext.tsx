import { createContext, useContext, useState, useCallback, useRef } from "react";

export type BlockType =
  | "text" | "heading1" | "heading2" | "heading3"
  | "bullet_list" | "numbered_list" | "todo"
  | "toggle" | "toggle_heading1" | "toggle_heading2" | "toggle_heading3"
  | "quote" | "callout" | "divider" | "code"
  | "table" | "image" | "video" | "file" | "bookmark" | "embed" | "columns"
  | "equation" | "table_of_contents" | "mention" | "synced_block"
  | "template_button" | "link_to_page" | "link_preview"
  | "voice_note" | "sketch" | "flashcard" | "progress_tracker"
  | "reading_list" | "timeline" | "poll" | "code_runner";

export type PageStatus = "draft" | "in_progress" | "review" | "final" | "archived";
export type FontType = "default" | "serif" | "mono";
export type TabType = "pages" | "recent" | "favorites" | "tags" | "snippets" | "bookmarks";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  properties: {
    checked?: boolean;
    language?: string;
    expanded?: boolean;
    url?: string;
    caption?: string;
    align?: "left" | "center" | "full";
    color?: string;
    icon?: string;
    rows?: string[][];
    headerRow?: boolean;
    latex?: string;
    editing?: boolean;
    syncId?: string;
    synced?: boolean;
    buttonLabel?: string;
    pageId?: string;
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    audioUrl?: string;
    duration?: number;
    amplitudes?: number[];
    transcription?: string;
    isRecording?: boolean;
    imageData?: string;
    drawingHistory?: string[];
    front?: string;
    back?: string;
    flipped?: boolean;
    addedToDeck?: boolean;
    label?: string;
    value?: number;
    items?: { url: string; title: string; favicon: string; read: boolean }[];
    entries?: { date: string; title: string; description: string }[];
    question?: string;
    options?: { text: string; votes: number }[];
    voted?: boolean;
    votedOption?: number;
    output?: string;
    running?: boolean;
    reactions?: { emoji: string; count: number; voted: boolean }[];
    [key: string]: any;
  };
  children: Block[];
  indent: number;
}

export interface Page {
  id: string;
  title: string;
  icon: string;
  cover: string;
  parentId: string | null;
  status: PageStatus;
  isFavorite: boolean;
  tags: string[];
  blocks: Block[];
  font: FontType;
  smallText: boolean;
  fullWidth: boolean;
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastVisitedAt?: Date;
  wordCount?: number;
}

export interface Snippet {
  id: string;
  name: string;
  blocks: Block[];
  createdAt: Date;
}

export interface BookmarkedBlock {
  id: string;
  blockId: string;
  pageId: string;
  pageTitle: string;
  content: string;
  type: BlockType;
  savedAt: Date;
}

export interface PageInsights {
  summary: string;
  topics: string[];
  sentiment: "Positive" | "Neutral" | "Negative";
  readability: string;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function makeBlock(type: BlockType = "text", content = "", extra: Partial<Block> = {}): Block {
  const defaultProps: Block["properties"] =
    type === "callout" ? { color: "blue", icon: "💡" } :
    type === "code" ? { language: "javascript" } :
    type === "code_runner" ? { language: "javascript", output: "" } :
    type === "table" ? { rows: [["Header 1","Header 2","Header 3"],["","",""],["","",""]], headerRow: true } :
    type === "toggle" ? { expanded: true } :
    type === "equation" ? { latex: "E = mc^2", editing: false } :
    type === "flashcard" ? { front: "Question?", back: "Answer", flipped: false, addedToDeck: false } :
    type === "progress_tracker" ? { label: "Sprint Progress", value: 60, color: "blue" } :
    type === "reading_list" ? { items: [] } :
    type === "timeline" ? { entries: [{ date: new Date().toLocaleDateString(), title: "Start", description: "Timeline begins" }] } :
    type === "poll" ? { question: "What do you think?", options: [{ text: "Option A", votes: 0 }, { text: "Option B", votes: 0 }], voted: false, votedOption: -1 } :
    type === "template_button" ? { buttonLabel: "Add Meeting Notes" } :
    type === "voice_note" ? { amplitudes: [], transcription: "" } :
    type === "sketch" ? { imageData: "" } :
    {};
  return {
    id: uid(),
    type,
    content,
    properties: defaultProps,
    children: [],
    indent: 0,
    ...extra,
  };
}

const SAMPLE_BLOCKS: Block[] = [
  makeBlock("text", "This sprint focuses on delivering the core authentication flow, dashboard layout, and the first set of productivity tracking features."),
  makeBlock("heading2", "Key Decisions"),
  makeBlock("bullet_list", "Use React Query for server state management"),
  makeBlock("bullet_list", "PostgreSQL with Drizzle ORM for the data layer"),
  makeBlock("bullet_list", "Replit Auth for user authentication"),
  makeBlock("callout", "Remember to run drizzle-kit push after every schema change to keep the database in sync.", { properties: { color: "blue", icon: "💡" } }),
  makeBlock("code", "const queryClient = new QueryClient();\nconst storage = new DatabaseStorage();\nawait registerRoutes(httpServer, app);", { properties: { language: "javascript" } }),
];

const OLD_DATE = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45);

const INITIAL_PAGES: Page[] = [
  {
    id: "p1", title: "Getting Started", icon: "🚀", cover: "from-indigo-400 to-purple-500",
    parentId: null, status: "final", isFavorite: true, tags: ["Work"],
    blocks: [makeBlock("text", "Welcome to your notes. Start by creating a new page or editing this one.")],
    font: "default", smallText: false, fullWidth: false, locked: false,
    createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-20"),
    lastVisitedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "p2", title: "Project Notes", icon: "📁", cover: "from-blue-400 to-purple-500",
    parentId: null, status: "in_progress", isFavorite: true, tags: ["Work", "Team"],
    blocks: [], font: "default", smallText: false, fullWidth: false, locked: false,
    createdAt: new Date("2026-03-05"), updatedAt: new Date("2026-03-21"),
    lastVisitedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "p3", title: "Sprint 1", icon: "📄", cover: "from-blue-400 to-purple-500",
    parentId: "p2", status: "in_progress", isFavorite: false, tags: ["Work"],
    blocks: SAMPLE_BLOCKS, font: "default", smallText: false, fullWidth: false, locked: false,
    createdAt: new Date("2026-03-10"), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    lastVisitedAt: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: "p4", title: "Sprint 2", icon: "📄", cover: "from-green-400 to-teal-500",
    parentId: "p2", status: "draft", isFavorite: false, tags: ["Work"],
    blocks: [makeBlock("text", "Sprint 2 planning in progress...")],
    font: "default", smallText: false, fullWidth: false, locked: false,
    createdAt: new Date("2026-03-15"), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    lastVisitedAt: OLD_DATE,
  },
  {
    id: "p5", title: "Meeting Notes", icon: "📝", cover: "from-rose-400 to-pink-500",
    parentId: null, status: "draft", isFavorite: false, tags: ["Team"],
    blocks: [
      makeBlock("text", "Weekly sync notes for the team. Key agenda items include project status review, blockers, and upcoming milestones."),
      makeBlock("text", "Team members present: Alice, Bob, Charlie, Diana"),
      makeBlock("bullet_list", "Review sprint progress"),
      makeBlock("bullet_list", "Discuss technical debt"),
      makeBlock("bullet_list", "Plan upcoming release"),
    ],
    font: "default", smallText: false, fullWidth: false, locked: false,
    createdAt: new Date("2026-03-12"), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    lastVisitedAt: OLD_DATE,
    wordCount: 60,
  },
  {
    id: "p6", title: "Ideas", icon: "💡", cover: "from-yellow-400 to-orange-500",
    parentId: null, status: "draft", isFavorite: true, tags: ["Personal", "Ideas"],
    blocks: [makeBlock("text", "Idea collection...")],
    font: "default", smallText: false, fullWidth: false, locked: false,
    createdAt: new Date("2026-03-08"), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    lastVisitedAt: undefined,
    wordCount: 80,
  },
  {
    id: "p7", title: "Research", icon: "🔬", cover: "from-cyan-400 to-teal-500",
    parentId: null, status: "review", isFavorite: false, tags: ["Research"],
    blocks: [],
    font: "default", smallText: false, fullWidth: false, locked: false,
    createdAt: new Date("2026-03-03"), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    lastVisitedAt: OLD_DATE,
    wordCount: 0,
  },
  {
    id: "p8", title: "Archive", icon: "🗂️", cover: "from-gray-400 to-gray-500",
    parentId: null, status: "archived", isFavorite: false, tags: ["Archive"],
    blocks: [],
    font: "default", smallText: false, fullWidth: false, locked: false,
    createdAt: new Date("2026-02-20"), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
    lastVisitedAt: undefined,
    wordCount: 0,
  },
];

interface NotesContextValue {
  pages: Page[];
  selectedPageId: string | null;
  selectedPage: Page | null;
  activeTab: TabType;
  settingsPanelOpen: boolean;
  searchOpen: boolean;
  focusModeOpen: boolean;
  splitViewOpen: boolean;
  contentMapOpen: boolean;
  presentationModeOpen: boolean;
  inboxItems: string[];
  recentPageIds: string[];
  activeTag: string | null;
  trashPageIds: string[];
  newPageFocusTrigger: number;
  snippets: Snippet[];
  aiCoachEnabled: boolean;
  journalStreak: number;
  recyclerDismissed: string[];
  bookmarkedBlocks: BookmarkedBlock[];
  pageInsights: Record<string, PageInsights>;
  smartTagSuggestions: Record<string, string[]>;

  selectPage: (id: string) => void;
  createPage: (parentId?: string | null) => string;
  updatePage: (id: string, updates: Partial<Omit<Page, "id">>) => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => string;
  toggleFavorite: (id: string) => void;
  setActiveTab: (tab: TabType) => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setFocusModeOpen: (open: boolean) => void;
  setSplitViewOpen: (open: boolean) => void;
  setContentMapOpen: (open: boolean) => void;
  setPresentationModeOpen: (open: boolean) => void;
  addInboxItem: (text: string) => void;
  setActiveTag: (tag: string | null) => void;
  restoreFromTrash: (id: string) => void;
  addSnippet: (name: string, blocks: Block[]) => void;
  deleteSnippet: (id: string) => void;
  insertSnippet: (snippetId: string) => Block[];
  toggleAiCoach: () => void;
  dismissFromRecycler: (pageId: string) => void;
  bookmarkBlock: (blockId: string, pageId: string, pageTitle: string, content: string, type: BlockType) => void;
  removeBookmark: (id: string) => void;
  generateInsights: (pageId: string) => void;
  generateSmartTags: (pageId: string) => void;
  acceptSmartTag: (pageId: string, tag: string) => void;
  dismissSmartTag: (pageId: string, tag: string) => void;
  createJournalPage: () => string;
  makeBlock: typeof makeBlock;
  uid: typeof uid;
}

const NotesContext = createContext<NotesContextValue | null>(null);

const SENTIMENT_WORDS = {
  positive: ["great","good","excellent","amazing","wonderful","fantastic","love","enjoy","happy","success","improve","achieve","growth"],
  negative: ["bad","poor","fail","difficult","problem","issue","struggle","wrong","broken","error","bug","delay"],
};

function extractTopics(text: string): string[] {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 4);
  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] ?? 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

function calcSentiment(text: string): "Positive" | "Neutral" | "Negative" {
  const lower = text.toLowerCase();
  const pos = SENTIMENT_WORDS.positive.filter(w => lower.includes(w)).length;
  const neg = SENTIMENT_WORDS.negative.filter(w => lower.includes(w)).length;
  if (pos > neg + 1) return "Positive";
  if (neg > pos + 1) return "Negative";
  return "Neutral";
}

function calcReadability(wordCount: number): string {
  if (wordCount < 50) return "Elementary";
  if (wordCount < 200) return "Grade 6–8";
  if (wordCount < 500) return "Grade 9–12";
  return "College Level";
}

function generateSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length === 0) return "No content to summarize.";
  const first = sentences.slice(0, Math.min(3, sentences.length)).map(s => s.trim()).join(". ") + ".";
  return first;
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<Page[]>(INITIAL_PAGES);
  const [selectedPageId, setSelectedPageId] = useState<string | null>("p3");
  const [activeTab, setActiveTab] = useState<TabType>("pages");
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [contentMapOpen, setContentMapOpen] = useState(false);
  const [presentationModeOpen, setPresentationModeOpen] = useState(false);
  const [inboxItems, setInboxItems] = useState<string[]>(["Follow up on design review", "Read article about AI trends"]);
  const [recentPageIds, setRecentPageIds] = useState<string[]>(["p3", "p5", "p2", "p6"]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [trashPageIds, setTrashPageIds] = useState<string[]>([]);
  const [newPageFocusTrigger, setNewPageFocusTrigger] = useState(0);
  const [snippets, setSnippets] = useState<Snippet[]>([
    { id: "s1", name: "Meeting Template", createdAt: new Date(), blocks: [makeBlock("heading2", "Meeting Notes"), makeBlock("text", "Date: "), makeBlock("bullet_list", "Agenda item 1"), makeBlock("bullet_list", "Action items:")] },
  ]);
  const [aiCoachEnabled, setAiCoachEnabled] = useState(false);
  const [journalStreak] = useState(7);
  const [recyclerDismissed, setRecyclerDismissed] = useState<string[]>([]);
  const [bookmarkedBlocks, setBookmarkedBlocks] = useState<BookmarkedBlock[]>([]);
  const [pageInsights, setPageInsights] = useState<Record<string, PageInsights>>({});
  const [smartTagSuggestions, setSmartTagSuggestions] = useState<Record<string, string[]>>({});

  const selectedPage = pages.find(p => p.id === selectedPageId) ?? null;

  const selectPage = useCallback((id: string) => {
    setSelectedPageId(id);
    setPages(prev => prev.map(p => p.id === id ? { ...p, lastVisitedAt: new Date() } : p));
    setRecentPageIds(prev => {
      const filtered = prev.filter(r => r !== id);
      return [id, ...filtered].slice(0, 10);
    });
  }, []);

  const createPage = useCallback((parentId: string | null = null) => {
    const id = uid();
    const newPage: Page = {
      id, title: "", icon: "📄", cover: "from-blue-400 to-purple-500",
      parentId, status: "draft", isFavorite: false, tags: [],
      blocks: [makeBlock("text", "")],
      font: "default", smallText: false, fullWidth: false, locked: false,
      createdAt: new Date(), updatedAt: new Date(), lastVisitedAt: new Date(),
    };
    setPages(prev => [...prev, newPage]);
    setSelectedPageId(id);
    setRecentPageIds(prev => [id, ...prev].slice(0, 10));
    setNewPageFocusTrigger(t => t + 1);
    return id;
  }, []);

  const updatePage = useCallback((id: string, updates: Partial<Omit<Page, "id">>) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p));
  }, []);

  const deletePage = useCallback((id: string) => {
    setTrashPageIds(prev => [...prev, id]);
    setPages(prev => prev.filter(p => p.id !== id));
    setSelectedPageId(prev => prev === id ? null : prev);
  }, []);

  const duplicatePage = useCallback((id: string) => {
    const page = pages.find(p => p.id === id);
    if (!page) return id;
    const newId = uid();
    const copy: Page = { ...page, id: newId, title: page.title + " (copy)", createdAt: new Date(), updatedAt: new Date() };
    setPages(prev => [...prev, copy]);
    setSelectedPageId(newId);
    return newId;
  }, [pages]);

  const toggleFavorite = useCallback((id: string) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  }, []);

  const addInboxItem = useCallback((text: string) => {
    setInboxItems(prev => [...prev, text]);
  }, []);

  const restoreFromTrash = useCallback((id: string) => {
    setTrashPageIds(prev => prev.filter(t => t !== id));
  }, []);

  const addSnippet = useCallback((name: string, blocks: Block[]) => {
    const s: Snippet = { id: uid(), name, blocks: blocks.map(b => ({ ...b, id: uid() })), createdAt: new Date() };
    setSnippets(prev => [...prev, s]);
  }, []);

  const deleteSnippet = useCallback((id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id));
  }, []);

  const insertSnippet = useCallback((snippetId: string): Block[] => {
    const s = snippets.find(s => s.id === snippetId);
    if (!s) return [];
    return s.blocks.map(b => ({ ...b, id: uid() }));
  }, [snippets]);

  const toggleAiCoach = useCallback(() => {
    setAiCoachEnabled(prev => !prev);
  }, []);

  const dismissFromRecycler = useCallback((pageId: string) => {
    setRecyclerDismissed(prev => [...prev, pageId]);
  }, []);

  const bookmarkBlock = useCallback((blockId: string, pageId: string, pageTitle: string, content: string, type: BlockType) => {
    const bm: BookmarkedBlock = { id: uid(), blockId, pageId, pageTitle, content, type, savedAt: new Date() };
    setBookmarkedBlocks(prev => [...prev, bm]);
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarkedBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  const generateInsights = useCallback((pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    const text = page.blocks.map(b => b.content).join(" ");
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const insights: PageInsights = {
      summary: generateSummary(text),
      topics: extractTopics(text),
      sentiment: calcSentiment(text),
      readability: calcReadability(wordCount),
    };
    setPageInsights(prev => ({ ...prev, [pageId]: insights }));
  }, [pages]);

  const generateSmartTags = useCallback((pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    const text = page.blocks.map(b => b.content).join(" ");
    const topics = extractTopics(text);
    const existing = new Set(page.tags);
    const suggestions = topics.filter(t => !existing.has(t));
    setSmartTagSuggestions(prev => ({ ...prev, [pageId]: suggestions }));
  }, [pages]);

  const acceptSmartTag = useCallback((pageId: string, tag: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, tags: [...p.tags, tag], updatedAt: new Date() } : p));
    setSmartTagSuggestions(prev => ({ ...prev, [pageId]: (prev[pageId] ?? []).filter(t => t !== tag) }));
  }, []);

  const dismissSmartTag = useCallback((pageId: string, tag: string) => {
    setSmartTagSuggestions(prev => ({ ...prev, [pageId]: (prev[pageId] ?? []).filter(t => t !== tag) }));
  }, []);

  const createJournalPage = useCallback((): string => {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const journalId = `journal-${today.toISOString().slice(0, 10)}`;
    const existing = pages.find(p => p.id === journalId);
    if (existing) { selectPage(journalId); return journalId; }
    const journalPage: Page = {
      id: journalId, title: `Journal — ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      icon: "📔", cover: "from-indigo-400 to-purple-500",
      parentId: null, status: "draft", isFavorite: false, tags: ["Journal"],
      blocks: [
        makeBlock("heading1", dateStr),
        makeBlock("text", ""),
        { id: uid(), type: "text", content: "Mood: 😊", properties: { isMood: true }, children: [], indent: 0 },
        makeBlock("heading3", "What's on your mind?"),
        makeBlock("text", ""),
        makeBlock("heading3", "Gratitude"),
        makeBlock("bullet_list", "I'm grateful for..."),
        makeBlock("heading3", "Today's Goals"),
        makeBlock("todo", ""),
        makeBlock("todo", ""),
      ],
      font: "default", smallText: false, fullWidth: false, locked: false,
      createdAt: today, updatedAt: today, lastVisitedAt: today,
    };
    setPages(prev => [...prev, journalPage]);
    setSelectedPageId(journalId);
    setRecentPageIds(prev => [journalId, ...prev].slice(0, 10));
    return journalId;
  }, [pages, selectPage]);

  return (
    <NotesContext.Provider value={{
      pages, selectedPageId, selectedPage, activeTab, settingsPanelOpen,
      searchOpen, focusModeOpen, splitViewOpen, contentMapOpen, presentationModeOpen,
      inboxItems, recentPageIds, activeTag, trashPageIds, newPageFocusTrigger,
      snippets, aiCoachEnabled, journalStreak, recyclerDismissed, bookmarkedBlocks,
      pageInsights, smartTagSuggestions,
      selectPage, createPage, updatePage, deletePage, duplicatePage,
      toggleFavorite, setActiveTab, setSettingsPanelOpen, setSearchOpen,
      setFocusModeOpen, setSplitViewOpen, setContentMapOpen, setPresentationModeOpen,
      addInboxItem, setActiveTag, restoreFromTrash,
      addSnippet, deleteSnippet, insertSnippet,
      toggleAiCoach, dismissFromRecycler,
      bookmarkBlock, removeBookmark,
      generateInsights, generateSmartTags, acceptSmartTag, dismissSmartTag,
      createJournalPage,
      makeBlock, uid,
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be inside NotesProvider");
  return ctx;
}

