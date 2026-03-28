import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Plus, GripVertical, Trash2, ChevronRight,
  AlignLeft, Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Quote, Code, Image, Minus, Loader2, Smile,
  FileText, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useRef, useState, useEffect, useCallback, KeyboardEvent
} from "react";
import { cn } from "@/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type PmPage = {
  id: number;
  title: string;
  icon: string | null;
  coverImage: string | null;
  isFavorite: boolean;
  updatedAt: string;
};

type PmBlock = {
  id: number;
  type: string;
  content: Record<string, any>;
  sortOrder: number;
  parentBlockId: number | null;
};

const BLOCK_TYPES = [
  { type: "paragraph",     icon: AlignLeft,      label: "Text",          desc: "Just start writing with plain text" },
  { type: "heading1",      icon: Heading1,        label: "Heading 1",     desc: "Large section heading" },
  { type: "heading2",      icon: Heading2,        label: "Heading 2",     desc: "Medium section heading" },
  { type: "heading3",      icon: Heading3,        label: "Heading 3",     desc: "Small section heading" },
  { type: "bulletList",    icon: List,            label: "Bullet List",   desc: "Create a simple bullet list" },
  { type: "numberedList",  icon: ListOrdered,     label: "Numbered List", desc: "Create a numbered list" },
  { type: "todo",          icon: CheckSquare,     label: "To-Do",         desc: "Track tasks with a to-do list" },
  { type: "toggle",        icon: ChevronRight,    label: "Toggle",        desc: "Toggles can hide and show content" },
  { type: "quote",         icon: Quote,           label: "Quote",         desc: "Capture a quote" },
  { type: "code",          icon: Code,            label: "Code",          desc: "Write code with syntax highlighting" },
  { type: "divider",       icon: Minus,           label: "Divider",       desc: "Visually divide the page" },
  { type: "image",         icon: Image,           label: "Image",         desc: "Embed an image by URL" },
];

const EMOJIS = ["📝","📋","📌","🎯","💡","🔥","✅","🚀","⭐","💎","🎨","📊","🔧","💼","🌟","❤️","🎉","🏆","💪","🧠","📚","🌈","🎵","🍀","🦋","🌺","🎭","🏠","🌍","⚡"];

