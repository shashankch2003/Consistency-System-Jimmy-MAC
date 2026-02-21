import { useState, useRef } from "react";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getDay, addMonths, subMonths, isSameDay, isToday } from "date-fns";
import { useTasks, useTasksByMonth, useTasksByYear, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Plus, Trash2, BarChart3, Calendar, TrendingUp, Clock, AlertTriangle, AlertCircle, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const COMPLETION_LEVELS = [0, 25, 50, 75, 100];
const PRIORITIES = ["Very Important", "Important", "Normal"] as const;

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "Very Important") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded" data-testid="badge-priority-vi">
      <AlertTriangle className="w-2.5 h-2.5" />VI
    </span>
  );
  if (priority === "Important") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded" data-testid="badge-priority-imp">
      <AlertCircle className="w-2.5 h-2.5" />IMP
    </span>
  );
  return null;
}

function ProgressDot({ active, level, onClick, testId }: { active: boolean; level: number; onClick: () => void; testId?: string }) {
  const colors: Record<number, string> = {
    0: "border-zinc-500 bg-zinc-500",
    25: "border-red-500 bg-red-500",
    50: "border-yellow-500 bg-yellow-500",
    75: "border-emerald-500 bg-emerald-500",
    100: "border-green-500 bg-green-500",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-5 h-5 rounded-full border-2 transition-colors duration-200",
        active ? colors[level] : "border-muted-foreground/30 bg-transparent hover:border-muted-foreground/60"
      )}
      data-testid={testId || `dot-completion-${level}`}
    />
  );
}

