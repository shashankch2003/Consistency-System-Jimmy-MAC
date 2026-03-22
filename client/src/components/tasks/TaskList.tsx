import { useState, KeyboardEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { useToast } from "@/hooks/use-toast";

interface TeamTask {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
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

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  "Not Started": "outline",
  "In Progress": "default",
  "On Hold": "secondary",
  "Completed": "secondary",
};

export function TaskList({ projectId, members }: { projectId: number; members: WorkspaceMember[] }) {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [addTitle, setAddTitle] = useState("");

  const { data: taskList = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks", projectId],
    queryFn: () => fetch(`/api/team-tasks?projectId=${projectId}`).then((r) => r.json()),
    enabled: !!projectId,
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest("PATCH", `/api/team-tasks/${id}`, { status: completed ? "Completed" : "Not Started" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", projectId] }),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/team-tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", projectId] });
      setAddTitle("");
    },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });

  const handleAddKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && addTitle.trim()) {
      createMutation.mutate({ projectId, title: addTitle.trim(), sortOrder: taskList.length });
    }
  };

  const memberDisplay = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const m = members.find((x) => x.userId === assigneeId || x.email === assigneeId);
    return m ? (m.displayName || m.email) : assigneeId;
  };

  const initials = (name?: string | null) => name ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <div className="space-y-1">
      {taskList.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 cursor-pointer group"
          onClick={() => setSelectedTask(task)}
          data-testid={`task-row-${task.id}`}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={task.status === "Completed"}
              onCheckedChange={(checked) => completeMutation.mutate({ id: task.id, completed: !!checked })}
              data-testid={`checkbox-task-${task.id}`}
            />
          </div>

          {/* Priority dot */}
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] ?? "bg-gray-400"}`}
            title={task.priority}
          />

          <span className={`flex-1 text-sm ${task.status === "Completed" ? "line-through text-muted-foreground" : ""}`} data-testid={`text-task-title-${task.id}`}>
            {task.title}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={STATUS_VARIANT[task.status] ?? "outline"} className="text-xs hidden group-hover:inline-flex" data-testid={`badge-task-status-${task.id}`}>
              {task.status}
            </Badge>
            {task.dueDate && (
              <span className="text-xs text-muted-foreground" data-testid={`text-task-due-${task.id}`}>{task.dueDate}</span>
            )}
            {task.assigneeId && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {initials(memberDisplay(task.assigneeId))}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      ))}

      {/* Add task row */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/20">
        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder="Add task…"
          data-testid="input-add-task"
          value={addTitle}
          onChange={(e) => setAddTitle(e.target.value)}
          onKeyDown={handleAddKeyDown}
        />
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={taskList.find((t) => t.id === selectedTask.id) ?? selectedTask}
          members={members}
          allTasks={taskList}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