function SlashMenu({
  onSelect,
  onClose,
  style,
}: {
  onSelect: (type: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}) {
  const [search, setSearch] = useState("");
  const filtered = BLOCK_TYPES.filter(b =>
    b.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => onClose();
    setTimeout(() => document.addEventListener("click", handler), 50);
    return () => document.removeEventListener("click", handler);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 w-72 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
      style={style}
      onClick={e => e.stopPropagation()}
      data-testid="slash-menu"
    >
      <div className="p-2 border-b border-border">
        <Input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search blocks..."
          className="h-8 text-xs bg-transparent border-0 focus-visible:ring-0 px-2"
          data-testid="slash-menu-search"
        />
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {filtered.map(bt => (
          <button
            key={bt.type}
            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
            onClick={() => { onSelect(bt.type); onClose(); }}
            data-testid={`slash-option-${bt.type}`}
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <bt.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{bt.label}</p>
              <p className="text-xs text-muted-foreground truncate">{bt.desc}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No block types found</p>
        )}
      </div>
    </div>
  );
}

function BlockRenderer({
  block,
  onUpdate,
  onDelete,
  onAddBelow,
  index,
}: {
  block: PmBlock;
  onUpdate: (id: number, content: Record<string, any>, type?: string) => void;
  onDelete: (id: number) => void;
  onAddBelow: (afterBlock: PmBlock, type?: string) => void;
  index: number;
}) {
  const [slashMenu, setSlashMenu] = useState<{ x: number; y: number } | null>(null);
  const [plusMenu, setPlusMenu] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const text = (block.content as any)?.text || "";
  const checked = (block.content as any)?.checked || false;
  const isOpen = (block.content as any)?.isOpen || false;

  const handleInput = useCallback(() => {
    if (!contentRef.current) return;
    const val = contentRef.current.innerText;
    if (val.endsWith("/")) {
      const rect = contentRef.current.getBoundingClientRect();
      setSlashMenu({ x: rect.left, y: rect.bottom + 4 });
    } else {
      setSlashMenu(null);
    }
    onUpdate(block.id, { ...(block.content as any), text: val.replace(/\/$/, "") });
  }, [block.id, block.content, onUpdate]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAddBelow(block);
    }
    if (e.key === "Backspace" && contentRef.current?.innerText === "") {
      e.preventDefault();
      onDelete(block.id);
    }
    if (e.key === "Escape") setSlashMenu(null);
  };

  const baseInputProps = {
    ref: contentRef,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    className: "outline-none w-full min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40",
  };

  const renderContent = () => {
    switch (block.type) {
      case "heading1":
        return (
          <div
            {...baseInputProps}
            data-placeholder="Heading 1"
            className={cn(baseInputProps.className, "text-3xl font-bold")}
            dangerouslySetInnerHTML={undefined}
          >{text}</div>
        );
      case "heading2":
        return (
          <div
            {...baseInputProps}
            data-placeholder="Heading 2"
            className={cn(baseInputProps.className, "text-2xl font-bold")}
          >{text}</div>
        );
      case "heading3":
        return (
          <div
            {...baseInputProps}
            data-placeholder="Heading 3"
            className={cn(baseInputProps.className, "text-xl font-semibold")}
          >{text}</div>
        );
      case "bulletList":
        return (
          <div className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground/60 shrink-0" />
            <div {...baseInputProps} data-placeholder="List item">{text}</div>
          </div>
        );
      case "numberedList":
        return (
          <div className="flex items-start gap-2">
            <span className="text-sm text-muted-foreground shrink-0 mt-0.5">{index + 1}.</span>
            <div {...baseInputProps} data-placeholder="List item">{text}</div>
          </div>
        );
      case "todo":
        return (
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => onUpdate(block.id, { ...(block.content as any), checked: e.target.checked })}
              className="mt-1 cursor-pointer shrink-0"
            />
            <div {...baseInputProps} data-placeholder="To-do" className={cn(baseInputProps.className, checked && "line-through text-muted-foreground")}>{text}</div>
          </div>
        );
      case "toggle":
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdate(block.id, { ...(block.content as any), isOpen: !isOpen })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className={cn("w-4 h-4 transition-transform", isOpen && "rotate-90")} />
              </button>
              <div {...baseInputProps} data-placeholder="Toggle">{text}</div>
            </div>
            {isOpen && (
              <div className="ml-6 mt-1 text-muted-foreground text-sm pl-3 border-l border-border">
                {(block.content as any)?.children || "Toggle content..."}
              </div>
            )}
          </div>
        );
      case "quote":
        return (
          <div className="pl-4 border-l-4 border-primary/50">
            <div {...baseInputProps} data-placeholder="Quote" className={cn(baseInputProps.className, "italic text-muted-foreground")}>{text}</div>
          </div>
        );
      case "code":
        return (
          <div className="bg-muted rounded-lg p-4 font-mono">
            <div {...baseInputProps} data-placeholder="// Code here" className={cn(baseInputProps.className, "font-mono text-sm text-green-400 whitespace-pre")}>{text}</div>
          </div>
        );
      case "divider":
        return <hr className="border-border my-2" />;
      case "image":
        return (block.content as any)?.url ? (
          <div className="rounded-xl overflow-hidden">
            <img src={(block.content as any).url} alt={(block.content as any).caption || ""} className="w-full" />
            {(block.content as any).caption && (
              <p className="text-xs text-muted-foreground text-center mt-1">{(block.content as any).caption}</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
            <Image className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <Input
              placeholder="Paste image URL..."
              className="max-w-sm mx-auto text-xs"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  onUpdate(block.id, { ...(block.content as any), url: (e.target as HTMLInputElement).value });
                }
              }}
            />
          </div>
        );
      default:
        return (
          <div
            {...baseInputProps}
            data-placeholder="Type '/' for commands..."
          >{text}</div>
        );
    }
  };

  return (
    <div
      className="group/block relative flex items-start gap-1 py-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`block-${block.id}`}
    >
      <div className={cn("flex flex-col items-center gap-0.5 shrink-0 mt-1 transition-opacity", hovered ? "opacity-100" : "opacity-0")}>
        <button
          className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground p-0.5"
          title="Drag to reorder"
          data-testid={`block-drag-${block.id}`}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          className="text-muted-foreground/40 hover:text-muted-foreground p-0.5"
          onClick={e => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setPlusMenu({ x: rect.left, y: rect.bottom + 4 }); }}
          title="Add block below"
          data-testid={`block-add-${block.id}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 min-w-0 py-0.5 text-sm leading-relaxed">
        {renderContent()}
      </div>

      {hovered && (
        <button
          className="shrink-0 mt-1 text-muted-foreground/30 hover:text-red-400 transition-colors p-0.5"
          onClick={() => onDelete(block.id)}
          data-testid={`block-delete-${block.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {slashMenu && (
        <SlashMenu
          style={{ top: slashMenu.y, left: Math.min(slashMenu.x, window.innerWidth - 300) }}
          onSelect={type => { onUpdate(block.id, { text: "" }, type); }}
          onClose={() => setSlashMenu(null)}
        />
      )}
      {plusMenu && (
        <SlashMenu
          style={{ top: plusMenu.y, left: plusMenu.x }}
          onSelect={type => { onAddBelow(block, type); }}
          onClose={() => setPlusMenu(null)}
        />
      )}
    </div>
  );
}

