import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarDays } from "lucide-react";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { KeyboardEvent } from "react";

const COLUMNS = ["Not Started", "In Progress", "In Review", "Completed"];

const COL_COLORS: Record<string, string> = {
  "Not Started": "bg-gray-500/20 text-gray-400",
  "In Progress": "bg-blue-500/20 text-blue-400",
  "In Review": "bg-yellow-500/20 text-yellow-400",
  "Completed": "bg-green-500/20 text-green-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

interface TeamTask {
  id: number;
  projectId: number;
  title: string;
  status: string;
  priority: string;
  assigneeId?: string;
  dueDate?: string;
  description?: string;
  startDate?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  tags?: string[];
}

interface WorkspaceMember {
  id: number;
  userId?: string;
  email: string;
  displayName?: string;
}

interface BoardViewProps {
  projectId: number;
  members: WorkspaceMember[];
}

function AddTaskInput({ status, projectId, onDone }: { status: string; projectId: number; onDone: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/team-tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", projectId] });
      setTitle("");
      onDone();
    },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && title.trim()) {
      mutation.mutate({ projectId, title: title.trim(), status });
    }
    if (e.key === "Escape") onDone();
  };

  return (
    <Input
      autoFocus
      placeholder="Task name, press Enter"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => { if (!title.trim()) onDone(); }}
      className="h-8 text-sm mt-2"
      data-testid={`input-add-card-${status.replace(/\s/g, "-")}`}
    />
  );
}

export function BoardView({ projectId, members }: BoardViewProps) {
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);

  const { data: tasks = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks", projectId],
    queryFn: () => fetch(`/api/team-tasks?projectId=${projectId}`).then((r) => r.json()),
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/team-tasks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", projectId] }),
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const taskId = parseInt(result.draggableId);
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      updateMutation.mutate({ id: taskId, status: newStatus });
    }
  };

  const initials = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const m = members.find((x) => x.userId === assigneeId || x.email === assigneeId);
    const name = m ? (m.displayName || m.email) : assigneeId;
    return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full" data-testid="board-view">
      <DragDropContext onDragEnd={onDragEnd}>
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="shrink-0 w-72 flex flex-col gap-2">
              {/* Column header */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COL_COLORS[col]}`}>{col}</span>
                  <span className="text-xs text-muted-foreground">{colTasks.length}</span>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setAddingIn(col)}
                  data-testid={`button-add-in-${col.replace(/\s/g, "-")}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Droppable droppableId={col}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col gap-2 min-h-[120px] rounded-lg p-2 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : "bg-muted/20"}`}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-card rounded-lg p-3 shadow-sm border border-border cursor-pointer hover:border-primary/40 transition-all ${snapshot.isDragging ? "shadow-lg rotate-1" : ""}`}
                            onClick={() => setSelectedTask(task)}
                            data-testid={`card-task-${task.id}`}
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${PRIORITY_COLORS[task.priority] ?? "bg-gray-400"}`} />
                              <p className="text-sm font-medium leading-snug">{task.title}</p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              {task.dueDate && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CalendarDays className="h-3 w-3" />
                                  {task.dueDate}
                                </div>
                              )}
                              {task.assigneeId && (
                                <Avatar className="h-6 w-6 ml-auto">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {initials(task.assigneeId)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {addingIn === col && (
                      <AddTaskInput status={col} projectId={projectId} onDone={() => setAddingIn(null)} />
                    )}

                    {addingIn !== col && (
                      <button
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 px-1"
                        onClick={() => setAddingIn(col)}
                        data-testid={`button-add-task-bottom-${col.replace(/\s/g, "-")}`}
                      >
                        <Plus className="h-3 w-3" />Add task
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>

      {selectedTask && (
        <TaskDetailPanel
          task={tasks.find((t) => t.id === selectedTask.id) ?? selectedTask}
          members={members}
          allTasks={tasks}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
