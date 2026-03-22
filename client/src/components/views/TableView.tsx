import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { ArrowUpDown } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "bg-red-500/20 text-red-400",
  High: "bg-orange-500/20 text-orange-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Low: "bg-green-500/20 text-green-400",
};

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "bg-gray-500/20 text-gray-400",
  "In Progress": "bg-blue-500/20 text-blue-400",
  "In Review": "bg-yellow-500/20 text-yellow-400",
  "Completed": "bg-green-500/20 text-green-400",
};

interface TeamTask {
  id: number;
  projectId: number;
  title: string;
  status: string;
  priority: string;
  assigneeId?: string;
  dueDate?: string;
  startDate?: string;
  description?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
}

interface WorkspaceMember {
  id: number;
  userId?: string;
  email: string;
  displayName?: string;
}

interface TableViewProps {
  projectId: number;
  members: WorkspaceMember[];
}

type SortKey = "title" | "status" | "priority" | "dueDate" | "assigneeId";

export function TableView({ projectId, members }: TableViewProps) {
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(true);

  const { data: tasks = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks", projectId],
    queryFn: () => fetch(`/api/team-tasks?projectId=${projectId}`).then((r) => r.json()),
    enabled: !!projectId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/team-tasks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", projectId] }),
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: number; priority: string }) =>
      apiRequest("PATCH", `/api/team-tasks/${id}`, { priority }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", projectId] }),
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...tasks].sort((a, b) => {
    const av = (a[sortKey] ?? "") as string;
    const bv = (b[sortKey] ?? "") as string;
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const getInitials = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const m = members.find((x) => x.userId === assigneeId || x.email === assigneeId);
    const name = m ? (m.displayName || m.email) : assigneeId;
    return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const ColHeader = ({ label, sk }: { label: string; sk: SortKey }) => (
    <th
      className="px-4 py-2 text-xs font-medium text-muted-foreground text-left cursor-pointer hover:text-foreground select-none"
      onClick={() => toggleSort(sk)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === sk ? "text-primary" : ""}`} />
      </span>
    </th>
  );

  return (
    <div className="p-4 overflow-auto h-full" data-testid="table-view">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <ColHeader label="Task" sk="title" />
            <ColHeader label="Status" sk="status" />
            <ColHeader label="Priority" sk="priority" />
            <ColHeader label="Assignee" sk="assigneeId" />
            <ColHeader label="Due Date" sk="dueDate" />
            <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-left">Est (min)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => (
            <tr
              key={task.id}
              className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
              onClick={() => setSelectedTask(task)}
              data-testid={`table-row-${task.id}`}
            >
              <td className="px-4 py-2.5 font-medium max-w-xs truncate">{task.title}</td>
              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                <Select value={task.status} onValueChange={(v) => statusMutation.mutate({ id: task.id, status: v })}>
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Not Started", "In Progress", "In Review", "Completed"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                <Select value={task.priority} onValueChange={(v) => priorityMutation.mutate({ id: task.id, priority: v })}>
                  <SelectTrigger className="h-7 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Urgent", "High", "Medium", "Low"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-2.5">
                {task.assigneeId ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(task.assigneeId)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{getInitials(task.assigneeId)}</span>
                  </div>
                ) : <span className="text-muted-foreground text-xs">—</span>}
              </td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{task.dueDate || "—"}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{task.estimatedMinutes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
