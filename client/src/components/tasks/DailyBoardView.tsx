import { useState, useCallback } from "react";
import {
  DndContext, closestCorners, DragOverlay, useSensor, useSensors,
  PointerSensor, KeyboardSensor, DragStartEvent, DragEndEvent, DragOverEvent
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal, GripVertical, Circle, CheckCircle2, Clock, Flag, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type Task = {
  id: number;
  title: string;
  description: string | null;
  date: string;
  completionPercentage: number | null;
  priority: string | null;
  status: string | null;
  duration: string | null;
  flagged: boolean | null;
  boardColumn: string | null;
  executionScore: number | null;
  schedule: any;
};

const PRIORITY_COLOR: Record<string, string> = {
  ASAP: "bg-red-500/20 text-red-400 border-red-500/30",
  High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const STATUS_COLOR: Record<string, string> = {
  "To Do": "text-muted-foreground",
  "In Progress": "text-blue-400",
  "Done": "text-green-400",
};

const DEFAULT_COLUMNS = ["To Do", "In Progress", "Done", "Future"];

interface BoardCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

function BoardCard({ task, onClick, isDragging }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityStyle = task.priority ? PRIORITY_COLOR[task.priority] : null;
  const schedData = task.schedule as any;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: "rgba(255,255,255,0.03)" }}
      className={cn(
        "rounded-2xl border transition-all group cursor-pointer",
        "border-white/7 hover:border-white/15",
        isDragging ? "shadow-2xl scale-105" : "hover:shadow-lg"
      )}
      onClick={onClick}
      data-testid={`board-card-${task.id}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="px-3 pt-2.5 pb-0 flex items-start gap-2"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3 text-white/20 group-hover:text-white/40 mt-0.5 shrink-0 cursor-grab active:cursor-grabbing" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
        </div>
      </div>

      <div className="px-4 pb-3 pt-2 space-y-2">
        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
            <AlignLeft className="w-3 h-3 shrink-0" />
            {task.description}
          </p>
        )}

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.priority && priorityStyle && (
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-lg border", priorityStyle)}>
              {task.priority}
            </span>
          )}
          {task.flagged && (
            <span className="text-[10px] text-red-400 flex items-center gap-0.5">
              <Flag className="w-2.5 h-2.5" />
            </span>
          )}
          {task.duration && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{task.duration}
            </span>
          )}
          {schedData?.preset && (
            <span className="text-[10px] text-muted-foreground">📅 {schedData.preset}</span>
          )}
        </div>

        {/* Progress */}
        {(task.completionPercentage ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${task.completionPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">{task.completionPercentage}%</span>
          </div>
        )}

        {task.executionScore !== null && task.executionScore !== undefined && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            ⭐ Score: {task.executionScore}/10
          </div>
        )}
      </div>
    </div>
  );
}

interface BoardColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onAddTask: (column: string) => void;
  onTaskClick: (task: Task) => void;
  onRenameColumn: (oldName: string, newName: string) => void;
  onDeleteColumn: (name: string) => void;
  activeId: number | null;
}

function BoardColumn({ id, title, tasks, onAddTask, onTaskClick, onRenameColumn, onDeleteColumn, activeId }: BoardColumnProps) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(title);

  const statusColor = STATUS_COLOR[title];
  const completedCount = tasks.filter(t => t.status === "Done" || (t.completionPercentage ?? 0) === 100).length;

  return (
    <div
      className="flex flex-col rounded-2xl border border-white/7 min-h-[200px] w-[280px] shrink-0"
      style={{ background: "rgba(255,255,255,0.02)" }}
      data-testid={`board-column-${id}`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/7">
        <div className={cn("w-2 h-2 rounded-full shrink-0", title === "Done" ? "bg-green-500" : title === "In Progress" ? "bg-blue-500" : title === "Future" ? "bg-purple-500" : "bg-muted-foreground")} />
        {renaming ? (
          <Input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            className="h-6 text-sm bg-transparent border-b border-primary rounded-none px-0 focus-visible:ring-0 flex-1"
            onBlur={() => { if (newName.trim() && newName !== title) onRenameColumn(title, newName.trim()); setRenaming(false); }}
            onKeyDown={e => { if (e.key === "Enter") { if (newName.trim() && newName !== title) onRenameColumn(title, newName.trim()); setRenaming(false); } if (e.key === "Escape") { setNewName(title); setRenaming(false); } }}
          />
        ) : (
          <span className="text-sm font-semibold flex-1">{title}</span>
        )}
        <span className="text-xs text-muted-foreground bg-white/8 px-1.5 py-0.5 rounded-lg">{tasks.length}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-lg hover:bg-white/8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
            <DropdownMenuItem onClick={() => setRenaming(true)}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddTask(title)}>Add task here</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteColumn(title)} className="text-red-400 focus:text-red-400">Delete column</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto group">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <BoardCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              isDragging={activeId === task.id}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground/40 border border-dashed border-white/8 rounded-xl">
            No tasks
          </div>
        )}
      </div>

      {/* Add task button */}
      <button
        onClick={() => onAddTask(title)}
        className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border-t border-white/7 rounded-b-2xl"
        data-testid={`button-add-to-${id}`}
      >
        <Plus className="w-3.5 h-3.5" /> New Task
      </button>
    </div>
  );
}

interface DailyBoardViewProps {
  allTasks: Task[];
  currentDate: string;
  onTaskClick: (task: Task) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onCreateTask: (data: { title: string; date: string; boardColumn: string; status: string }) => void;
}

export function DailyBoardView({ allTasks, currentDate, onTaskClick, onUpdateTask, onCreateTask }: DailyBoardViewProps) {
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [newColName, setNewColName] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [quickAdd, setQuickAdd] = useState<{ col: string; title: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getTasksForColumn = (col: string) => {
    return allTasks.filter(t => {
      const taskCol = t.boardColumn || t.status || "To Do";
      return taskCol === col;
    });
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as number);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    const activeTask = allTasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id;
    if (typeof overId === "string" && columns.includes(overId)) {
      onUpdateTask(activeTask.id, { boardColumn: overId, status: overId === "Done" ? "Done" : overId === "In Progress" ? "In Progress" : "To Do" });
    } else if (typeof overId === "number") {
      const overTask = allTasks.find(t => t.id === overId);
      if (overTask && overTask.boardColumn !== activeTask.boardColumn) {
        const newCol = overTask.boardColumn || "To Do";
        onUpdateTask(activeTask.id, { boardColumn: newCol, status: newCol === "Done" ? "Done" : newCol === "In Progress" ? "In Progress" : "To Do" });
      }
    }
  };

  const handleAddTask = (col: string) => {
    setQuickAdd({ col, title: "" });
  };

  const submitQuickAdd = () => {
    if (!quickAdd?.title.trim()) { setQuickAdd(null); return; }
    onCreateTask({
      title: quickAdd.title.trim(),
      date: currentDate,
      boardColumn: quickAdd.col,
      status: quickAdd.col === "Done" ? "Done" : quickAdd.col === "In Progress" ? "In Progress" : "To Do",
    });
    setQuickAdd(null);
  };

  const handleRenameColumn = (oldName: string, newName: string) => {
    setColumns(prev => prev.map(c => c === oldName ? newName : c));
    allTasks.filter(t => (t.boardColumn || "To Do") === oldName).forEach(t => {
      onUpdateTask(t.id, { boardColumn: newName });
    });
  };

  const handleDeleteColumn = (name: string) => {
    if (DEFAULT_COLUMNS.includes(name) && columns.length <= DEFAULT_COLUMNS.length) return;
    setColumns(prev => prev.filter(c => c !== name));
    allTasks.filter(t => (t.boardColumn || "To Do") === name).forEach(t => {
      onUpdateTask(t.id, { boardColumn: "To Do" });
    });
  };

  const activeTask = activeId ? allTasks.find(t => t.id === activeId) : null;

  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {columns.map(col => (
            <BoardColumn
              key={col}
              id={col}
              title={col}
              tasks={getTasksForColumn(col)}
              onAddTask={handleAddTask}
              onTaskClick={onTaskClick}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              activeId={activeId}
            />
          ))}

          {/* Quick add task form for a specific column */}
          {quickAdd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setQuickAdd(null)}>
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 w-[320px] space-y-3" onClick={e => e.stopPropagation()}>
                <p className="text-sm font-semibold">Add to "{quickAdd.col}"</p>
                <Input
                  autoFocus
                  value={quickAdd.title}
                  onChange={e => setQuickAdd(q => q ? { ...q, title: e.target.value } : null)}
                  placeholder="Task title..."
                  className="bg-white/5 border-white/10"
                  onKeyDown={e => { if (e.key === "Enter") submitQuickAdd(); if (e.key === "Escape") setQuickAdd(null); }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitQuickAdd} className="flex-1">Add Task</Button>
                  <Button size="sm" variant="ghost" onClick={() => setQuickAdd(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {/* Add column */}
          {addingCol ? (
            <div className="flex flex-col gap-2 w-[280px] shrink-0 p-3 rounded-2xl border border-white/10 bg-white/2">
              <Input autoFocus value={newColName} onChange={e => setNewColName(e.target.value)}
                placeholder="Column name..."
                className="bg-white/5 border-white/10"
                onKeyDown={e => {
                  if (e.key === "Enter" && newColName.trim()) { setColumns(c => [...c, newColName.trim()]); setNewColName(""); setAddingCol(false); }
                  if (e.key === "Escape") { setNewColName(""); setAddingCol(false); }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8" onClick={() => {
                  if (newColName.trim()) { setColumns(c => [...c, newColName.trim()]); setNewColName(""); setAddingCol(false); }
                }}>Add</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setNewColName(""); setAddingCol(false); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className="w-[240px] shrink-0 h-12 rounded-2xl border border-dashed border-white/15 text-sm text-muted-foreground hover:border-white/30 hover:text-foreground transition-all flex items-center justify-center gap-2 self-start"
              data-testid="button-add-column"
            >
              <Plus className="w-4 h-4" /> New Group
            </button>
          )}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rounded-2xl border border-white/20 shadow-2xl p-4 w-[280px]" style={{ background: "rgba(30,32,40,0.98)" }}>
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
