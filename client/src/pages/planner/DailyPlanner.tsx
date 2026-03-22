import { useState, useCallback, useEffect } from "react";
import { Calendar, RefreshCw, Plus, X } from "lucide-react";
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
import { generateDailyPlan, type PlanBlock } from "@/lib/planner/planGenerator";
import { useToast } from "@/hooks/use-toast";

type Priority = "MUST DO" | "Should Do" | "Nice to Do";
type BlockType = "task" | "break" | "comms" | "focus" | "lunch";

interface UIBlock {
  id: string;
  time: string;
  duration: string;
  icon: string;
  title: string;
  priority: Priority | null;
  energy: "High" | "Medium" | "Low" | null;
  type: BlockType;
  status: "pending" | "done" | "skipped" | "focus";
  linkedTaskId?: number;
  tier?: string;
}

const BORDER: Record<BlockType, string> = {
  task:  "border-blue-400",
  break: "border-gray-300",
  comms: "border-yellow-400",
  focus: "border-orange-400",
  lunch: "border-green-400",
};

const PRIORITY_STYLE: Record<string, string> = {
  "MUST DO":    "bg-red-100 text-red-700",
  "Should Do":  "bg-blue-100 text-blue-700",
  "Nice to Do": "bg-gray-100 text-gray-600",
};

const DEFAULT_BLOCKS: UIBlock[] = [
  { id: "b1", time: "9:00 AM",  duration: "30 min", icon: "💬", title: "Check messages & emails",  priority: null,           energy: "Low",    type: "comms",  status: "pending" },
  { id: "b2", time: "9:30 AM",  duration: "90 min", icon: "⚡", title: "Implement auth API",       priority: "MUST DO",      energy: "High",   type: "task",   status: "pending" },
  { id: "b3", time: "11:00 AM", duration: "15 min", icon: "☕", title: "Break",                    priority: null,           energy: null,     type: "break",  status: "pending" },
  { id: "b4", time: "11:15 AM", duration: "45 min", icon: "🎨", title: "Review mockups",           priority: "Should Do",    energy: "Medium", type: "task",   status: "pending" },
  { id: "b5", time: "12:00 PM", duration: "60 min", icon: "🍽️", title: "Lunch",                   priority: null,           energy: null,     type: "lunch",  status: "pending" },
  { id: "b6", time: "1:00 PM",  duration: "45 min", icon: "🔍", title: "Code review",              priority: "Should Do",    energy: "Medium", type: "task",   status: "pending" },
  { id: "b7", time: "1:45 PM",  duration: "60 min", icon: "🧪", title: "Unit tests",              priority: "Should Do",    energy: "High",   type: "focus",  status: "pending" },
  { id: "b8", time: "2:45 PM",  duration: "45 min", icon: "📝", title: "Update docs",             priority: "Nice to Do",   energy: "Low",    type: "task",   status: "pending" },
];

