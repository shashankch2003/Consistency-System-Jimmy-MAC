import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, Plus } from "lucide-react";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { Input } from "@/components/ui/input";

const STATUS_ORDER = ["Not Started", "In Progress", "In Review", "Completed"];

const PRIORITY_BADGE: Record<string, string> = {
  Urgent: "bg-red-500/20 text-red-400",
  High: "bg-orange-500/20 text-orange-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Low: "bg-green-500/20 text-green-400",
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
}

interface WorkspaceMember {
  id: number;
  userId?: string;
  email: string;
  displayName?: string;
}

interface ListViewProps {
  projectId: number;
  members: WorkspaceMember[];
}

function StatusGroup({ status, tasks, members, projectId, onSelect }: {
  status: string;
  tasks: TeamTask[];
  members: WorkspaceMember[];
  projectId: number;
  onSelect: (t: TeamTask) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/team-tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", projectId] });
      setNewTitle("");
      setAdding(false);
    },
  });

  const checkMutation = useMutation({
    mutationFn: ({ id, checked }: { id: number; checked: boolean }) =>
      apiRequest("PATCH", `/api/team-tasks/${id}`, { status: checked ? "Completed" : "Not Started" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", projectId] }),
  });

  const getInitials = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const m = members.find((x) => x.userId === assigneeId || x.email === assigneeId);
    const name = m ? (m.displayName || m.email) : assigneeId;
    return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="mb-4" data-testid={`list-group-${status.replace(/\s/g, "-")}`}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30 rounded-lg"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`} />
        <span className="text-sm font-semibold">{status}</span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      {expanded && (
        <div className="mt-1">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] text-xs text-muted-foreground px-8 py-1 border-b border-border gap-4">
            <div></div>
            <div>Task</div>
            <div>Priority</div>
            <div>Assignee</div>
            <div>Due</div>
          </div>

          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-8 py-2.5 hover:bg-muted/30 cursor-pointer border-b border-border/30 text-sm"
              onClick={() => onSelect(task)}
              data-testid={`row-task-${task.id}`}
            >
              <Checkbox
                checked={task.status === "Completed"}
                onCheckedChange={(checked) => {
                  checkMutation.mutate({ id: task.id, checked: !!checked });
                }}
                onClick={(e) => e.stopPropagation()}
                data-testid={`checkbox-task-${task.id}`}
              />
              <span className={task.status === "Completed" ? "line-through text-muted-foreground" : ""}>{task.title}</span>
              <Badge className={`text-xs ${PRIORITY_BADGE[task.priority] ?? ""}`} variant="outline">
                {task.priority}
              </Badge>
              {task.assigneeId ? (
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(task.assigneeId)}</AvatarFallback>
                </Avatar>
              ) : <div className="h-6 w-6" />}
              <span className="text-xs text-muted-foreground">{task.dueDate || "—"}</span>
            </div>
          ))}

          {adding ? (
            <div className="px-8 py-2">
              <Input
                autoFocus
                placeholder="Task name, press Enter"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTitle.trim()) mutation.mutate({ projectId, title: newTitle.trim(), status });
                  if (e.key === "Escape") setAdding(false);
                }}
                onBlur={() => { if (!newTitle.trim()) setAdding(false); }}
                className="h-8 text-sm"
                data-testid={`input-add-list-${status.replace(/\s/g, "-")}`}
              />
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-8 py-2"
              onClick={() => setAdding(true)}
              data-testid={`button-add-list-${status.replace(/\s/g, "-")}`}
            >
              <Plus className="h-3.5 w-3.5" />Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ListView({ projectId, members }: ListViewProps) {
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);

  const { data: tasks = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks", projectId],
    queryFn: () => fetch(`/api/team-tasks?projectId=${projectId}`).then((r) => r.json()),
    enabled: !!projectId,
  });

  return (
    <div className="p-4 overflow-auto h-full" data-testid="list-view">
      {STATUS_ORDER.map((status) => (
        <StatusGroup
          key={status}
          status={status}
          tasks={tasks.filter((t) => t.status === status)}
          members={members}
          projectId={projectId}
          onSelect={setSelectedTask}
        />
      ))}

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
