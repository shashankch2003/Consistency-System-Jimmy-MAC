import { useState, useEffect, useRef, useCallback } from "react";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/use-notes";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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

  return (
    <div data-testid={`note-tree-${note.id}`}>
      <div
        className={cn(
          "flex items-center py-1.5 cursor-pointer group transition-colors",
          selectedId === note.id
            ? "bg-white/10 text-white"
            : "hover:bg-white/5 text-muted-foreground"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: "8px" }}
        onClick={() => onSelect(note.id)}
        data-testid={`note-item-${note.id}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(note.id);
          }}
          className={cn(
            "w-5 h-5 flex items-center justify-center shrink-0 rounded hover:bg-white/10 transition-colors mr-1",
            !hasChildren && "invisible"
          )}
          data-testid={`button-toggle-note-${note.id}`}
        >
          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-90")} />
        </button>

        <span className="text-sm shrink-0 mr-1.5">{note.icon || "📄"}</span>
        <span className="text-sm font-medium truncate flex-1">{note.title}</span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(note.id);
          }}
          className="opacity-0 group-hover:opacity-100 hover:bg-white/10 p-1 rounded shrink-0 transition-opacity"
          data-testid={`button-add-subnote-${note.id}`}
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => onDelete(note.id, e)}
          className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1 rounded shrink-0 transition-opacity"
          data-testid={`button-delete-note-${note.id}`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
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
      onSuccess: (newNote: Note) => {
        setSelectedId(newNote.id);
        setEditTitle(newNote.title);
        setEditContent(newNote.content || "");
        setEditIcon(newNote.icon || "📄");
        if (parentId) {
          setExpandedIds(prev => new Set([...prev, parentId]));
        }
        setTimeout(() => {}, 100);
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
      {sidebarOpen && (
        <div className="w-72 border-r border-border bg-card/50 flex flex-col shrink-0" data-testid="notes-sidebar">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Notes</h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => handleAddPage()}
              disabled={createNote.isPending}
              data-testid="button-add-note"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {notesList.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No pages yet</p>
                <p className="text-xs mt-1">Click + to add a page</p>
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
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-1.5 rounded bg-card border border-border hover:bg-white/10 transition-colors"
            data-testid="button-open-notes-sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {selectedNote ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-12">
              <div className="flex items-start gap-4 mb-6">
                {sidebarOpen && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 mt-2"
                    onClick={() => setSidebarOpen(false)}
                    data-testid="button-close-notes-sidebar"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="text-4xl hover:bg-white/5 rounded-lg p-2 transition-colors"
                    data-testid="button-note-icon"
                  >
                    {editIcon}
                  </button>
                  {showIconPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl p-3 shadow-xl z-20 grid grid-cols-5 gap-1 w-52" data-testid="icon-picker">
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
                <div className="flex-1 min-w-0">
                  <input
                    value={editTitle}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="Untitled"
                    className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
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
            <div className="text-center text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No page selected</p>
              <p className="text-sm mb-6">Select a page from the sidebar or create a new one</p>
              <Button onClick={() => handleAddPage()} disabled={createNote.isPending} data-testid="button-add-first-note">
                <Plus className="w-4 h-4 mr-2" />
                Add a page
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
