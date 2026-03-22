import { createContext, useContext, useState, useCallback, useRef } from "react";

export type BlockType =
  | "text" | "heading1" | "heading2" | "heading3"
  | "bullet_list" | "numbered_list" | "todo"
  | "toggle" | "toggle_heading1" | "toggle_heading2" | "toggle_heading3"
  | "quote" | "callout" | "divider" | "code"
  | "table" | "image" | "video" | "file" | "bookmark" | "embed" | "columns";

export type PageStatus = "draft" | "in_progress" | "review" | "final" | "archived";
export type FontType = "default" | "serif" | "mono";
export type TabType = "pages" | "recent" | "favorites" | "tags";

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
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeBlock(type: BlockType = "text", content = "", extra: Partial<Block> = {}): Block {
  return {
    id: uid(),
    type,
    content,
    properties: type === "callout" ? { color: "blue", icon: "💡" } : type === "code" ? { language: "javascript" } : type === "table" ? { rows: [["Header 1","Header 2","Header 3"],["","",""],["","",""]], headerRow: true } : type === "toggle" ? { expanded: true } : {},
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

const INITIAL_PAGES: Page[] = [
  {
    id: "p1",
    title: "Getting Started",
    icon: "🚀",
    cover: "from-indigo-400 to-purple-500",
    parentId: null,
    status: "final",
    isFavorite: true,
    tags: ["Work"],
    blocks: [makeBlock("text", "Welcome to your notes. Start by creating a new page or editing this one.")],
    font: "default",
    smallText: false,
    fullWidth: false,
    locked: false,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-20"),
  },
  {
    id: "p2",
    title: "Project Notes",
    icon: "📁",
    cover: "from-blue-400 to-purple-500",
    parentId: null,
    status: "in_progress",
    isFavorite: true,
    tags: ["Work", "Team"],
    blocks: [],
    font: "default",
    smallText: false,
    fullWidth: false,
    locked: false,
    createdAt: new Date("2026-03-05"),
    updatedAt: new Date("2026-03-21"),
  },
  {
    id: "p3",
    title: "Sprint 1",
    icon: "📄",
    cover: "from-blue-400 to-purple-500",
    parentId: "p2",
    status: "in_progress",
    isFavorite: false,
    tags: ["Work"],
    blocks: SAMPLE_BLOCKS,
    font: "default",
    smallText: false,
    fullWidth: false,
    locked: false,
    createdAt: new Date("2026-03-10"),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: "p4",
    title: "Sprint 2",
    icon: "📄",
    cover: "from-green-400 to-teal-500",
    parentId: "p2",
    status: "draft",
    isFavorite: false,
    tags: ["Work"],
    blocks: [makeBlock("text", "Sprint 2 planning in progress...")],
    font: "default",
    smallText: false,
    fullWidth: false,
    locked: false,
    createdAt: new Date("2026-03-15"),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: "p5",
    title: "Meeting Notes",
    icon: "📝",
    cover: "from-rose-400 to-pink-500",
    parentId: null,
    status: "draft",
    isFavorite: false,
    tags: ["Team"],
    blocks: [makeBlock("text", "Weekly sync notes...")],
    font: "default",
    smallText: false,
    fullWidth: false,
    locked: false,
    createdAt: new Date("2026-03-12"),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: "p6",
    title: "Ideas",
    icon: "💡",
    cover: "from-yellow-400 to-orange-500",
    parentId: null,
    status: "draft",
    isFavorite: true,
    tags: ["Personal", "Ideas"],
    blocks: [makeBlock("text", "Idea collection...")],
    font: "default",
    smallText: false,
    fullWidth: false,
    locked: false,
    createdAt: new Date("2026-03-08"),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
  {
    id: "p7",
    title: "Research",
    icon: "🔬",
    cover: "from-cyan-400 to-teal-500",
    parentId: null,
    status: "review",
    isFavorite: false,
    tags: ["Research"],
    blocks: [],
    font: "default",
    smallText: false,
    fullWidth: false,
    locked: false,
    createdAt: new Date("2026-03-03"),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
  },
  {
    id: "p8",
    title: "Archive",
    icon: "🗂️",
    cover: "from-gray-400 to-gray-500",
    parentId: null,
    status: "archived",
    isFavorite: false,
    tags: ["Archive"],
    blocks: [],
    font: "default",
    smallText: false,
    fullWidth: false,
    locked: false,
    createdAt: new Date("2026-02-20"),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
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
  inboxItems: string[];
  recentPageIds: string[];
  activeTag: string | null;
  trashPageIds: string[];
  newPageFocusTrigger: number;

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
  addInboxItem: (text: string) => void;
  setActiveTag: (tag: string | null) => void;
  restoreFromTrash: (id: string) => void;
  makeBlock: typeof makeBlock;
  uid: typeof uid;
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<Page[]>(INITIAL_PAGES);
  const [selectedPageId, setSelectedPageId] = useState<string | null>("p3");
  const [activeTab, setActiveTab] = useState<TabType>("pages");
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [contentMapOpen, setContentMapOpen] = useState(false);
  const [inboxItems, setInboxItems] = useState<string[]>(["Follow up on design review", "Read article about AI trends"]);
  const [recentPageIds, setRecentPageIds] = useState<string[]>(["p3", "p5", "p2", "p6"]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [trashPageIds, setTrashPageIds] = useState<string[]>([]);
  const [newPageFocusTrigger, setNewPageFocusTrigger] = useState(0);

  const selectedPage = pages.find(p => p.id === selectedPageId) ?? null;

  const selectPage = useCallback((id: string) => {
    setSelectedPageId(id);
    setRecentPageIds(prev => {
      const filtered = prev.filter(r => r !== id);
      return [id, ...filtered].slice(0, 10);
    });
  }, []);

  const createPage = useCallback((parentId: string | null = null) => {
    const id = uid();
    const newPage: Page = {
      id,
      title: "",
      icon: "📄",
      cover: "from-blue-400 to-purple-500",
      parentId,
      status: "draft",
      isFavorite: false,
      tags: [],
      blocks: [makeBlock("text", "")],
      font: "default",
      smallText: false,
      fullWidth: false,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
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
    const copy: Page = {
      ...page,
      id: newId,
      title: page.title + " (copy)",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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

  return (
    <NotesContext.Provider value={{
      pages, selectedPageId, selectedPage, activeTab, settingsPanelOpen,
      searchOpen, focusModeOpen, splitViewOpen, contentMapOpen,
      inboxItems, recentPageIds, activeTag, trashPageIds, newPageFocusTrigger,
      selectPage, createPage, updatePage, deletePage, duplicatePage,
      toggleFavorite, setActiveTab, setSettingsPanelOpen, setSearchOpen,
      setFocusModeOpen, setSplitViewOpen, setContentMapOpen,
      addInboxItem, setActiveTag, restoreFromTrash, makeBlock, uid,
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

export { makeBlock, uid };
