import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_COLORS: Record<string, string> = {
  "Not Started": "bg-gray-500",
  "In Progress": "bg-blue-500",
  "In Review": "bg-yellow-500",
  "Completed": "bg-green-500",
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

interface TimelineViewProps {
  projectId: number;
  members: WorkspaceMember[];
}

function getDatePosition(dateStr: string | undefined, startOfYear: Date, totalDays: number) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const diff = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);
  return Math.max(0, Math.min(100, (diff / totalDays) * 100));
}

export function TimelineView({ projectId, members }: TimelineViewProps) {
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const totalDays = 365;

  const { data: tasks = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks", projectId],
    queryFn: () => fetch(`/api/team-tasks?projectId=${projectId}`).then((r) => r.json()),
    enabled: !!projectId,
  });

  const withDates = tasks.filter((t) => t.startDate || t.dueDate);
  const withoutDates = tasks.filter((t) => !t.startDate && !t.dueDate);

  return (
    <div className="p-4 overflow-auto h-full" data-testid="timeline-view">
      {/* Month header */}
      <div className="flex mb-2 ml-48">
        {MONTH_LABELS.map((m) => (
          <div key={m} className="flex-1 text-xs text-center text-muted-foreground border-r border-border last:border-r-0">
            {m}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {withDates.map((task) => {
          const start = getDatePosition(task.startDate, startOfYear, totalDays);
          const end = getDatePosition(task.dueDate, startOfYear, totalDays);
          const barLeft = start ?? end ?? 0;
          const barWidth = start !== null && end !== null ? Math.max(2, end - start) : 2;

          return (
            <div key={task.id} className="flex items-center h-9 group" data-testid={`timeline-row-${task.id}`}>
              <div className="w-48 shrink-0 pr-3 text-sm truncate text-right text-muted-foreground group-hover:text-foreground">
                {task.title}
              </div>
              <div
                className="flex-1 relative h-7 bg-muted/20 rounded cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                {/* Grid lines */}
                {MONTH_LABELS.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-border/30"
                    style={{ left: `${((i + 1) / 12) * 100}%` }}
                  />
                ))}
                <div
                  className={`absolute top-1 bottom-1 rounded-full ${STATUS_COLORS[task.status] ?? "bg-gray-500"} opacity-80 hover:opacity-100 transition-opacity`}
                  style={{ left: `${barLeft}%`, width: `${barWidth}%`, minWidth: "8px" }}
                  title={`${task.title} (${task.startDate ?? "?"} → ${task.dueDate ?? "?"})`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {withoutDates.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-muted-foreground mb-2">Tasks without dates</p>
          <div className="space-y-1">
            {withoutDates.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-3 py-2 bg-muted/20 rounded hover:bg-muted/40 cursor-pointer text-sm"
                onClick={() => setSelectedTask(task)}
                data-testid={`timeline-no-date-${task.id}`}
              >
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[task.status] ?? "bg-gray-400"}`} />
                {task.title}
              </div>
            ))}
          </div>
        </div>
      )}

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
