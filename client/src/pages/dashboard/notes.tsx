import { useState, useEffect, useRef, useCallback } from "react";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/use-notes";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, FileText, ChevronRight, ChevronDown, MoreHorizontal, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import RichEditor from "@/components/rich-editor";

const EMOJI_OPTIONS = ["📄", "📝", "📋", "📌", "⭐", "🎯", "💡", "🔥", "📊", "🎨", "💼", "🏠", "📱", "🎬", "🎵", "📚", "🌟", "🚀", "💰", "🔑"];

type Note = {
  id: number;
  userId: string;
  parentId: number | null;
  title: string;
  content: string | null;
  icon: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function NoteTreeItem({
  note,
  allNotes,
  selectedId,
  expandedIds,
  toggleExpand,
  onSelect,
  onDelete,
  onAddChild,
  depth,
}: {
  note: Note;
  allNotes: Note[];
  selectedId: number | null;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onSelect: (id: number) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onAddChild: (parentId: number) => void;
  depth: number;
}) {
  const children = allNotes.filter(n => n.parentId === note.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(note.id);
  const isSelected = selectedId === note.id;

  return (
    <div data-testid={`note-tree-${note.id}`}>
      <div
        className={cn(
          "flex items-center h-8 cursor-pointer group transition-all duration-100 rounded-sm mx-1",
          isSelected
            ? "bg-white/10"
            : "hover:bg-white/[0.04]"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px`, paddingRight: "4px" }}
        onClick={() => onSelect(note.id)}
        data-testid={`note-item-${note.id}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(note.id);
          }}
          className={cn(
            "w-5 h-5 flex items-center justify-center shrink-0 rounded-sm hover:bg-white/10 transition-colors",
            !hasChildren && "opacity-0 pointer-events-none"
          )}
          data-testid={`button-toggle-note-${note.id}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-white/40" />
          ) : (
            <ChevronRight className="w-3 h-3 text-white/40" />
          )}
        </button>

        <span className="text-sm shrink-0 mr-1">{note.icon || "📄"}</span>
        <span className={cn(
          "text-[13px] truncate flex-1",
          isSelected ? "text-white" : "text-white/70"
        )}>
          {note.title || "Untitled"}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => onDelete(note.id, e)}
            className="w-5 h-5 flex items-center justify-center rounded-sm hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
            data-testid={`button-delete-note-${note.id}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(note.id);
            }}
            className="w-5 h-5 flex items-center justify-center rounded-sm hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            data-testid={`button-add-subnote-${note.id}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.map(child => (
            <NoteTreeItem
              key={child.id}
              note={child}
              allNotes={allNotes}
              selectedId={selectedId}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              onDelete={onDelete}
              onAddChild={onAddChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Breadcrumbs({
  noteId,
  allNotes,
  onNavigate,
}: {
  noteId: number;
  allNotes: Note[];
  onNavigate: (id: number) => void;
}) {
  const path: Note[] = [];
  let current = allNotes.find(n => n.id === noteId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? allNotes.find(n => n.id === current!.parentId) : undefined;
  }

  if (path.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 text-xs text-white/40 overflow-x-auto" data-testid="breadcrumbs">
      {path.map((note, i) => (
        <span key={note.id} className="flex items-center gap-1 shrink-0">
          {i > 0 && <span className="text-white/20">/</span>}
          <button
            onClick={() => onNavigate(note.id)}
            className={cn(
              "hover:text-white/70 transition-colors flex items-center gap-1 max-w-[120px]",
              i === path.length - 1 ? "text-white/60" : "text-white/40"
            )}
            data-testid={`breadcrumb-${note.id}`}
          >
            <span className="text-[11px]">{note.icon || "📄"}</span>
            <span className="truncate">{note.title || "Untitled"}</span>
          </button>
        </span>
      ))}
    </div>
  );
}

export default function NotesPage() {
  const { data: notes, isLoading } = useNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editIcon, setEditIcon] = useState("📄");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notesList = (notes as Note[]) || [];
  const rootNotes = notesList.filter(n => !n.parentId);
  const selectedNote = notesList.find(n => n.id === selectedId);

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content || "");
      setEditIcon(selectedNote.icon || "📄");
    }
  }, [selectedNote?.id]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const debouncedSave = useCallback((id: number, updates: { title?: string; content?: string; icon?: string }) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateNote.mutate({ id, ...updates });
    }, 800);
  }, [updateNote]);

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    if (selectedId) debouncedSave(selectedId, { title: value || "Untitled", content: editContent, icon: editIcon });
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    if (selectedId) debouncedSave(selectedId, { title: editTitle || "Untitled", content: value, icon: editIcon });
  };

  const handleIconChange = (icon: string) => {
    setEditIcon(icon);
    setShowIconPicker(false);
    if (selectedId) {
      updateNote.mutate({ id: selectedId, icon, title: editTitle || "Untitled", content: editContent });
    }
  };

  const handleAddPage = (parentId?: number) => {
    createNote.mutate(parentId ? { parentId } : {}, {
      onSuccess: (newNote: any) => {
        setSelectedId(newNote.id);
        setEditTitle(newNote.title);
        setEditContent(newNote.content || "");
        setEditIcon(newNote.icon || "📄");
        if (parentId) {
          setExpandedIds(prev => {
            const next = new Set(prev);
            next.add(parentId);
            return next;
          });
        }
      }
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedId === id) {
      const remaining = notesList.filter(n => n.id !== id && n.parentId !== id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
    deleteNote.mutate(id);
  };

  const handleSelectNote = (id: number) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      if (selectedId && selectedId !== id) {
        updateNote.mutate({ id: selectedId, title: editTitle || "Untitled", content: editContent, icon: editIcon });
      }
    }
    setSelectedId(id);
    const note = notesList.find(n => n.id === id);
    if (note?.parentId) {
      const ancestors: number[] = [];
      let cur = notesList.find(n => n.id === note.parentId);
      while (cur) {
        ancestors.push(cur.id);
        cur = cur.parentId ? notesList.find(n => n.id === cur!.parentId) : undefined;
      }
      if (ancestors.length > 0) {
        setExpandedIds(prev => {
          const next = new Set(prev);
          ancestors.forEach(a => next.add(a));
          return next;
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" data-testid="notes-page">
      <div
        className={cn(
          "border-r border-white/[0.06] bg-[#191919] flex flex-col shrink-0 transition-all duration-200 relative",
          sidebarOpen ? "w-60" : "w-0 border-r-0 overflow-hidden"
        )}
        data-testid="notes-sidebar"
      >
        <div className="flex items-center justify-between px-3 py-2 h-10">
          <span className="text-xs font-medium text-white/40 uppercase tracking-widest">Pages</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handleAddPage()}
              disabled={createNote.isPending}
              className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              data-testid="button-add-note"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              data-testid="button-close-notes-sidebar"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-0.5 notes-sidebar-scroll">
          {notesList.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/30 text-sm">
              <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No pages yet</p>
            </div>
          ) : (
            rootNotes.map(note => (
              <NoteTreeItem
                key={note.id}
                note={note}
                allNotes={notesList}
                selectedId={selectedId}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                onSelect={handleSelectNote}
                onDelete={handleDelete}
                onAddChild={(parentId) => handleAddPage(parentId)}
                depth={0}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative bg-[#111]">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-2 left-2 z-10 w-7 h-7 flex items-center justify-center rounded-sm hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            data-testid="button-open-notes-sidebar"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}

        {selectedNote ? (
          <div className="flex-1 overflow-y-auto">
            {selectedNote.parentId && (
              <div className={cn(!sidebarOpen && "pl-9")}>
                <Breadcrumbs
                  noteId={selectedNote.id}
                  allNotes={notesList}
                  onNavigate={handleSelectNote}
                />
              </div>
            )}
            <div className="max-w-3xl mx-auto px-10 py-10">
              <div className="flex items-start gap-3 mb-4">
                <div className="relative">
                  <button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="text-4xl hover:bg-white/5 rounded-lg p-1 transition-colors"
                    data-testid="button-note-icon"
                  >
                    {editIcon}
                  </button>
                  {showIconPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-[#252525] border border-white/10 rounded-xl p-3 shadow-xl z-20 grid grid-cols-5 gap-1 w-52" data-testid="icon-picker">
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleIconChange(emoji)}
                          className="text-xl p-2 hover:bg-white/10 rounded-lg transition-colors"
                          data-testid={`icon-option-${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <input
                    value={editTitle}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="Untitled"
                    className="w-full text-[2.5rem] leading-tight font-bold bg-transparent border-none outline-none placeholder:text-white/20 text-white"
                    data-testid="input-note-title"
                  />
                </div>
              </div>

              <RichEditor
                key={selectedId}
                content={editContent}
                onChange={handleContentChange}
                onAddPage={() => handleAddPage(selectedId!)}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white/30">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium mb-1 text-white/40">No page selected</p>
              <p className="text-sm mb-6 text-white/25">Select a page or create a new one</p>
              <Button
                onClick={() => handleAddPage()}
                disabled={createNote.isPending}
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-white/60"
                data-testid="button-add-first-note"
              >
                <Plus className="w-4 h-4 mr-2" />
                New page
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