export default function PmEditorPage() {
  const params = useParams<{ id: string }>();
  const pageId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);

  const { data: page, isLoading: pageLoading } = useQuery<PmPage>({
    queryKey: ["pm-pages", pageId],
    queryFn: () => fetch(`/api/pm-pages/${pageId}`).then(r => r.json()),
    enabled: !!pageId,
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery<PmBlock[]>({
    queryKey: ["pm-blocks", pageId],
    queryFn: () => fetch(`/api/pm-pages/${pageId}/blocks`).then(r => r.json()),
    enabled: !!pageId,
  });

  const updatePage = useMutation({
    mutationFn: (updates: Partial<PmPage>) =>
      apiRequest("PATCH", `/api/pm-pages/${pageId}`, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-pages", pageId] }),
  });

  const createBlock = useMutation({
    mutationFn: (data: { type: string; content?: any; sortOrder?: number }) =>
      apiRequest("POST", `/api/pm-pages/${pageId}/blocks`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-blocks", pageId] }),
  });

  const updateBlock = useMutation({
    mutationFn: ({ id, ...data }: { id: number; content?: any; type?: string; sortOrder?: number }) =>
      apiRequest("PATCH", `/api/pm-blocks/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-blocks", pageId] }),
  });

  const deleteBlock = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pm-blocks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-blocks", pageId] }),
  });

  const handleTitleBlur = () => {
    const newTitle = titleRef.current?.innerText?.trim() || "Untitled";
    if (newTitle !== page?.title) {
      updatePage.mutate({ title: newTitle });
    }
  };

  const handleUpdateBlock = useCallback((id: number, content: Record<string, any>, type?: string) => {
    updateBlock.mutate({ id, content, ...(type ? { type } : {}) });
  }, [updateBlock]);

  const handleDeleteBlock = useCallback((id: number) => {
    deleteBlock.mutate(id);
  }, [deleteBlock]);

  const handleAddBelow = useCallback((afterBlock: PmBlock, type = "paragraph") => {
    const sortedBlocks = [...(blocks || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const afterIndex = sortedBlocks.findIndex(b => b.id === afterBlock.id);
    const nextBlock = sortedBlocks[afterIndex + 1];
    const newOrder = nextBlock
      ? (afterBlock.sortOrder + nextBlock.sortOrder) / 2
      : afterBlock.sortOrder + 1;
    createBlock.mutate({ type, content: type === "divider" ? {} : { text: "" }, sortOrder: newOrder });
  }, [blocks, createBlock]);

  const sortedBlocks = [...(blocks || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <FileText className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-muted-foreground">Page not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/pm-workspace")}>
          Back to Workspace
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" data-testid="pm-editor-page">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50 px-4 sm:px-6 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => navigate("/dashboard/pm-workspace")}
          data-testid="button-back-workspace"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {page.icon && <span className="text-base shrink-0">{page.icon}</span>}
          <span className="text-sm font-medium text-muted-foreground truncate">{page.title || "Untitled"}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => updatePage.mutate({ isFavorite: !page.isFavorite })}
          data-testid="button-toggle-favorite"
        >
          <Star className={cn("w-4 h-4", page.isFavorite && "fill-yellow-400 text-yellow-400")} />
        </Button>
      </div>

      {page.coverImage && (
        <div className="relative group/cover h-[200px] w-full bg-cover bg-center" style={{ backgroundImage: `url(${page.coverImage})` }}>
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-end justify-end gap-2 p-4">
            <Button size="sm" variant="secondary" className="text-xs" onClick={() => updatePage.mutate({ coverImage: "" })}>
              Remove Cover
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-[720px] mx-auto px-6 sm:px-8 pt-12">
        <div className="group/header mb-8">
          <div className="flex items-center gap-3 mb-4">
            {page.icon ? (
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <button
                    className="text-5xl leading-none hover:opacity-80 transition-opacity"
                    data-testid="button-page-icon"
                  >
                    {page.icon}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="grid grid-cols-8 gap-1.5">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        className="text-xl hover:bg-accent rounded p-1 transition-colors"
                        onClick={() => { updatePage.mutate({ icon: emoji }); setShowEmojiPicker(false); }}
                        data-testid={`emoji-${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground" onClick={() => { updatePage.mutate({ icon: "" }); setShowEmojiPicker(false); }}>
                    Remove Icon
                  </Button>
                </PopoverContent>
              </Popover>
            ) : (
              <button
                className="opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground"
                onClick={() => { updatePage.mutate({ icon: "📝" }); }}
                data-testid="button-add-icon"
              >
                <Smile className="w-4 h-4" />
                Add Icon
              </button>
            )}

            {!page.coverImage && (
              <button
                className="opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground"
                onClick={() => {
                  const url = prompt("Enter cover image URL:");
                  if (url) updatePage.mutate({ coverImage: url });
                }}
                data-testid="button-add-cover"
              >
                <Image className="w-4 h-4" />
                Add Cover
              </button>
            )}
          </div>

          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleTitleBlur}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
            className="text-4xl font-bold outline-none leading-tight empty:before:content-['Untitled'] empty:before:text-muted-foreground/30 w-full"
            data-testid="page-title-input"
          >
            {page.title}
          </div>
        </div>

        <div className="space-y-0.5" data-testid="blocks-container">
          {blocksLoading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading content...</span>
            </div>
          ) : sortedBlocks.length === 0 ? (
            <div
              className="py-4 text-muted-foreground/40 text-sm cursor-text"
              onClick={() => createBlock.mutate({ type: "paragraph", content: { text: "" }, sortOrder: 0 })}
              data-testid="empty-editor-area"
            >
              Click here or type '/' for commands...
            </div>
          ) : (
            sortedBlocks.map((block, index) => (
              <BlockRenderer
                key={block.id}
                block={block}
                index={index}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
                onAddBelow={handleAddBelow}
              />
            ))
          )}
        </div>

        {sortedBlocks.length > 0 && (
          <button
            className="mt-6 flex items-center gap-2 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors py-2"
            onClick={() => createBlock.mutate({ type: "paragraph", content: { text: "" }, sortOrder: (sortedBlocks[sortedBlocks.length - 1]?.sortOrder ?? 0) + 1 })}
            data-testid="button-add-block-end"
          >
            <Plus className="w-3.5 h-3.5" />
            Add a block
          </button>
        )}
      </div>
    </div>
  );
}
