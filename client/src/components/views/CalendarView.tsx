import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";

const STATUS_DOT: Record<string, string> = {
  "Not Started": "bg-gray-400",
  "In Progress": "bg-blue-400",
  "In Review": "bg-yellow-400",
  "Completed": "bg-green-400",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

interface CalendarViewProps {
  projectId: number;
  members: WorkspaceMember[];
}

export function CalendarView({ projectId, members }: CalendarViewProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);

  const { data: tasks = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks", projectId],
    queryFn: () => fetch(`/api/team-tasks?projectId=${projectId}`).then((r) => r.json()),
    enabled: !!projectId,
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const tasksByDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.dueDate === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="p-4 h-full flex flex-col" data-testid="calendar-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {viewDate.toLocaleString("default", { month: "long" })} {year}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-xs text-center text-muted-foreground py-1 font-medium">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 border-t border-l border-border">
        {calendarDays.map((day, idx) => {
          const dayTasks = day ? tasksByDay(day) : [];
          return (
            <div
              key={idx}
              className={`border-r border-b border-border p-1 min-h-[90px] ${day ? "hover:bg-muted/20" : "bg-muted/10"}`}
            >
              {day && (
                <>
                  <span className={`text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-1 text-[11px] px-1 py-0.5 rounded hover:bg-primary/10 cursor-pointer truncate"
                        onClick={() => setSelectedTask(t)}
                        data-testid={`calendar-task-${t.id}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[t.status] ?? "bg-gray-400"}`} />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-1">+{dayTasks.length - 3} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

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
