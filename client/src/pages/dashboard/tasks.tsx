import { useState } from "react";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getDay, addMonths, subMonths, isSameDay, isToday } from "date-fns";
import { useTasks, useTasksByMonth, useTasksByYear, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Plus, Trash2, BarChart3, Calendar, TrendingUp, Clock, AlertTriangle, AlertCircle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const COMPLETION_LEVELS = [0, 25, 50, 75, 100];
const PRIORITIES = ["Very Important", "Important", "Normal"] as const;

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "Very Important") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
      <AlertTriangle className="w-2.5 h-2.5" />VI
    </span>
  );
  if (priority === "Important") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
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
        "w-5 h-5 rounded-full border-2 transition-all duration-200 hover:scale-110",
        active ? colors[level] : "border-muted-foreground/30 bg-transparent hover:border-muted-foreground/60"
      )}
      data-testid={testId || `dot-completion-${level}`}
    />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Task</TableHead>
                <TableHead className="text-center w-[220px]">Completion</TableHead>
                <TableHead className="w-[50px] text-center">Del</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading tasks...</TableCell>
                </TableRow>
              ) : tasks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No tasks for this day. Add one below.</TableCell>
                </TableRow>
              ) : (
                tasks?.map(task => (
                  <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                    <TableCell data-testid={`text-task-title-${task.id}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        <PriorityBadge priority={task.priority || "Normal"} />
                        {task.time && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                            <Clock className="w-2.5 h-2.5" />{task.time}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-3">
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
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="icon" variant="ghost" onClick={() => deleteTask.mutate(task.id)} data-testid={`button-delete-task-${task.id}`}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow>
                <TableCell colSpan={3}>
                  <form onSubmit={handleCreate} className="flex gap-2 items-center">
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Add new task..."
                      className="h-9 flex-1"
                      data-testid="input-new-task-title"
                    />
                    <Input
                      type="time"
                      value={newTaskTime}
                      onChange={(e) => setNewTaskTime(e.target.value)}
                      className="h-9 w-[100px] text-xs"
                      data-testid="input-new-task-time"
                    />
                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                      <SelectTrigger className="h-9 w-[130px] text-xs" data-testid="select-new-task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="submit" size="sm" className="h-9 gap-1 shrink-0" disabled={!newTaskTitle.trim()} data-testid="button-add-task">
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
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
    </div>
  );
}
