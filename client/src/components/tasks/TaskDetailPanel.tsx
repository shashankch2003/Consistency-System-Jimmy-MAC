import { useState, useRef, KeyboardEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { TaskProperties } from "./TaskProperties";
import { SubtaskList } from "./SubtaskList";
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

interface TaskDetailPanelProps {
  task: TeamTask;
  members: WorkspaceMember[];
  allTasks: TeamTask[];
  onClose: () => void;
}

const STATUSES = ["Not Started", "In Progress", "On Hold", "Completed"];
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];

function minsToHM(mins: number | undefined) {
  if (!mins) return { h: "", m: "" };
  return { h: String(Math.floor(mins / 60)), m: String(mins % 60) };
}

function hmToMins(h: string, m: string) {
  return (parseInt(h || "0") * 60) + parseInt(m || "0");
}

export function TaskDetailPanel({ task, members, allTasks, onClose }: TaskDetailPanelProps) {
  const { toast } = useToast();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const { data: deps = [] } = useQuery<any[]>({
    queryKey: ["/api/task-dependencies", task.id],
    queryFn: () => fetch(`/api/task-dependencies?taskId=${task.id}`).then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: (data: object) => apiRequest("PATCH", `/api/team-tasks/${task.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", task.projectId] });
    },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const depMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/task-dependencies", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/task-dependencies", task.id] }),
  });

  const removeDep = useMutation({
    mutationFn: ({ taskId, dependsOnTaskId }: { taskId: number; dependsOnTaskId: number }) =>
      apiRequest("DELETE", "/api/task-dependencies", { taskId, dependsOnTaskId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/task-dependencies", task.id] }),
  });

  const saveTitle = () => {
    if (title.trim() && title !== task.title) updateMutation.mutate({ title: title.trim() });
    setEditingTitle(false);
  };

  const saveDescription = () => {
    if (description !== task.description) updateMutation.mutate({ description });
    setEditingDesc(false);
  };

  const addTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      const currentTags: string[] = (task.tags as string[]) || [];
      if (!currentTags.includes(tagInput.trim())) {
        updateMutation.mutate({ tags: [...currentTags, tagInput.trim()] });
      }
      setTagInput("");
    }
  };

  const removeTag = (t: string) => {
    const currentTags: string[] = (task.tags as string[]) || [];
    updateMutation.mutate({ tags: currentTags.filter((x) => x !== t) });
  };

  const estHM = minsToHM(task.estimatedMinutes);
  const actHM = minsToHM(task.actualMinutes);
  const [estH, setEstH] = useState(estHM.h);
  const [estM, setEstM] = useState(estHM.m);
  const [actH, setActH] = useState(actHM.h);
  const [actM, setActM] = useState(actHM.m);

  const memberDisplay = (assigneeId?: string) => {
    if (!assigneeId) return "Unassigned";
    const m = members.find((x) => x.userId === assigneeId || x.email === assigneeId);
    return m ? (m.displayName || m.email) : assigneeId;
  };

  const currentTags: string[] = (task.tags as string[]) || [];
  const depIds = deps.map((d: any) => d.dependsOnTaskId);

  return (
    <div
      className="fixed right-0 top-0 h-full w-[520px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
      style={{ animation: "slideInRight 250ms ease" }}
      data-testid="task-detail-panel"
    >
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div className="flex items-start gap-2 p-4 border-b border-border">
        <div className="flex-1">
          {editingTitle ? (
            <input
              ref={titleRef}
              className="w-full text-lg font-semibold bg-transparent border-b border-primary outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              autoFocus
              data-testid="input-task-title-edit"
            />
          ) : (
            <h2
              className="text-lg font-semibold cursor-text hover:text-primary/80"
              onClick={() => setEditingTitle(true)}
              data-testid="text-task-title"
            >
              {task.title}
            </h2>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-task-panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <div>
          {editingDesc ? (
            <textarea
              className="w-full text-sm bg-transparent border border-border rounded p-2 outline-none focus:border-primary min-h-[80px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              autoFocus
              placeholder="Add a description…"
              data-testid="input-task-description-edit"
            />
          ) : (
            <p
              className="text-sm text-muted-foreground cursor-text hover:text-foreground min-h-[32px]"
              onClick={() => setEditingDesc(true)}
              data-testid="text-task-description"
            >
              {description || <span className="italic">Add description…</span>}
            </p>
          )}
        </div>

        {/* Properties */}
        <div className="space-y-0">
          <TaskProperties label="Status">
            <Select value={task.status} onValueChange={(v) => updateMutation.mutate({ status: v })}>
              <SelectTrigger className="h-8 border-none shadow-none text-sm" data-testid="select-task-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </TaskProperties>

          <TaskProperties label="Assignee">
            <Select value={task.assigneeId || ""} onValueChange={(v) => updateMutation.mutate({ assigneeId: v || null })}>
              <SelectTrigger className="h-8 border-none shadow-none text-sm" data-testid="select-task-assignee">
                <SelectValue placeholder="Unassigned">{memberDisplay(task.assigneeId)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.userId || m.email}>
                    {m.displayName || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TaskProperties>

          <TaskProperties label="Priority">
            <Select value={task.priority} onValueChange={(v) => updateMutation.mutate({ priority: v })}>
              <SelectTrigger className="h-8 border-none shadow-none text-sm" data-testid="select-task-priority-panel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </TaskProperties>

          <TaskProperties label="Due Date">
            <input
              type="date"
              className="text-sm bg-transparent border-none outline-none cursor-pointer"
              value={task.dueDate || ""}
              onChange={(e) => updateMutation.mutate({ dueDate: e.target.value || null })}
              data-testid="input-task-due-date-panel"
            />
          </TaskProperties>

          <TaskProperties label="Start Date">
            <input
              type="date"
              className="text-sm bg-transparent border-none outline-none cursor-pointer"
              value={task.startDate || ""}
              onChange={(e) => updateMutation.mutate({ startDate: e.target.value || null })}
              data-testid="input-task-start-date-panel"
            />
          </TaskProperties>

          <TaskProperties label="Estimated Time">
            <div className="flex items-center gap-1 text-sm">
              <input
                type="number" min="0"
                className="w-12 bg-transparent border-b border-border outline-none text-center"
                value={estH}
                onChange={(e) => setEstH(e.target.value)}
                onBlur={() => updateMutation.mutate({ estimatedMinutes: hmToMins(estH, estM) || null })}
                placeholder="0"
                data-testid="input-task-est-hours-panel"
              />
              <span className="text-muted-foreground">h</span>
              <input
                type="number" min="0" max="59"
                className="w-12 bg-transparent border-b border-border outline-none text-center"
                value={estM}
                onChange={(e) => setEstM(e.target.value)}
                onBlur={() => updateMutation.mutate({ estimatedMinutes: hmToMins(estH, estM) || null })}
                placeholder="0"
                data-testid="input-task-est-mins-panel"
              />
              <span className="text-muted-foreground">m</span>
            </div>
          </TaskProperties>

          <TaskProperties label="Actual Time">
            <div className="flex items-center gap-1 text-sm">
              <input
                type="number" min="0"
                className="w-12 bg-transparent border-b border-border outline-none text-center"
                value={actH}
                onChange={(e) => setActH(e.target.value)}
                onBlur={() => updateMutation.mutate({ actualMinutes: hmToMins(actH, actM) || 0 })}
                placeholder="0"
                data-testid="input-task-act-hours-panel"
              />
              <span className="text-muted-foreground">h</span>
              <input
                type="number" min="0" max="59"
                className="w-12 bg-transparent border-b border-border outline-none text-center"
                value={actM}
                onChange={(e) => setActM(e.target.value)}
                onBlur={() => updateMutation.mutate({ actualMinutes: hmToMins(actH, actM) || 0 })}
                placeholder="0"
                data-testid="input-task-act-mins-panel"
              />
              <span className="text-muted-foreground">m</span>
            </div>
          </TaskProperties>

          <TaskProperties label="Tags">
            <div className="flex flex-wrap gap-1 items-center">
              {currentTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs cursor-pointer"
                  onClick={() => removeTag(t)}
                  data-testid={`tag-${t}`}
                >
                  {t} ×
                </span>
              ))}
              <input
                className="text-sm bg-transparent border-none outline-none min-w-[80px]"
                placeholder="Add tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                data-testid="input-task-tag-panel"
              />
            </div>
          </TaskProperties>

          <TaskProperties label="Dependencies">
            <div className="flex flex-wrap gap-1 items-center">
              {depIds.map((depId: number) => {
                const depTask = allTasks.find((t) => t.id === depId);
                return depTask ? (
                  <span
                    key={depId}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-muted text-xs cursor-pointer"
                    onClick={() => removeDep.mutate({ taskId: task.id, dependsOnTaskId: depId })}
                    data-testid={`dep-${depId}`}
                  >
                    {depTask.title} ×
                  </span>
                ) : null;
              })}
              <Select onValueChange={(v) => depMutation.mutate({ taskId: task.id, dependsOnTaskId: parseInt(v) })}>
                <SelectTrigger className="h-6 text-xs border-dashed w-28" data-testid="select-task-dependency">
                  <SelectValue placeholder="+ Add dep" />
                </SelectTrigger>
                <SelectContent>
                  {allTasks.filter((t) => t.id !== task.id && !depIds.includes(t.id)).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TaskProperties>
        </div>

        {/* Subtasks */}
        <div className="pt-2 border-t border-border">
          <SubtaskList taskId={task.id} />
        </div>

        {/* Activity placeholder */}
        <div className="pt-2 border-t border-border">
          <p className="text-sm font-medium mb-2">Activity</p>
          <p className="text-xs text-muted-foreground">Task created. Updates will appear here.</p>
        </div>
      </div>
    </div>
  );
}
