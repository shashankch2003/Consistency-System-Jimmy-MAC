import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import {
  NotebookPen, Plus, Search, Star, FileText, MoreHorizontal, Heading1, Heading2, Heading3,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, List, ListOrdered,
  ChevronRight, Quote, Code, Image as ImageIcon, Minus, Undo, Redo, Sparkles, Download,
  Share2, History, Check, Loader2, PanelLeftOpen, X, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

const lowlight = createLowlight();

type NoteListItem = {
  id: number; title: string; emoji: string; coverColor: string;
  isFavorite: boolean; isArchived: boolean; sortOrder: number;
  lastEditedAt: string; createdAt: string;
};
type Note = NoteListItem & { content: string; isPublic: boolean; publicSlug: string | null; userId: string; };
type NoteVersion = { id: number; userId: string; noteId: number; title: string; content: string; createdAt: string; };

const coverColors = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6"];
const emojiOptions = ["📝", "📓", "📒", "📕", "📗", "📘", "📙", "📖", "📚", "✏️", "🖊️", "💡", "🎯", "📌", "📋", "📊", "🗂️", "💻", "🎓", "📐", "🧪", "🔬", "🏗️", "⚡"];

const slashCommands = [
  { label: "Heading 1", icon: Heading1, desc: "Large heading", action: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", icon: Heading2, desc: "Medium heading", action: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", icon: Heading3, desc: "Small heading", action: (editor: any) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Bullet List", icon: List, desc: "Unordered list", action: (editor: any) => editor.chain().focus().toggleBulletList().run() },
  { label: "Numbered List", icon: ListOrdered, desc: "Ordered list", action: (editor: any) => editor.chain().focus().toggleOrderedList().run() },
  { label: "Quote", icon: Quote, desc: "Block quote", action: (editor: any) => editor.chain().focus().toggleBlockquote().run() },
  { label: "Code Block", icon: Code, desc: "Code snippet", action: (editor: any) => editor.chain().focus().toggleCodeBlock().run() },
  { label: "Divider", icon: Minus, desc: "Horizontal rule", action: (editor: any) => editor.chain().focus().setHorizontalRule().run() },
];

function ToolbarBtn({ onClick, active, disabled, tooltip, children, testId }: { onClick: () => void; active?: boolean; disabled?: boolean; tooltip: string; children: React.ReactNode; testId?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          data-testid={testId}
          className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed ${active ? "bg-accent text-foreground" : "text-muted-foreground"}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent><p>{tooltip}</p></TooltipContent>
    </Tooltip>
  );
}

function ToolbarSep() {
  return <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />;
}

export default function LessonNotesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const [slashPos, setSlashPos] = useState<{ x: number; y: number } | null>(null);
  const [slashFrom, setSlashFrom] = useState<number | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCoverPopoverOpen, setIsCoverPopoverOpen] = useState(false);
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNoteIdRef = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const slashImageInputRef = useRef<HTMLInputElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  const { data: notes = [], isLoading: notesLoading } = useQuery<NoteListItem[]>({ queryKey: ["/api/lesson-notes"] });
  const { data: activeNote, isLoading: noteLoading } = useQuery<Note>({
    queryKey: ["/api/lesson-notes", selectedNoteId],
    queryFn: () => fetch(`/api/lesson-notes/${selectedNoteId}`).then(r => r.json()),
    enabled: !!selectedNoteId,
  });
  const { data: versions = [] } = useQuery<NoteVersion[]>({
    queryKey: ["/api/lesson-notes", selectedNoteId, "versions"],
    queryFn: () => fetch(`/api/lesson-notes/${selectedNoteId}/versions`).then(r => r.json()),
    enabled: !!selectedNoteId && isHistoryOpen,
  });

  const createNoteMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lesson-notes", {}),
    onSuccess: async (res) => {
      const note = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/lesson-notes"] });
      setSelectedNoteId(note.id);
      setLocalTitle("Untitled");
      setIsMobileSidebarOpen(false);
      setTimeout(() => titleInputRef.current?.focus(), 100);
    },
    onError: () => toast({ title: "Failed to create note.", variant: "destructive" }),
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      apiRequest("PATCH", `/api/lesson-notes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-notes"] });
      if (selectedNoteId) queryClient.invalidateQueries({ queryKey: ["/api/lesson-notes", selectedNoteId] });
    },
    onError: () => toast({ title: "Failed to save note. Your changes may be lost.", variant: "destructive" }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/lesson-notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-notes"] });
      setSelectedNoteId(null);
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: ({ noteId, versionId }: { noteId: number; versionId: number }) =>
      apiRequest("POST", `/api/lesson-notes/${noteId}/versions/${versionId}/restore`),
    onSuccess: async (res) => {
      const updated = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/lesson-notes"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/lesson-notes", selectedNoteId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/lesson-notes", selectedNoteId, "versions"] });
      setLocalTitle(updated.title);
      setIsHistoryOpen(false);
    },
  });

  const debouncedSave = useCallback((content: string) => {
    if (!selectedNoteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        await apiRequest("PATCH", `/api/lesson-notes/${selectedNoteId}`, { content });
        queryClient.invalidateQueries({ queryKey: ["/api/lesson-notes"] });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        toast({ title: "Failed to save note. Your changes may be lost.", variant: "destructive" });
        setSaveStatus("idle");
      }
    }, 1000);
  }, [selectedNoteId, queryClient, toast]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
      Placeholder.configure({ placeholder: 'Type "/" for commands, or just start writing...' }),
      Image.configure({ inline: false, allowBase64: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      Typography,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
        "data-testid": "lesson-notes-editor",
      },
    },
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML());
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashIdx = textBefore.lastIndexOf("/");
      if (slashIdx !== -1 && (slashIdx === 0 || textBefore[slashIdx - 1] === " " || textBefore[slashIdx - 1] === "\n")) {
        const filter = textBefore.slice(slashIdx + 1);
        if (!filter.includes(" ")) {
          setSlashFilter(filter);
          setSlashMenuOpen(true);
          setSlashMenuIndex(0);
          const domPos = editor.view.coordsAtPos($from.pos);
          setSlashPos({ x: domPos.left, y: domPos.bottom });
          setSlashFrom($from.pos - filter.length - 1);
          return;
        }
      }
      setSlashMenuOpen(false);
    },
  });

  useEffect(() => {
    if (!editor || !activeNote) return;
    if (currentNoteIdRef.current !== activeNote.id) {
      currentNoteIdRef.current = activeNote.id;
      editor.commands.setContent(activeNote.content || "");
      setLocalTitle(activeNote.title);
    }
  }, [editor, activeNote?.id]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setSlashMenuOpen(false);
      }
    };
    if (slashMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [slashMenuOpen]);

  const filteredSlashCommands = slashCommands.filter(c =>
    c.label.toLowerCase().includes(slashFilter.toLowerCase())
  );

  const executeSlashCommand = (cmd: typeof slashCommands[0]) => {
    if (!editor || slashFrom === null) return;
    const { state } = editor;
    const { $from } = state.selection;
    editor.chain().focus().deleteRange({ from: slashFrom, to: $from.pos }).run();
    if (cmd.label === "Image") {
      slashImageInputRef.current?.click();
    } else {
      cmd.action(editor);
    }
    setSlashMenuOpen(false);
    setSlashFilter("");
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (!slashMenuOpen) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSlashMenuIndex(i => Math.min(i + 1, filteredSlashCommands.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSlashMenuIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filteredSlashCommands.length > 0) { e.preventDefault(); executeSlashCommand(filteredSlashCommands[slashMenuIndex]); }
    if (e.key === "Escape") { setSlashMenuOpen(false); }
  };

  const handleImageUpload = async (file: File, onInsert: (url: string) => void) => {
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch("/api/lesson-notes/upload-image", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) onInsert(data.url);
      else toast({ title: "Failed to upload image. Please try a smaller file.", variant: "destructive" });
    } catch {
      toast({ title: "Failed to upload image. Please try a smaller file.", variant: "destructive" });
    }
  };

  const handleToolbarImageClick = () => imageInputRef.current?.click();

  const handleAiEnhance = async (action: string) => {
    if (!editor) return;
    const { state } = editor;
    const { from, to, empty } = state.selection;
    const selectedText = empty
      ? editor.getHTML().replace(/<[^>]+>/g, " ").trim()
      : state.doc.textBetween(from, to, " ").trim();
    if (!selectedText) return toast({ title: "Please select some text first.", variant: "destructive" });
    setIsAiProcessing(true);
    try {
      const res = await apiRequest("POST", "/api/lesson-notes/ai-enhance", { text: selectedText, action });
      const data = await res.json();
      if (data.result) {
        if (!empty) {
          editor.chain().focus().deleteRange({ from, to }).insertContent(data.result).run();
        } else {
          editor.chain().focus().clearContent().insertContent(data.result).run();
        }
      }
    } catch {
      toast({ title: "AI enhancement failed. Please try again.", variant: "destructive" });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleExport = async (format: "html" | "markdown") => {
    if (!selectedNoteId) return;
    try {
      const res = await fetch(`/api/lesson-notes/${selectedNoteId}/export?format=${format}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const note = notes.find(n => n.id === selectedNoteId);
      const filename = `${note?.title || "note"}.${format === "html" ? "html" : "md"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Failed to export note. Please try again.", variant: "destructive" });
    }
  };

  const handleTitleBlur = () => {
    if (!selectedNoteId || !localTitle.trim()) return;
    if (localTitle !== activeNote?.title) {
      updateNoteMutation.mutate({ id: selectedNoteId, title: localTitle.trim() });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleBlur();
      editor?.commands.focus();
    }
  };

  const handleDuplicate = async (note: NoteListItem) => {
    try {
      const createRes = await apiRequest("POST", "/api/lesson-notes", { title: note.title + " (Copy)", emoji: note.emoji, coverColor: note.coverColor });
      const created = await createRes.json();
      const fullRes = await fetch(`/api/lesson-notes/${note.id}`);
      const full = await fullRes.json();
      await apiRequest("PATCH", `/api/lesson-notes/${created.id}`, { content: full.content });
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-notes"] });
    } catch {
      toast({ title: "Failed to duplicate note.", variant: "destructive" });
    }
  };

  const filteredNotes = (notes as NoteListItem[]).filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const favoriteNotes = filteredNotes.filter(n => n.isFavorite);
  const allNotes = filteredNotes.filter(n => !n.isFavorite);

  const NoteItem = ({ note }: { note: NoteListItem }) => (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${selectedNoteId === note.id ? "bg-accent" : ""}`}
      data-testid={`lesson-notes-item-${note.id}`}
      onClick={() => { setSelectedNoteId(note.id); setIsMobileSidebarOpen(false); }}
    >
      <span className="text-base flex-shrink-0">{note.emoji}</span>
      <span className={`text-sm truncate flex-1 ${note.title === "Untitled" ? "text-muted-foreground italic" : ""}`}>
        {note.title}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
          <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted flex-shrink-0">
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => updateNoteMutation.mutate({ id: note.id, isFavorite: !note.isFavorite })}>
            <Star size={14} className="mr-2" />
            {note.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDuplicate(note)}>
            <Copy size={14} className="mr-2" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}>
                <X size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteNoteMutation.mutate(note.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 flex flex-col gap-2 border-b">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
            data-testid="lesson-notes-search"
          />
        </div>
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={() => createNoteMutation.mutate()}
          disabled={createNoteMutation.isPending}
          data-testid="lesson-notes-new-btn"
        >
          <Plus size={14} /> New Note
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {notesLoading ? (
            <div className="px-3 space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              {favoriteNotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <Star size={10} /> Favorites
                  </div>
                  {favoriteNotes.map(n => <NoteItem key={n.id} note={n} />)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <FileText size={10} /> All Notes
                </div>
                {allNotes.map(n => <NoteItem key={n.id} note={n} />)}
                {allNotes.length === 0 && favoriteNotes.length === 0 && (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">No notes yet</p>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="lesson-notes-count">
        <FileText size={12} /> {notes.length} {notes.length === 1 ? "note" : "notes"}
      </div>
    </div>
  );

  const publicUrl = activeNote?.publicSlug
    ? `${window.location.origin}/shared/note/${activeNote.publicSlug}`
    : "";

  return (
    <TooltipProvider>
      <div className="flex h-full w-full overflow-hidden relative">
        <div className="hidden md:flex w-[260px] flex-shrink-0 border-r flex-col h-full bg-background">
          <SidebarContent />
        </div>

        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="w-[280px] bg-background border-r flex flex-col h-full relative z-10 shadow-xl">
              <button className="absolute top-3 right-3 p-1 rounded hover:bg-accent" onClick={() => setIsMobileSidebarOpen(false)}>
                <X size={16} />
              </button>
              <SidebarContent />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setIsMobileSidebarOpen(false)} />
          </div>
        )}

        <button
          className="fixed bottom-4 left-4 z-50 md:hidden h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
          onClick={() => setIsMobileSidebarOpen(true)}
        >
          <PanelLeftOpen size={18} />
        </button>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {!selectedNoteId && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center" data-testid="lesson-notes-empty-state">
              <NotebookPen size={48} className="text-muted-foreground/40" />
              <h1 className="text-2xl font-bold">Lesson Notes</h1>
              <p className="text-muted-foreground text-center max-w-sm">
                Create a new note or select one from the sidebar to start writing.
              </p>
              <Button onClick={() => createNoteMutation.mutate()} disabled={createNoteMutation.isPending}>
                <Plus size={14} className="mr-2" /> Create New Note
              </Button>
            </div>
          )}

          {selectedNoteId && noteLoading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
          )}

          {selectedNoteId && !noteLoading && activeNote && (
            <div className="flex flex-col h-full overflow-hidden">
              <Popover open={isCoverPopoverOpen} onOpenChange={setIsCoverPopoverOpen}>
                <PopoverTrigger asChild>
                  <div
                    className="h-1.5 w-full cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: activeNote.coverColor }}
                    data-testid="lesson-notes-cover-bar"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex gap-2">
                    {coverColors.map(color => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${activeNote.coverColor === color ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: color }}
                        onClick={() => { updateNoteMutation.mutate({ id: activeNote.id, coverColor: color }); setIsCoverPopoverOpen(false); }}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="px-4 md:px-12 pt-8 pb-2 flex items-center gap-3">
                <Popover open={isEmojiPopoverOpen} onOpenChange={setIsEmojiPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="text-4xl hover:bg-accent rounded-lg p-1 transition-colors flex-shrink-0"
                      data-testid="lesson-notes-emoji-picker"
                    >
                      {activeNote.emoji}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <div className="grid grid-cols-6 gap-1">
                      {emojiOptions.map(emoji => (
                        <button
                          key={emoji}
                          className="text-xl p-1.5 rounded hover:bg-accent transition-colors"
                          onClick={() => { updateNoteMutation.mutate({ id: activeNote.id, emoji }); setIsEmojiPopoverOpen(false); }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <input
                  ref={titleInputRef}
                  value={localTitle}
                  onChange={e => setLocalTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  className="text-3xl md:text-4xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/40"
                  placeholder="Untitled"
                  data-testid="lesson-notes-title-input"
                />
              </div>

              <div className="px-4 md:px-12 py-2 border-b flex items-center gap-1 flex-wrap sticky top-0 bg-background z-10">
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} tooltip="Heading 1" testId="lesson-notes-toolbar-h1">
                  <Heading1 size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} tooltip="Heading 2" testId="lesson-notes-toolbar-h2">
                  <Heading2 size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} tooltip="Heading 3" testId="lesson-notes-toolbar-h3">
                  <Heading3 size={16} />
                </ToolbarBtn>
                <ToolbarSep />
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} tooltip="Bold" testId="lesson-notes-toolbar-bold">
                  <Bold size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} tooltip="Italic" testId="lesson-notes-toolbar-italic">
                  <Italic size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} tooltip="Underline" testId="lesson-notes-toolbar-underline">
                  <UnderlineIcon size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} tooltip="Strikethrough" testId="lesson-notes-toolbar-strike">
                  <Strikethrough size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive("highlight")} tooltip="Highlight" testId="lesson-notes-toolbar-highlight">
                  <Highlighter size={16} />
                </ToolbarBtn>
                <ToolbarSep />
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} tooltip="Bullet List" testId="lesson-notes-toolbar-bullet">
                  <List size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} tooltip="Numbered List" testId="lesson-notes-toolbar-numbered">
                  <ListOrdered size={16} />
                </ToolbarBtn>
                <ToolbarBtn
                  onClick={() => editor?.chain().focus().insertContent("<details><summary>Toggle heading</summary><p>Toggle content</p></details>").run()}
                  tooltip="Toggle Block"
                  testId="lesson-notes-toolbar-toggle"
                >
                  <ChevronRight size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} tooltip="Quote" testId="lesson-notes-toolbar-quote">
                  <Quote size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} tooltip="Code Block" testId="lesson-notes-toolbar-code">
                  <Code size={16} />
                </ToolbarBtn>
                <ToolbarSep />
                <ToolbarBtn onClick={handleToolbarImageClick} tooltip="Insert Image" testId="lesson-notes-toolbar-image">
                  <ImageIcon size={16} />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} tooltip="Horizontal Rule" testId="lesson-notes-toolbar-hr">
                  <Minus size={16} />
                </ToolbarBtn>
                <ToolbarSep />
                <ToolbarBtn
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo()}
                  tooltip="Undo"
                  testId="lesson-notes-toolbar-undo"
                >
                  <Undo size={16} />
                </ToolbarBtn>
                <ToolbarBtn
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={!editor?.can().redo()}
                  tooltip="Redo"
                  testId="lesson-notes-toolbar-redo"
                >
                  <Redo size={16} />
                </ToolbarBtn>
                <ToolbarSep />

                <div className="ml-auto flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-1 h-8 px-2 rounded-md text-sm hover:bg-accent text-muted-foreground transition-colors disabled:opacity-40"
                        disabled={isAiProcessing}
                        data-testid="lesson-notes-toolbar-ai"
                      >
                        {isAiProcessing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        <span>AI</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {[
                        { label: "Improve writing", action: "improve" },
                        { label: "Fix grammar", action: "fix-grammar" },
                        { label: "Make shorter", action: "make-shorter" },
                        { label: "Make longer", action: "make-longer" },
                        { label: "Summarize", action: "summarize" },
                        { label: "Explain simply", action: "explain" },
                      ].map(item => (
                        <DropdownMenuItem key={item.action} onClick={() => handleAiEnhance(item.action)}>
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground" data-testid="lesson-notes-toolbar-export">
                        <Download size={15} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport("html")}>Export as HTML</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("markdown")}>Export as Markdown</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Popover open={isShareOpen} onOpenChange={setIsShareOpen}>
                    <PopoverTrigger asChild>
                      <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground" data-testid="lesson-notes-toolbar-share">
                        <Share2 size={15} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Share publicly</label>
                          <Switch
                            checked={activeNote.isPublic}
                            onCheckedChange={val => updateNoteMutation.mutate({ id: activeNote.id, isPublic: val })}
                          />
                        </div>
                        {activeNote.isPublic && publicUrl && (
                          <div className="flex gap-2">
                            <Input value={publicUrl} readOnly className="text-xs h-8" />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 flex-shrink-0"
                              onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link copied!" }); }}
                            >
                              <Copy size={12} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
                    onClick={() => setIsHistoryOpen(true)}
                    data-testid="lesson-notes-toolbar-history"
                  >
                    <History size={15} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 relative">
                <div className="absolute top-3 right-4 md:right-12" data-testid="lesson-notes-save-status">
                  {saveStatus === "saving" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Saving...
                    </span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check size={10} /> Saved
                    </span>
                  )}
                </div>

                <div onKeyDown={handleEditorKeyDown} className="relative">
                  <EditorContent editor={editor} />

                  <AnimatePresence>
                    {slashMenuOpen && filteredSlashCommands.length > 0 && slashPos && (
                      <motion.div
                        ref={slashMenuRef}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        style={{ position: "fixed", left: slashPos.x, top: slashPos.y + 4 }}
                        className="bg-popover border rounded-lg shadow-lg p-1 w-72 z-50"
                        data-testid="lesson-notes-slash-menu"
                      >
                        {filteredSlashCommands.map((cmd, idx) => (
                          <button
                            key={cmd.label}
                            className={`flex items-center gap-3 w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors ${idx === slashMenuIndex ? "bg-accent" : "hover:bg-accent/50"}`}
                            onMouseEnter={() => setSlashMenuIndex(idx)}
                            onClick={() => executeSlashCommand(cmd)}
                          >
                            <div className="h-8 w-8 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                              <cmd.icon size={15} />
                            </div>
                            <div>
                              <div className="font-medium">{cmd.label}</div>
                              <div className="text-xs text-muted-foreground">{cmd.desc}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file && editor) handleImageUpload(file, url => editor.chain().focus().setImage({ src: url }).run());
            e.target.value = "";
          }}
        />
        <input
          ref={slashImageInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file && editor) handleImageUpload(file, url => editor.chain().focus().setImage({ src: url }).run());
            e.target.value = "";
          }}
        />

        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent side="right" className="w-[400px]">
            <SheetHeader>
              <SheetTitle>Version History</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)] mt-4">
              <div className="space-y-2 pr-2">
                {versions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No previous versions yet.</p>
                )}
                {versions.map(version => (
                  <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{version.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedNoteId) restoreVersionMutation.mutate({ noteId: selectedNoteId, versionId: version.id });
                      }}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