function planBlocksToUIBlocks(blocks: PlanBlock[]): UIBlock[] {
  return blocks.map((b) => ({
    id: b.id,
    time: b.startTime.replace(/^(\d{2}):(\d{2})$/, (_, h, m) => {
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${h12}:${m} ${ampm}`;
    }),
    duration: `${b.durationMinutes} min`,
    icon: b.icon,
    title: b.title,
    priority: (b.priority as Priority) ?? null,
    energy: (b.energyLevel as "High" | "Medium" | "Low" | null) ?? null,
    type: b.type as BlockType,
    status: "pending" as const,
    linkedTaskId: b.linkedTaskId,
    tier: b.tier,
  }));
}

interface ContextMenuState { blockId: string; x: number; y: number; }
interface RescheduleState { blockId: string; value: string; }

interface SortableBlockProps {
  block: UIBlock;
  onDone: (id: string) => void;
  onSkip: (id: string) => void;
  onFocus: (id: string) => void;
  onReschedule: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

function SortableBlock({ block, onDone, onSkip, onFocus, onReschedule, onContextMenu }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const isNonInteractive = block.type === "break" || block.type === "lunch";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm p-3 border-l-4 ${BORDER[block.type]} flex items-start gap-3 cursor-grab select-none ${
        block.status === "done" ? "opacity-60" : block.status === "skipped" ? "opacity-40" : ""
      }`}
      onContextMenu={(e) => onContextMenu(e, block.id)}
      {...attributes}
      {...listeners}
    >
      <div className="shrink-0 text-left min-w-[80px]">
        <div className="text-xs text-gray-400">{block.time}</div>
        <div className="text-xs text-gray-300">{block.duration}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{block.icon}</span>
          <span className={`font-medium text-sm ${block.status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}>
            {block.title}
          </span>
          {block.priority && (
            <span className={`text-xs rounded-full px-2 py-0.5 ${PRIORITY_STYLE[block.priority]}`}>
              {block.priority}
            </span>
          )}
          {block.energy && (
            <span className="text-xs text-gray-400">Energy: {block.energy}</span>
          )}
          {block.status === "done" && <span className="text-xs text-green-600 font-medium">✓ Done</span>}
          {block.status === "skipped" && <span className="text-xs text-gray-400">Skipped</span>}
          {block.status === "focus" && <span className="text-xs text-orange-600 font-medium animate-pulse">⏱ Focus Mode</span>}
        </div>
      </div>
      {!isNonInteractive && block.status === "pending" && (
        <div
          className="flex gap-1.5 shrink-0 flex-wrap justify-end"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-md px-2 py-1" onClick={() => onDone(block.id)}>Done</button>
          <button className="text-xs text-gray-400 border border-gray-200 rounded-md px-2 py-1" onClick={() => onSkip(block.id)}>Skip</button>
          <button className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-md px-2 py-1" onClick={() => onFocus(block.id)}>Start Focus</button>
          <button className="text-xs text-gray-400 border border-gray-200 rounded-md px-2 py-1" onClick={() => onReschedule(block.id)}>Reschedule</button>
        </div>
      )}
      {!isNonInteractive && block.status !== "pending" && (
        <div
          className="flex gap-1.5 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {block.status !== "done" && (
            <button className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-md px-2 py-1" onClick={() => onDone(block.id)}>Mark Done</button>
          )}
        </div>
      )}
    </div>
  );
}

function calcSummary(blocks: UIBlock[]) {
  const taskBlocks = blocks.filter((b) => b.type !== "break" && b.type !== "lunch" && b.type !== "comms");
  const mustDo = taskBlocks.filter((b) => b.priority === "MUST DO");
  const shouldDo = taskBlocks.filter((b) => b.priority === "Should Do");
  const niceToDo = taskBlocks.filter((b) => b.priority === "Nice to Do");

  const allBlocks = blocks;
  const totalMinutes = allBlocks.reduce((s, b) => {
    const m = parseInt(b.duration);
    return isNaN(m) ? s : s + m;
  }, 0);
  const completedMinutes = allBlocks
    .filter((b) => b.status === "done")
    .reduce((s, b) => { const m = parseInt(b.duration); return isNaN(m) ? s : s + m; }, 0);

  function fmt(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
  }

  return {
    mustDo: { done: mustDo.filter((b) => b.status === "done").length, total: mustDo.length },
    shouldDo: { done: shouldDo.filter((b) => b.status === "done").length, total: shouldDo.length },
    niceToDo: { done: niceToDo.filter((b) => b.status === "done").length, total: niceToDo.length },
    planned: fmt(totalMinutes),
    completed: fmt(completedMinutes),
    remaining: fmt(Math.max(0, totalMinutes - completedMinutes)),
  };
}

export default function DailyPlanner() {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<UIBlock[]>(DEFAULT_BLOCKS);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [reschedule, setReschedule] = useState<RescheduleState | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [focusTimers, setFocusTimers] = useState<Record<string, number>>({});
  const [regenerating, setRegenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!contextMenu) return;
    function close() { setContextMenu(null); }
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [contextMenu]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFocusTimers((prev) => {
        const next = { ...prev };
        for (const id in next) { next[id] = Math.max(0, next[id] - 1); }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((prev) => {
        const oldIdx = prev.findIndex((b) => b.id === active.id);
        const newIdx = prev.findIndex((b) => b.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  function handleDone(id: string) {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, status: "done" } : b));
    toast({ title: "Block completed!", description: "Great work!" });
  }

  function handleSkip(id: string) {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, status: "skipped" } : b));
  }

  function handleFocus(id: string) {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, status: "focus" } : b));
    setFocusTimers((prev) => ({ ...prev, [id]: 25 * 60 }));
    toast({ title: "Focus mode started!", description: "25 min timer running." });
  }

  function handleReschedule(id: string) {
    setReschedule({ blockId: id, value: "" });
  }

  function applyReschedule() {
    if (!reschedule?.value) { setReschedule(null); return; }
    setBlocks((prev) =>
      prev.map((b) => b.id === reschedule.blockId ? { ...b, time: reschedule.value, status: "pending" } : b)
    );
    setReschedule(null);
  }

  function handleContextMenu(e: React.MouseEvent, id: string) {
    e.preventDefault();
    setContextMenu({ blockId: id, x: e.clientX, y: e.clientY });
  }

  function handleMoveToTomorrow(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setContextMenu(null);
    toast({ description: "Block moved to tomorrow." });
  }

  function handleRemoveBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setContextMenu(null);
  }

  function handleChangeTime(id: string) {
    setContextMenu(null);
    handleReschedule(id);
  }

  function handleAddBlock() {
    if (!newBlockTitle.trim()) return;
    const newBlock: UIBlock = {
      id: crypto.randomUUID(),
      time: "5:00 PM",
      duration: "30 min",
      icon: "📋",
      title: newBlockTitle.trim(),
      priority: "Nice to Do",
      energy: "Low",
      type: "task",
      status: "pending",
    };
    setBlocks((prev) => [...prev, newBlock]);
    setNewBlockTitle("");
    setShowAddBlock(false);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    await new Promise((r) => setTimeout(r, 600));
    const plan = generateDailyPlan([]);
    const newBlocks = planBlocksToUIBlocks(plan.blocks);
    setBlocks(newBlocks);
    setRegenerating(false);
    toast({ title: "Plan regenerated!", description: plan.reasoning });
  }

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const summary = calcSummary(blocks);

  return (
    <div className="p-6 max-w-3xl mx-auto pb-20" onClick={() => setContextMenu(null)}>
      {contextMenu && (
        <div
          className="fixed z-[60] bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => handleMoveToTomorrow(contextMenu.blockId)}>
            Move to tomorrow
          </button>
          <button className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => handleChangeTime(contextMenu.blockId)}>
            Change time
          </button>
          <button className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50" onClick={() => handleRemoveBlock(contextMenu.blockId)}>
            Remove
          </button>
        </div>
      )}

      {reschedule && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-xs w-full mx-4">
            <h3 className="font-semibold text-gray-900 mb-3">Reschedule Block</h3>
            <input
              type="time"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={reschedule.value}
              onChange={(e) => setReschedule((p) => p ? { ...p, value: e.target.value } : null)}
            />
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md" onClick={() => setReschedule(null)}>Cancel</button>
              <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md" onClick={applyReschedule}>Apply</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold text-gray-900">My Day — {todayStr}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 text-gray-500 text-sm px-3 py-1.5 rounded-md hover:bg-gray-50 border border-gray-200"
            onClick={() => setShowAddBlock(true)}
          >
            <Plus className="w-4 h-4" />
            Add Block
          </button>
          <button
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-60"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
            Regenerate
          </button>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 text-sm italic text-blue-700 mb-5">
        "Deadline tomorrow, prioritized backend work in your peak productivity hours (9:30–11 AM). Energy-matched tasks assigned to post-lunch slot."
      </div>

      {showAddBlock && (
        <div className="bg-white rounded-lg border border-blue-300 p-3 mb-3 flex gap-2 items-center">
          <input
            className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Block title..."
            value={newBlockTitle}
            onChange={(e) => setNewBlockTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddBlock(); if (e.key === "Escape") setShowAddBlock(false); }}
            autoFocus
          />
          <button className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md" onClick={handleAddBlock}>Add</button>
          <button className="text-gray-400" onClick={() => setShowAddBlock(false)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onDone={handleDone}
                onSkip={handleSkip}
                onFocus={handleFocus}
                onReschedule={handleReschedule}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="text-sm text-gray-400 text-center mt-8">
          Click Regenerate to create today&apos;s plan.
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t p-3 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-6 text-sm flex-wrap">
          <div className="flex gap-4">
            <span className="text-gray-500">
              Must Do: <span className="font-semibold text-gray-900">{summary.mustDo.done}/{summary.mustDo.total}</span>
            </span>
            <span className="text-gray-500">
              Should Do: <span className="font-semibold text-gray-900">{summary.shouldDo.done}/{summary.shouldDo.total}</span>
            </span>
            <span className="text-gray-500">
              Nice: <span className="font-semibold text-gray-900">{summary.niceToDo.done}/{summary.niceToDo.total}</span>
            </span>
          </div>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex gap-4 text-gray-500">
            <span>Planned: <span className="font-semibold text-gray-800">{summary.planned}</span></span>
            <span>Completed: <span className="font-semibold text-gray-800">{summary.completed}</span></span>
            <span>Remaining: <span className="font-semibold text-gray-800">{summary.remaining}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