function TimeInput({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9:]/g, "");
    if (v.length === 2 && !v.includes(":")) {
      const hrs = parseInt(v);
      if (hrs >= 0 && hrs <= 23) v = v + ":";
    }
    if (v.length > 5) v = v.slice(0, 5);
    onChange(v);
  };

  const isValid = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);

  return (
    <div className="relative">
      <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="HH:MM"
        maxLength={5}
        className={cn(
          "flex rounded-md border bg-background px-2 py-1.5 pl-7 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-[90px]",
          value && !isValid ? "border-red-500/50" : "border-input"
        )}
        data-testid={testId}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          data-testid={`${testId}-clear`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function DescriptionDialog({ task, onSave, onClose }: {
  task: { id: number; title: string; description: string | null };
  onSave: (desc: string) => void;
  onClose: () => void;
}) {
  const [desc, setDesc] = useState(task.description || "");

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]" data-testid="dialog-description">
        <DialogHeader>
          <DialogTitle className="text-lg" data-testid="text-dialog-task-title">{task.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">Add notes, details, or instructions for this task</p>
        </DialogHeader>
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Write your description here..."
          className="min-h-[250px] resize-y text-sm"
          data-testid="textarea-description"
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} data-testid="button-cancel-description">Cancel</Button>
          <Button onClick={() => { onSave(desc); onClose(); }} data-testid="button-save-description">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color = value === 0 ? "bg-zinc-500" : value <= 25 ? "bg-red-500" : value <= 50 ? "bg-yellow-500" : value <= 75 ? "bg-emerald-500" : "bg-green-500";
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function TasksPage() {
  const [date, setDate] = useState(new Date());
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("Normal");
  const [descTask, setDescTask] = useState<{ id: number; title: string; description: string | null } | null>(null);
  const [analyticsMonth, setAnalyticsMonth] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const analyticsMonthStr = format(analyticsMonth, "yyyy-MM");

  const [calMonth, setCalMonth] = useState(new Date());
  const calMonthStr = format(calMonth, "yyyy-MM");

  const { data: tasks, isLoading } = useTasks(dateStr);
  const { data: monthTasks } = useTasksByMonth(analyticsMonthStr);
  const { data: calMonthTasks } = useTasksByMonth(calMonthStr);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    createTask.mutate({
      title: newTaskTitle.trim(),
      date: dateStr,
      completionPercentage: 0,
      ...(newTaskTime ? { time: newTaskTime } : {}),
      priority: newTaskPriority,
    }, {
      onSuccess: () => {
        setNewTaskTitle("");
        setNewTaskTime("");
        setNewTaskPriority("Normal");
      },
    });
  };

  const averageCompletion = tasks?.length
    ? Math.round(tasks.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / tasks.length)
    : 0;

  const monthStart = startOfMonth(analyticsMonth);
  const monthEnd = endOfMonth(analyticsMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dailyData = daysInMonth.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTasks = monthTasks?.filter(t => t.date === dayStr) || [];
    const avg = dayTasks.length > 0
      ? Math.round(dayTasks.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / dayTasks.length)
      : 0;
    return {
      day: format(day, "d"),
      date: dayStr,
      avg,
      taskCount: dayTasks.length,
      fullDate: format(day, "MMM d"),
    };
  });

  const weeklyData: { week: string; avg: number; taskCount: number; days: number }[] = [];
  for (let i = 0; i < daysInMonth.length; i += 7) {
    const chunk = daysInMonth.slice(i, i + 7);
    let total = 0, count = 0, taskCount = 0;
    chunk.forEach(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayTasks = monthTasks?.filter(t => t.date === dayStr) || [];
      dayTasks.forEach(t => {
        total += (t.completionPercentage || 0);
        count += 1;
      });
      taskCount += dayTasks.length;
    });
    weeklyData.push({
      week: `Week ${Math.floor(i / 7) + 1}`,
      avg: count > 0 ? Math.round(total / count) : 0,
      taskCount,
      days: chunk.length,
    });
  }

  const currentYear = getYear(analyticsMonth);
  const { data: yearTasks } = useTasksByYear(currentYear);

  const monthlyTrend = MONTHS.map((name, i) => {
    const monthPrefix = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
    const mTasks = yearTasks?.filter(t => t.date.startsWith(monthPrefix)) || [];
    const avg = mTasks.length > 0
      ? Math.round(mTasks.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / mTasks.length)
      : 0;
    return {
      month: name.substring(0, 3),
      avg,
      taskCount: mTasks.length,
    };
  });

  const tooltipStyle = {
    contentStyle: { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" },
    labelStyle: { color: "hsl(var(--foreground))" },
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto" style={{ height: "calc(100vh - 4rem)" }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">Daily Tasks</h1>
          <p className="text-muted-foreground">Track your daily task completion for {format(date, "MMMM do, yyyy")}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border">
            <Button variant="ghost" size="icon" onClick={() => setDate(subDays(date, 1))} data-testid="button-prev-day">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono font-medium min-w-[120px] text-center" data-testid="text-current-date">
              {format(date, "MMM dd, yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setDate(addDays(date, 1))} data-testid="button-next-day">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="px-4 py-2 bg-primary/10 rounded-lg border border-primary/20" data-testid="badge-daily-avg">
            <span className="text-sm text-muted-foreground">Daily Avg: </span>
            <span className="text-lg font-bold text-primary">{averageCompletion}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Tasks for {format(date, "MMMM d")}</h2>
            <span className="text-sm text-muted-foreground ml-auto">{tasks?.length || 0} tasks</span>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
            ) : tasks?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No tasks for this day. Add one below.</div>
            ) : (
              tasks?.map(task => (
                <div key={task.id} className="px-4 py-3 flex items-center gap-3" data-testid={`row-task-${task.id}`}>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm" data-testid={`text-task-title-${task.id}`}>{task.title}</span>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[250px]" data-testid={`text-task-desc-preview-${task.id}`}>
                        {task.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setDescTask({ id: task.id, title: task.title, description: task.description })}
                    className={cn(
                      "p-1.5 rounded-md transition-colors shrink-0",
                      task.description ? "text-primary hover:bg-primary/10" : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
                    )}
                    title="Description"
                    data-testid={`button-desc-${task.id}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <PriorityBadge priority={task.priority || "Normal"} />
                  {task.time && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded shrink-0" data-testid={`badge-time-${task.id}`}>
                      <Clock className="w-2.5 h-2.5" />{task.time}
                    </span>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {COMPLETION_LEVELS.map(level => (
                      <div key={level} className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-muted-foreground/60">{level}%</span>
                        <ProgressDot
                          active={(task.completionPercentage || 0) === level}
                          level={level}
                          onClick={() => updateTask.mutate({ id: task.id, completionPercentage: level })}
                          testId={`dot-completion-${level}-${task.id}`}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => deleteTask.mutate(task.id)}
                    className="p-1.5 rounded-md text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    data-testid={`button-delete-task-${task.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
            <div className="px-4 py-3">
              <form onSubmit={handleCreate} className="flex gap-2 items-center">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add new task..."
                  className="flex-1"
                  data-testid="input-new-task-title"
                />
                <TimeInput value={newTaskTime} onChange={setNewTaskTime} testId="input-new-task-time" />
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger className="w-[130px] text-xs" data-testid="select-new-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" size="sm" className="gap-1 shrink-0" disabled={!newTaskTitle.trim()} data-testid="button-add-task">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden" data-testid="calendar-view">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCalMonth(subMonths(calMonth, 1))} data-testid="button-cal-prev-month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-sm" data-testid="text-cal-month">{format(calMonth, "MMMM yyyy")}</span>
              <Button variant="ghost" size="icon" onClick={() => setCalMonth(addMonths(calMonth, 1))} data-testid="button-cal-next-month">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 mb-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            {(() => {
              const calStart = startOfMonth(calMonth);
              const calEnd = endOfMonth(calMonth);
              const calDays = eachDayOfInterval({ start: calStart, end: calEnd });
              const startDayOfWeek = (getDay(calStart) + 6) % 7;
              const cells: (Date | null)[] = Array(startDayOfWeek).fill(null).concat(calDays);
              while (cells.length % 7 !== 0) cells.push(null);
              const rows: (Date | null)[][] = [];
              for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
              return rows.map((row, ri) => (
                <div key={ri} className="grid grid-cols-7">
                  {row.map((day, ci) => {
                    if (!day) return <div key={ci} className="p-1" />;
                    const dayStr = format(day, "yyyy-MM-dd");
                    const dayTaskCount = calMonthTasks?.filter(t => t.date === dayStr).length || 0;
                    const isSelected = isSameDay(day, date);
                    const today = isToday(day);
                    return (
                      <button
                        key={ci}
                        onClick={() => { setDate(day); }}
                        className={cn(
                          "p-1 rounded-lg text-center transition-all hover:bg-white/10 relative",
                          isSelected && "bg-white text-black font-bold",
                          today && !isSelected && "ring-1 ring-white/40"
                        )}
                        data-testid={`cal-day-${dayStr}`}
                      >
                        <span className="text-xs block">{format(day, "d")}</span>
                        {dayTaskCount > 0 && (
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full mx-auto mt-0.5",
                            isSelected ? "bg-black/60" : "bg-white/60"
                          )} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
          {(() => {
            const selTasks = tasks || [];
            return (
              <div className="border-t border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2" data-testid="text-cal-selected-date">
                  {format(date, "MMMM d, yyyy")}
                </p>
                {selTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tasks</p>
                ) : (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {selTasks.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs" data-testid={`cal-task-${t.id}`}>
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          (t.completionPercentage || 0) === 100 ? "bg-green-500"
                          : (t.completionPercentage || 0) >= 50 ? "bg-yellow-500"
                          : (t.completionPercentage || 0) > 0 ? "bg-red-500"
                          : "bg-zinc-500"
                        )} />
                        <span className="truncate">{t.title}</span>
                        <span className="ml-auto text-muted-foreground shrink-0">{t.completionPercentage || 0}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-display font-bold">Task Analytics</h2>
              <p className="text-muted-foreground text-sm">Detailed performance data for your tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border">
            <Button variant="ghost" size="icon" onClick={() => setAnalyticsMonth(new Date(analyticsMonth.getFullYear(), analyticsMonth.getMonth() - 1, 1))} data-testid="button-analytics-prev-month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono font-medium min-w-[140px] text-center" data-testid="text-analytics-month">
              {format(analyticsMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setAnalyticsMonth(new Date(analyticsMonth.getFullYear(), analyticsMonth.getMonth() + 1, 1))} data-testid="button-analytics-next-month">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">Monthly Avg</p>
            <p className="text-3xl font-bold text-primary" data-testid="text-monthly-avg">
              {monthTasks && monthTasks.length > 0
                ? Math.round(monthTasks.reduce((a, t) => a + (t.completionPercentage || 0), 0) / monthTasks.length)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{monthTasks?.length || 0} total tasks</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">Best Day</p>
            <p className="text-3xl font-bold text-green-500" data-testid="text-best-day">
              {dailyData.reduce((best, d) => d.avg > best.avg ? d : best, { avg: 0, fullDate: "N/A" }).avg}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {dailyData.reduce((best, d) => d.avg > best.avg ? d : best, { avg: 0, fullDate: "N/A" }).fullDate}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">Active Days</p>
            <p className="text-3xl font-bold text-emerald-500" data-testid="text-active-days">
              {dailyData.filter(d => d.taskCount > 0).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">out of {daysInMonth.length} days</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Daily Average — {format(analyticsMonth, "MMMM yyyy")}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Every single day's average task completion for the month</p>
          <div className="h-[300px]" data-testid="chart-daily-avg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number) => [`${value}%`, "Avg Completion"]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                />
                <Bar
                  dataKey="avg"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-white" />
            <h3 className="text-lg font-semibold">Weekly Average — {format(analyticsMonth, "MMMM yyyy")}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Average task completion grouped by week</p>
          <div className="h-[280px]" data-testid="chart-weekly-avg">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string) => {
                    if (name === "avg") return [`${value}%`, "Avg Completion"];
                    return [value, "Tasks"];
                  }}
                />
                <Area type="monotone" dataKey="avg" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.15} strokeWidth={2} name="avg" />
                <Bar dataKey="taskCount" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} maxBarSize={30} name="taskCount" opacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
            {weeklyData.map((w) => (
              <div key={w.week} className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">{w.week}</p>
                <p className="text-xl font-bold">{w.avg}%</p>
                <p className="text-xs text-muted-foreground">{w.taskCount} tasks / {w.days} days</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-white" />
            <h3 className="text-lg font-semibold">Monthly Trend — {currentYear}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Average task completion for each month of the year</p>
          <div className="h-[280px]" data-testid="chart-monthly-trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number) => [`${value}%`, "Avg Completion"]}
                />
                <Line type="monotone" dataKey="avg" stroke="hsl(142, 71%, 45%)" strokeWidth={2.5} dot={{ r: 5, fill: "hsl(142, 71%, 45%)" }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 mt-4">
            {monthlyTrend.map((m) => (
              <div key={m.month} className="bg-muted/30 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">{m.month}</p>
                <p className="text-sm font-bold">{m.avg}%</p>
                <ProgressBar value={m.avg} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {descTask && (
        <DescriptionDialog
          task={descTask}
          onSave={(desc) => updateTask.mutate({ id: descTask.id, description: desc.trim() || null })}
          onClose={() => setDescTask(null)}
        />
      )}
    </div>
  );
}
