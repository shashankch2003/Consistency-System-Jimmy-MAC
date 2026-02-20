import { useState } from "react";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getWeek, getYear } from "date-fns";
import { useTasks, useTasksByMonth, useTasksByYear, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { ShareDownloadBar } from "@/components/ShareDownloadBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Plus, Trash2, BarChart3, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const COMPLETION_LEVELS = [0, 25, 50, 75, 100];

function ProgressDot({ active, level, onClick, testId }: { active: boolean; level: number; onClick: () => void; testId?: string }) {
  const colors: Record<number, string> = {
    0: "border-zinc-500 bg-zinc-500",
    25: "border-red-500 bg-red-500",
    50: "border-yellow-500 bg-yellow-500",
    75: "border-blue-500 bg-blue-500",
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
  const color = value === 0 ? "bg-zinc-500" : value <= 25 ? "bg-red-500" : value <= 50 ? "bg-yellow-500" : value <= 75 ? "bg-blue-500" : "bg-green-500";
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function TasksPage() {
  const [date, setDate] = useState(new Date());
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [analyticsMonth, setAnalyticsMonth] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const analyticsMonthStr = format(analyticsMonth, "yyyy-MM");

  const { data: tasks, isLoading } = useTasks(dateStr);
  const { data: monthTasks } = useTasksByMonth(analyticsMonthStr);
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
    }, {
      onSuccess: () => setNewTaskTitle(""),
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
  const weekMap = new Map<number, { total: number; count: number; taskCount: number; days: Set<string> }>();
  daysInMonth.forEach(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTasks = monthTasks?.filter(t => t.date === dayStr) || [];
    const weekNum = getWeek(day, { weekStartsOn: 1 });
    if (!weekMap.has(weekNum)) weekMap.set(weekNum, { total: 0, count: 0, taskCount: 0, days: new Set() });
    const w = weekMap.get(weekNum)!;
    w.days.add(dayStr);
    dayTasks.forEach(t => {
      w.total += (t.completionPercentage || 0);
      w.count += 1;
    });
    w.taskCount += dayTasks.length;
  });
  Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]).forEach(([weekNum, w]) => {
    weeklyData.push({
      week: `Week ${weeklyData.length + 1}`,
      avg: w.count > 0 ? Math.round(w.total / w.count) : 0,
      taskCount: w.taskCount,
      days: w.days.size,
    });
  });

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
          <ShareDownloadBar
            section="Daily Tasks"
            shareData_={{
              "Date": format(date, "MMMM d, yyyy"),
              "Tasks": String(tasks?.length || 0),
              "Daily Average": `${averageCompletion}%`,
              "Month": format(analyticsMonth, "MMMM yyyy"),
            }}
            csvFilename={`Daily_Tasks_${dateStr}`}
            csvHeaders={["Task", "Completion %"]}
            csvRows={tasks?.map(t => [t.title, t.completionPercentage || 0]) || []}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Tasks for {format(date, "MMMM d")}</h2>
          <span className="text-sm text-muted-foreground ml-auto">{tasks?.length || 0} tasks</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Task</TableHead>
              {COMPLETION_LEVELS.map(level => (
                <TableHead key={level} className="text-center w-[10%]">{level}%</TableHead>
              ))}
              <TableHead className="w-[60px] text-center">Del</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading tasks...</TableCell>
              </TableRow>
            ) : tasks?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tasks for this day. Add one below.</TableCell>
              </TableRow>
            ) : (
              tasks?.map(task => (
                <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                  <TableCell className="font-medium" data-testid={`text-task-title-${task.id}`}>{task.title}</TableCell>
                  {COMPLETION_LEVELS.map(level => (
                    <TableCell key={level} className="text-center">
                      <div className="flex justify-center">
                        <ProgressDot
                          active={(task.completionPercentage || 0) === level}
                          level={level}
                          onClick={() => updateTask.mutate({ id: task.id, completionPercentage: level })}
                          testId={`dot-completion-${level}-${task.id}`}
                        />
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <Button size="icon" variant="ghost" onClick={() => deleteTask.mutate(task.id)} data-testid={`button-delete-task-${task.id}`}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow>
              <TableCell colSpan={7}>
                <form onSubmit={handleCreate} className="flex gap-2">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add new task..."
                    className="h-9"
                    data-testid="input-new-task-title"
                  />
                  <Button type="submit" size="sm" className="h-9 gap-1" disabled={!newTaskTitle.trim()} data-testid="button-add-task">
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
            <p className="text-3xl font-bold text-blue-500" data-testid="text-active-days">
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
            <TrendingUp className="w-5 h-5 text-blue-500" />
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
            <Calendar className="w-5 h-5 text-green-500" />
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
