import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FUNDAMENTALS_LIST } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Circle, CheckCircle2, Save, Trophy, Plus, Trash2, PenLine, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import RichEditor from "@/components/rich-editor";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type FundamentalEntry = {
  id: number;
  userId: string;
  fundamentalKey: string;
  customTitle: string | null;
  content: string | null;
  completed: boolean;
  sortOrder: number | null;
  updatedAt: string | null;
  createdAt: string | null;
};

type FundamentalItem = {
  key: string;
  title: string;
  description: string;
  isCustom: boolean;
  entry?: FundamentalEntry;
};

function SortableCard({
  item,
  index,
  onSelect,
  onToggle,
  onDelete,
}: {
  item: FundamentalItem;
  index: number;
  onSelect: () => void;
  onToggle: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as any,
  };

  const isCompleted = item.entry?.completed || false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full bg-card/40 hover:bg-card/70 border border-border/50 hover:border-border rounded-xl p-4 flex items-center gap-3 transition-all duration-150 group",
        isDragging && "shadow-xl ring-2 ring-primary/30"
      )}
      data-testid={`fundamental-card-${item.key}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-white/10 transition-colors"
        data-testid={`drag-handle-${item.key}`}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground/50" />
      </div>

      <button
        onClick={onToggle}
        className="shrink-0 p-0.5 rounded-full transition-all hover:scale-110"
        data-testid={`toggle-complete-${item.key}`}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-6 h-6 text-green-400" />
        ) : (
          <Circle className="w-6 h-6 text-muted-foreground/40 hover:text-muted-foreground/70" />
        )}
      </button>

      <button
        className="flex-1 flex items-center gap-3 text-left min-w-0"
        onClick={onSelect}
        data-testid={`button-select-${item.key}`}
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-muted-foreground text-xs font-mono shrink-0">
          {item.isCustom ? <PenLine className="w-3.5 h-3.5" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold text-sm group-hover:text-white transition-colors",
            isCompleted && "line-through text-muted-foreground"
          )} data-testid={`text-fundamental-name-${item.key}`}>
            {item.title}
          </h3>
          <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{item.description}</p>
        </div>
      </button>

      {item.isCustom && onDelete && (
        <button
          onClick={onDelete}
          className="shrink-0 p-1.5 rounded-md text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
          data-testid={`button-delete-custom-${item.key}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function FundamentalsPage() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [newCustomTitle, setNewCustomTitle] = useState("");
  const { toast } = useToast();
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const { data: allEntries = [] } = useQuery<FundamentalEntry[]>({ queryKey: ["/api/fundamentals"] });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const orderedItems = useMemo((): FundamentalItem[] => {
    const entryMap = new Map(allEntries.map(e => [e.fundamentalKey, e]));
    const builtInItems: FundamentalItem[] = FUNDAMENTALS_LIST.map(f => ({
      key: f.key,
      title: f.title,
      description: f.description,
      isCustom: false,
      entry: entryMap.get(f.key),
    }));
    const customItems: FundamentalItem[] = allEntries
      .filter(e => e.fundamentalKey.startsWith("custom-"))
      .map(e => ({
        key: e.fundamentalKey,
        title: e.customTitle || "Untitled",
        description: "Your own fundamental — write anything that matters to your success.",
        isCustom: true,
        entry: e,
      }));
    const allItems = [...builtInItems, ...customItems];

    const hasSortOrder = allEntries.some(e => e.sortOrder !== null);
    if (hasSortOrder) {
      allItems.sort((a, b) => {
        const orderA = a.entry?.sortOrder;
        const orderB = b.entry?.sortOrder;
        if (orderA != null && orderB != null) return orderA - orderB;
        if (orderA != null) return -1;
        if (orderB != null) return 1;
        return 0;
      });
    }
    return allItems;
  }, [allEntries]);

  const createCustom = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/fundamentals/custom", { title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fundamentals"] });
      setNewCustomTitle("");
      toast({ title: "Added", description: "Your custom fundamental has been created." });
    },
  });

  const deleteCustom = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/fundamentals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fundamentals"] });
      toast({ title: "Deleted", description: "Custom fundamental removed." });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/fundamentals/${id}/toggle`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fundamentals"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedKeys: string[]) => {
      const res = await apiRequest("POST", "/api/fundamentals/reorder", { orderedKeys });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fundamentals"] });
    },
  });

  const { data: currentEntry, isLoading: isLoadingEntry } = useQuery<FundamentalEntry | null>({
    queryKey: ["/api/fundamentals", selectedKey],
    enabled: !!selectedKey,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, content }: { key: string; content: string }) => {
      const res = await apiRequest("PUT", `/api/fundamentals/${key}`, { content });
      return res.json();
    },
    onSuccess: () => {
      setHasUnsaved(false);
      queryClient.invalidateQueries({ queryKey: ["/api/fundamentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fundamentals", selectedKey] });
    },
  });

  useEffect(() => {
    if (currentEntry !== undefined && !isLoadingEntry) {
      setEditorContent(currentEntry?.content || "");
      setHasUnsaved(false);
    }
  }, [currentEntry, isLoadingEntry]);

  const handleContentChange = useCallback((content: string) => {
    setEditorContent(content);
    setHasUnsaved(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (selectedKey) {
        saveMutation.mutate({ key: selectedKey, content });
      }
    }, 2000);
  }, [selectedKey]);

  const handleManualSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (selectedKey) {
      saveMutation.mutate({ key: selectedKey, content: editorContent }, {
        onSuccess: () => {
          toast({ title: "Saved", description: "Your notes have been saved." });
        },
      });
    }
  };

  const handleBack = () => {
    if (hasUnsaved && selectedKey) {
      saveMutation.mutate({ key: selectedKey, content: editorContent });
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSelectedKey(null);
    setEditorContent("");
    setHasUnsaved(false);
  };

  const handleToggle = async (item: FundamentalItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (item.entry) {
        toggleMutation.mutate({ id: item.entry.id, completed: !item.entry.completed });
      } else {
        const res = await apiRequest("PUT", `/api/fundamentals/${item.key}`, { content: null });
        const created = await res.json();
        if (created?.id) {
          toggleMutation.mutate({ id: created.id, completed: true });
        }
      }
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.findIndex(item => item.key === active.id);
    const newIndex = orderedItems.findIndex(item => item.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(orderedItems, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map(item => item.key));
  };

  const completedCount = orderedItems.filter(item => item.entry?.completed).length;

  const selectedFundamental = FUNDAMENTALS_LIST.find(f => f.key === selectedKey);
  const selectedCustomEntry = selectedKey?.startsWith("custom-") ? allEntries.find(e => e.fundamentalKey === selectedKey) : null;
  const selectedTitle = selectedFundamental?.title || selectedCustomEntry?.customTitle || "Custom Fundamental";
  const selectedDescription = selectedFundamental?.description || "Your own fundamental — write anything that matters to your success.";

  if (selectedKey && (selectedFundamental || selectedCustomEntry)) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-4"
      >
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={handleBack} data-testid="button-back-fundamentals">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {hasUnsaved && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            {saveMutation.isPending && <span className="text-xs text-muted-foreground">Saving...</span>}
            {!hasUnsaved && !saveMutation.isPending && currentEntry?.content && <span className="text-xs text-green-400">Saved</span>}
            <Button variant="outline" className="gap-2" onClick={handleManualSave} disabled={!hasUnsaved || saveMutation.isPending} data-testid="button-save-fundamental">
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-fundamental-title">{selectedTitle}</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-fundamental-description">{selectedDescription}</p>
          {currentEntry?.updatedAt && (
            <p className="text-xs text-muted-foreground/60" data-testid="text-fundamental-updated">
              Last updated: {new Date(currentEntry.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        <div className="bg-card/50 border border-border rounded-xl p-4 min-h-[400px]" data-testid="fundamental-editor">
          {isLoadingEntry ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <RichEditor
              content={editorContent}
              onChange={handleContentChange}
            />
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-fundamentals-title">
          <Trophy className="w-7 h-7 text-amber-400" />
          Successful Fundamentals
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Deep clarity on business and personal success foundations. Drag to reorder, tap the circle to mark complete.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 bg-card/30 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / orderedItems.length) * 100}%` }}
            data-testid="progress-bar"
          />
        </div>
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap" data-testid="text-progress">
          {completedCount}/{orderedItems.length} completed
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedItems.map(i => i.key)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 gap-2" data-testid="fundamentals-list">
            {orderedItems.map((item, index) => (
              <SortableCard
                key={item.key}
                item={item}
                index={index}
                onSelect={() => setSelectedKey(item.key)}
                onToggle={(e) => handleToggle(item, e)}
                onDelete={item.isCustom && item.entry ? (e) => { e.stopPropagation(); deleteCustom.mutate(item.entry!.id); } : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="space-y-3 pt-4 border-t border-border/30">
        <div className="flex items-center gap-2">
          <PenLine className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold" data-testid="text-custom-fundamentals-title">Add Your Own Fundamental</h2>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newCustomTitle}
            onChange={(e) => setNewCustomTitle(e.target.value)}
            placeholder="e.g. My Morning Ritual, Content Strategy..."
            className="flex-1 bg-card/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-border"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCustomTitle.trim()) {
                createCustom.mutate(newCustomTitle.trim());
              }
            }}
            data-testid="input-custom-fundamental"
          />
          <Button
            onClick={() => newCustomTitle.trim() && createCustom.mutate(newCustomTitle.trim())}
            disabled={!newCustomTitle.trim() || createCustom.isPending}
            className="gap-2"
            data-testid="button-add-custom-fundamental"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
