import { useEffect, useState } from "react";
import { Shuffle, X, Pin } from "lucide-react";
import { saveCurrentContext } from "@/lib/context/contextManager";

interface ProjectCtx {
  id: string;
  name: string;
  color: string;
  last: string;
  stats: string;
  alert: string | null;
  alertColor?: string;
  isPinned: boolean;
}

const INITIAL_PINNED: ProjectCtx[] = [
  { id: "p1", name: "Login Redesign", color: "bg-blue-500", last: "2h ago", stats: "5 active tasks | 3 unread | 1 draft", alert: null, isPinned: true },
];

const INITIAL_RECENT: ProjectCtx[] = [
  { id: "p2", name: "API Documentation",  color: "bg-green-500",  last: "Yesterday",  stats: "2 active tasks | 0 unread | 0 drafts", alert: "3 important updates", alertColor: "text-orange-500", isPinned: false },
  { id: "p3", name: "Sprint Planning Q2", color: "bg-purple-500", last: "2 days ago", stats: "8 active tasks | 1 unread | 3 drafts",  alert: "2 decisions need input", alertColor: "text-orange-500", isPinned: false },
  { id: "p4", name: "Onboarding Guide",   color: "bg-yellow-500", last: "3 days ago", stats: "1 active task | 0 unread | 2 drafts",  alert: null, isPinned: false },
];

interface Props { onClose?: () => void; }

function useKeyboardShortcut(key: string, alt: boolean, shift: boolean, cb: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.altKey === alt && e.shiftKey === shift && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        cb();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, alt, shift, cb]);
}

function ProjectRow({
  project, pinIcon, onClick, onPin, onRemove,
}: {
  project: ProjectCtx; pinIcon?: boolean;
  onClick: () => void; onPin: () => void; onRemove: () => void;
}) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!ctxMenu) return;
    function close() { setCtxMenu(null); }
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [ctxMenu]);

  return (
    <div
      className="h-16 hover:bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-3 cursor-pointer relative"
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      {pinIcon && <Pin className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
      <div className={`w-3 h-3 rounded-full ${project.color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{project.name}</span>
          {project.alert && (
            <span className={`text-xs ${project.alertColor ?? "text-orange-500"}`}>{project.alert}</span>
          )}
          <span className="ml-auto text-sm text-gray-400 shrink-0">Last: {project.last}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{project.stats}</div>
      </div>
      {ctxMenu && (
        <div
          className="fixed z-[60] bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" onClick={(e) => { e.stopPropagation(); setCtxMenu(null); onPin(); }}>
            {project.isPinned ? "Unpin" : "Pin"}
          </button>
          <button className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" onClick={(e) => { e.stopPropagation(); setCtxMenu(null); }}>
            Edit
          </button>
          <button className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setCtxMenu(null); onRemove(); }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

export default function ContextSwitcherModal({ onClose }: Props) {
  const [search, setSearch] = useState("");
  const [pinned, setPinned] = useState<ProjectCtx[]>(INITIAL_PINNED);
  const [recent, setRecent] = useState<ProjectCtx[]>(INITIAL_RECENT);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const allProjects = [...pinned, ...recent];
  const filtered = search.trim()
    ? allProjects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  function handleSelectProject(project: ProjectCtx) {
    saveCurrentContext(project.id, { route: window.location.pathname, scrollY: window.scrollY });
    onClose?.();
  }

  function handlePin(project: ProjectCtx) {
    if (project.isPinned) {
      setPinned((prev) => prev.filter((p) => p.id !== project.id));
      setRecent((prev) => [{ ...project, isPinned: false }, ...prev]);
    } else {
      setRecent((prev) => prev.filter((p) => p.id !== project.id));
      setPinned((prev) => [{ ...project, isPinned: true }, ...prev]);
    }
  }

  function handleRemove(project: ProjectCtx) {
    setPinned((prev) => prev.filter((p) => p.id !== project.id));
    setRecent((prev) => prev.filter((p) => p.id !== project.id));
  }

  function handleCreate() {
    if (!newName.trim()) return;
    const project: ProjectCtx = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      color: "bg-gray-400",
      last: "Just now",
      stats: "0 active tasks",
      alert: null,
      isPinned: false,
    };
    setRecent((prev) => [project, ...prev]);
    setNewName("");
    setShowCreate(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[560px] w-full max-h-[70vh] rounded-xl shadow-2xl bg-white p-5 mx-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold text-gray-900">Switch Project Context</h2>
          </div>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div className="overflow-y-auto flex-1">
          {filtered ? (
            <>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">RESULTS</div>
              {filtered.map((p) => (
                <ProjectRow key={p.id} project={p} pinIcon={p.isPinned}
                  onClick={() => handleSelectProject(p)}
                  onPin={() => handlePin(p)}
                  onRemove={() => handleRemove(p)}
                />
              ))}
              {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No projects found.</p>}
            </>
          ) : (
            <>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">PINNED</div>
              {pinned.map((p) => (
                <ProjectRow key={p.id} project={p} pinIcon
                  onClick={() => handleSelectProject(p)}
                  onPin={() => handlePin(p)}
                  onRemove={() => handleRemove(p)}
                />
              ))}

              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">RECENT</div>
              {recent.map((p) => (
                <ProjectRow key={p.id} project={p}
                  onClick={() => handleSelectProject(p)}
                  onPin={() => handlePin(p)}
                  onRemove={() => handleRemove(p)}
                />
              ))}

              {pinned.length === 0 && recent.length === 0 && (
                <div className="text-sm text-gray-400 text-center mt-4">No project contexts detected.</div>
              )}
            </>
          )}
        </div>

        <div className="pt-3 border-t mt-3">
          {showCreate ? (
            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Project name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
                autoFocus
              />
              <button className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md" onClick={handleCreate}>Create</button>
              <button className="text-sm text-gray-400" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          ) : (
            <button className="text-sm text-blue-500 hover:underline" onClick={() => setShowCreate(true)}>
              + Create New Project Context
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function useContextSwitcherShortcut(onOpen: () => void) {
  useKeyboardShortcut("p", true, true, onOpen);
}
