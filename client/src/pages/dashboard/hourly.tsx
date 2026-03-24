import { useState, useMemo, useRef } from "react";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getWeek, subMonths, addMonths } from "date-fns";
import { useHourlyEntries, useHourlyEntriesByMonth, useUpdateHourlyEntry, useDeleteHourlyEntry } from "@/hooks/use-hourly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, BarChart3, Clock, TrendingUp, Calendar, Zap, Brain, Users, Layers, BookOpen, Coffee, CheckSquare, MoreHorizontal, Plus, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from "recharts";

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const DEFAULT_HIDDEN = new Set([0, 1, 2, 3, 4]); // midnight to 4am hidden by default

const SESSION_TYPES = [
  { id: "deep_focus",   label: "Deep Focus",    short: "Focus",   color: "text-blue-400 bg-blue-500/20 border-blue-500/40",     dot: "bg-blue-400",    icon: Brain },
  { id: "meeting",      label: "Meeting",        short: "Meeting", color: "text-orange-400 bg-orange-500/20 border-orange-500/40", dot: "bg-orange-400",  icon: Users },
  { id: "shallow_work", label: "Shallow Work",   short: "Shallow", color: "text-yellow-400 bg-yellow-500/20 border-yellow-500/40", dot: "bg-yellow-400",  icon: Layers },
  { id: "learning",     label: "Learning",       short: "Learn",   color: "text-green-400 bg-green-500/20 border-green-500/40",   dot: "bg-green-400",   icon: BookOpen },
  { id: "break",        label: "Break",          short: "Break",   color: "text-gray-400 bg-gray-500/20 border-gray-500/40",     dot: "bg-gray-400",    icon: Coffee },
  { id: "daily_task",   label: "Daily Task",     short: "Task",    color: "text-purple-400 bg-purple-500/20 border-purple-500/40", dot: "bg-purple-400",  icon: CheckSquare },
  { id: "other",        label: "Other",          short: "Other",   color: "text-muted-foreground bg-secondary/50 border-border",  dot: "",               icon: MoreHorizontal },
] as const;

const PIE_COLORS: Record<string, string> = {
  deep_focus:   "hsl(217, 91%, 60%)",
  meeting:      "hsl(25, 95%, 60%)",
  shallow_work: "hsl(45, 93%, 55%)",
  learning:     "hsl(142, 71%, 45%)",
  break:        "hsl(220, 9%, 55%)",
  daily_task:   "hsl(270, 60%, 65%)",
  other:        "hsl(220, 9%, 40%)",
};

function getSessionType(id: string | null | undefined) {
  return SESSION_TYPES.find(s => s.id === id) ?? SESSION_TYPES[SESSION_TYPES.length - 1];
}

function formatHourLabel(hour: number) {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function calcDurationMinutes(startTime: string | null | undefined, endTime: string | null | undefined): number {
  if (!startTime || !endTime) return 60;
  const diff = parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
  return diff > 0 ? diff : 60;
}

export default function HourlyPage() {
  const [date, setDate] = useState(new Date());
  const [analyticsMonth, setAnalyticsMonth] = useState(new Date());
  const [hiddenHours, setHiddenHours] = useState<Set<number>>(new Set(DEFAULT_HIDDEN));
  const [addHourValue, setAddHourValue] = useState<string>("");
  const dateStr = format(date, "yyyy-MM-dd");
  const analyticsMonthStr = format(analyticsMonth, "yyyy-MM");

  const { data: entries, isLoading } = useHourlyEntries(dateStr);
  const { data: monthEntries } = useHourlyEntriesByMonth(analyticsMonthStr);
  const updateEntry = useUpdateHourlyEntry();
  const deleteEntry = useDeleteHourlyEntry();

  const visibleHours = useMemo(
    () => ALL_HOURS.filter(h => !hiddenHours.has(h)),
    [hiddenHours]
  );

  const availableToAdd = useMemo(
    () => ALL_HOURS.filter(h => hiddenHours.has(h)),
    [hiddenHours]
  );

  const handleUpdate = (
    hour: number,
    fields: Partial<{ taskDescription: string; productivityScore: number; sessionType: string; startTime: string; endTime: string }>
  ) => {
    const entry = entries?.find(e => e.hour === hour);
    updateEntry.mutate({
      date: dateStr,
      hour,
      taskDescription: fields.taskDescription ?? entry?.taskDescription ?? "",
      productivityScore: fields.productivityScore ?? entry?.productivityScore ?? 0,
      sessionType: fields.sessionType ?? entry?.sessionType ?? "other",
      startTime: fields.startTime !== undefined ? fields.startTime : (entry?.startTime ?? null),
      endTime: fields.endTime !== undefined ? fields.endTime : (entry?.endTime ?? null),
    });
  };

  const handleDelete = (hour: number) => {
    deleteEntry.mutate({ date: dateStr, hour });
    setHiddenHours(prev => new Set([...prev, hour]));
  };

  const handleAddHour = (val: string) => {
    const h = parseInt(val);
    if (!isNaN(h)) {
      setHiddenHours(prev => {
        const next = new Set(prev);
        next.delete(h);
        return next;
      });
      setAddHourValue("");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500 bg-green-500/10 border-green-500/20";
    if (score >= 5) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    if (score > 0) return "text-red-500 bg-red-500/10 border-red-500/20";
    return "text-muted-foreground bg-secondary/50 border-transparent";
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 5) return "bg-yellow-500";
    if (score > 0) return "bg-red-500";
    return "bg-muted";
  };

  const dailyStats = useMemo(() => {
    if (!entries?.length) return { avg: 0, trackedHours: 0, totalMinutes: 0 };
    const scored = entries.filter(e => e.productivityScore > 0);
    if (!scored.length) return { avg: 0, trackedHours: 0, totalMinutes: 0 };
    const avg = Math.round(scored.reduce((sum, e) => sum + e.productivityScore, 0) / scored.length * 10) / 10;
    const totalMinutes = scored.reduce((sum, e) => sum + calcDurationMinutes(e.startTime, e.endTime), 0);
    return { avg, trackedHours: scored.length, totalMinutes };
  }, [entries]);

  const sessionBreakdownToday = useMemo(() => {
    if (!entries) return [];
    const scored = entries.filter(e => e.productivityScore > 0);
    const map: Record<string, number> = {};
    for (const e of scored) {
      const t = e.sessionType || "other";
      map[t] = (map[t] || 0) + calcDurationMinutes(e.startTime, e.endTime);
    }
    return SESSION_TYPES.map(s => ({ name: s.label, value: map[s.id] || 0, id: s.id })).filter(x => x.value > 0);
  }, [entries]);

  const analyticsMonthStart = startOfMonth(analyticsMonth);
  const analyticsMonthEnd = endOfMonth(analyticsMonth);
  const daysInAnalyticsMonth = eachDayOfInterval({ start: analyticsMonthStart, end: analyticsMonthEnd });

  const analytics = useMemo(() => {
    if (!monthEntries) return null;

    const dailyData = daysInAnalyticsMonth.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEntries = monthEntries.filter(e => e.date === dayStr && e.productivityScore > 0);
      const avg = dayEntries.length > 0 ? Math.round(dayEntries.reduce((sum, e) => sum + e.productivityScore, 0) / dayEntries.length * 10) / 10 : 0;
      const totalMinutes = dayEntries.reduce((sum, e) => sum + calcDurationMinutes(e.startTime, e.endTime), 0);
      return { day: parseInt(format(day, "d")), date: dayStr, avg, totalHours: Math.round(totalMinutes / 60 * 10) / 10, rawEntries: dayEntries.length, fullDate: format(day, "MMM d") };
    });

    const weekMap = new Map<number, { total: number; count: number; minutes: number; days: Set<string> }>();
    daysInAnalyticsMonth.forEach(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEntries = monthEntries.filter(e => e.date === dayStr && e.productivityScore > 0);
      const weekNum = getWeek(day, { weekStartsOn: 1 });
      if (!weekMap.has(weekNum)) weekMap.set(weekNum, { total: 0, count: 0, minutes: 0, days: new Set() });
      const w = weekMap.get(weekNum)!;
      w.days.add(dayStr);
      dayEntries.forEach(e => { w.total += e.productivityScore; w.count += 1; w.minutes += calcDurationMinutes(e.startTime, e.endTime); });
    });

    const weeklyData: { week: string; avg: number; hours: number; days: number }[] = [];
    Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]).forEach(([_, w]) => {
      weeklyData.push({ week: `Week ${weeklyData.length + 1}`, avg: w.count > 0 ? Math.round(w.total / w.count * 10) / 10 : 0, hours: Math.round(w.minutes / 60 * 10) / 10, days: w.days.size });
    });

    const scoredEntries = monthEntries.filter(e => e.productivityScore > 0);
    const monthlyAvg = scoredEntries.length > 0 ? Math.round(scoredEntries.reduce((sum, e) => sum + e.productivityScore, 0) / scoredEntries.length * 10) / 10 : 0;
    const totalTrackedMinutes = scoredEntries.reduce((sum, e) => sum + calcDurationMinutes(e.startTime, e.endTime), 0);
    const activeDays = new Set(scoredEntries.map(e => e.date)).size;
    const bestDay = dailyData.reduce((best, d) => d.avg > best.avg ? d : best, { avg: 0, fullDate: "N/A", day: 0, date: "", totalHours: 0, rawEntries: 0 });
    const worstDay = dailyData.filter(d => d.avg > 0).reduce((worst, d) => d.avg < worst.avg ? d : worst, { avg: 10, fullDate: "N/A", day: 0, date: "", totalHours: 0, rawEntries: 0 });

    const hourlyDistribution = ALL_HOURS.map(hour => {
      const hourEntries = scoredEntries.filter(e => e.hour === hour);
      const avg = hourEntries.length > 0 ? Math.round(hourEntries.reduce((sum, e) => sum + e.productivityScore, 0) / hourEntries.length * 10) / 10 : 0;
      return { hour: `${hour.toString().padStart(2, "0")}:00`, hourNum: hour, avg, entries: hourEntries.length };
    });

    const sessionBreakdownMonth = SESSION_TYPES.map(s => {
      const mins = scoredEntries.filter(e => (e.sessionType || "other") === s.id).reduce((sum, e) => sum + calcDurationMinutes(e.startTime, e.endTime), 0);
      return { name: s.label, hours: Math.round(mins / 60 * 10) / 10, id: s.id };
    }).filter(x => x.hours > 0);

    return { dailyData, weeklyData, monthlyAvg, totalTrackedMinutes, activeDays, bestDay, worstDay, hourlyDistribution, sessionBreakdownMonth };
  }, [monthEntries, daysInAnalyticsMonth]);

  const tooltipStyle = {
    contentStyle: { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" },
    labelStyle: { color: "hsl(var(--foreground))" },
  };

  const totalHoursDisplay = Math.round(dailyStats.totalMinutes / 60 * 10) / 10;

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-6 sm:space-y-8 overflow-y-auto" style={{ height: "calc(100vh - 4rem)" }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" data-testid="text-hourly-title">Hourly Tracker</h1>
          <p className="text-muted-foreground text-sm">Log session type, precise time range, and productivity score for each block</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 bg-card p-1.5 sm:p-2 rounded-lg border border-border">
            <Button variant="ghost" size="icon" onClick={() => setDate(subDays(date, 1))} data-testid="button-prev-day">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono font-medium min-w-[100px] sm:min-w-[120px] text-center text-sm sm:text-base" data-testid="text-current-date">
              {format(date, "MMM dd, yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setDate(addDays(date, 1))} data-testid="button-next-day">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 rounded-lg border border-primary/20" data-testid="badge-daily-avg">
              <span className="text-xs sm:text-sm text-muted-foreground">Avg: </span>
              <span className="text-base sm:text-lg font-bold text-primary">{dailyStats.avg}/10</span>
            </div>
            <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 rounded-lg border border-white/20" data-testid="badge-tracked-hours">
              <span className="text-xs sm:text-sm text-muted-foreground">{totalHoursDisplay > 0 ? `${totalHoursDisplay}h` : `${dailyStats.trackedHours} blocks`} </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Log */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Log header with today's session breakdown + Add Hour */}
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Hourly Log — {format(date, "MMMM d, yyyy")}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sessionBreakdownToday.map(s => {
              const st = getSessionType(s.id);
              const mins = s.value;
              const display = mins >= 60 ? `${Math.round(mins / 60 * 10) / 10}h` : `${mins}m`;
              return (
                <span key={s.id} className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", st.color)}>
                  {s.name}: {display}
                </span>
              );
            })}
            {availableToAdd.length > 0 && (
              <div className="flex items-center gap-1">
                <Select value={addHourValue} onValueChange={handleAddHour}>
                  <SelectTrigger className="h-7 w-[130px] text-xs border-dashed border-primary/40 text-primary bg-primary/5" data-testid="select-add-hour">
                    <Plus className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Add hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map(h => (
                      <SelectItem key={h} value={String(h)} data-testid={`option-add-hour-${h}`}>
                        {formatHourLabel(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 border-b border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          <div className="w-[90px]">Hour</div>
          <div className="w-[148px]">Time range</div>
          <div className="flex-1">What did you do?</div>
          <div className="w-[180px] text-center">Score (1–10)</div>
          <div className="w-8" />
        </div>

        <div className="p-3 space-y-1.5">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading hourly data...</div>
          ) : visibleHours.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">All hours hidden. Use "Add hour" above to restore them.</div>
          ) : visibleHours.map(hour => {
            const entry = entries?.find(e => e.hour === hour);
            const hourLabel = formatHourLabel(hour);
            const currentType = entry?.sessionType || null;
            const st = currentType ? getSessionType(currentType) : null;
            const hasActivity = !!entry?.productivityScore;

            return (
              <div
                key={`${dateStr}-${hour}`}
                className={cn(
                  "rounded-lg border transition-all group",
                  hasActivity ? "border-border/50 bg-card/60" : "border-transparent hover:border-border/20"
                )}
                data-testid={`row-hour-${hour}`}
              >
                {/* Main row */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center px-3 pt-2 pb-1">

                  {/* Hour label with type dot */}
                  <div className="flex items-center gap-1.5 w-[90px] shrink-0" data-testid={`text-hour-label-${hour}`}>
                    {st && st.dot && <div className={cn("w-2 h-2 rounded-full shrink-0", st.dot)} />}
                    <span className="font-mono text-xs text-muted-foreground">{hourLabel}</span>
                  </div>

                  {/* Precise time range inputs */}
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="time"
                      className="w-[68px] h-7 px-1.5 text-xs bg-background/60 border border-border/40 rounded text-foreground focus:outline-none focus:border-primary/60 font-mono"
                      defaultValue={entry?.startTime || ""}
                      onBlur={(e) => handleUpdate(hour, { startTime: e.target.value || undefined })}
                      placeholder="HH:MM"
                      data-testid={`input-start-time-${hour}`}
                    />
                    <span className="text-muted-foreground/50 text-xs">→</span>
                    <input
                      type="time"
                      className="w-[68px] h-7 px-1.5 text-xs bg-background/60 border border-border/40 rounded text-foreground focus:outline-none focus:border-primary/60 font-mono"
                      defaultValue={entry?.endTime || ""}
                      onBlur={(e) => handleUpdate(hour, { endTime: e.target.value || undefined })}
                      placeholder="HH:MM"
                      data-testid={`input-end-time-${hour}`}
                    />
                  </div>

                  {/* Description */}
                  <Input
                    className="flex-1 min-w-[100px] bg-transparent border-border/30 focus:bg-card/40 transition-all text-sm h-7"
                    placeholder={`What did you do?`}
                    defaultValue={entry?.taskDescription || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (entry?.taskDescription || "")) {
                        handleUpdate(hour, { taskDescription: e.target.value });
                      }
                    }}
                    data-testid={`input-task-${hour}`}
                  />

                  {/* Score 1-10 */}
                  <div className="flex gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                      <button
                        key={score}
                        onClick={() => handleUpdate(hour, { productivityScore: score === entry?.productivityScore ? 0 : score })}
                        className={cn(
                          "w-[18px] h-6 rounded text-[9px] font-bold border transition-all hover:scale-110 shrink-0",
                          entry?.productivityScore === score
                            ? getScoreColor(score)
                            : "text-muted-foreground/30 border-transparent hover:bg-secondary"
                        )}
                        data-testid={`button-score-${hour}-${score}`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>

                  {/* Score badge */}
                  {entry?.productivityScore ? (
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0", getScoreBg(entry.productivityScore))} data-testid={`badge-score-${hour}`}>
                      {entry.productivityScore}
                    </div>
                  ) : <div className="w-6 shrink-0" />}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(hour)}
                    className="w-6 h-6 shrink-0 rounded flex items-center justify-center text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title={`Remove ${hourLabel}`}
                    data-testid={`button-delete-hour-${hour}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Session type pills row */}
                <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar">
                  {SESSION_TYPES.map(s => {
                    const Icon = s.icon;
                    const isSelected = currentType === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleUpdate(hour, { sessionType: isSelected ? "other" : s.id })}
                        className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-all whitespace-nowrap shrink-0",
                          isSelected
                            ? s.color
                            : "text-muted-foreground/40 border-border/30 hover:text-muted-foreground hover:border-border/60"
                        )}
                        data-testid={`button-type-${hour}-${s.id}`}
                      >
                        <Icon className="w-3 h-3" />
                        {s.short}
                      </button>
                    );
                  })}

                  {/* Precise duration display if times are set */}
                  {entry?.startTime && entry?.endTime && (
                    <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0 self-center pr-1">
                      {calcDurationMinutes(entry.startTime, entry.endTime)}m tracked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold" data-testid="text-analytics-title">Productivity Analytics</h2>
              <p className="text-muted-foreground text-xs sm:text-sm">Trends, session breakdown and peak hour insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card p-1.5 sm:p-2 rounded-lg border border-border">
            <Button variant="ghost" size="icon" onClick={() => setAnalyticsMonth(subMonths(analyticsMonth, 1))} data-testid="button-analytics-prev-month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono font-medium min-w-[120px] sm:min-w-[140px] text-center text-sm sm:text-base" data-testid="text-analytics-month">
              {format(analyticsMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setAnalyticsMonth(addMonths(analyticsMonth, 1))} data-testid="button-analytics-next-month">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {analytics && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-card rounded-xl border border-border p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Monthly Avg</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-monthly-avg">{analytics.monthlyAvg}</p>
                <p className="text-xs text-muted-foreground">/10 productivity</p>
                <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${analytics.monthlyAvg * 10}%` }} />
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
                <p className="text-3xl font-bold text-white" data-testid="text-total-hours">{Math.round(analytics.totalTrackedMinutes / 60 * 10) / 10}</p>
                <p className="text-xs text-muted-foreground">tracked this month</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Active Days</p>
                <p className="text-3xl font-bold text-purple-400" data-testid="text-active-days">{analytics.activeDays}</p>
                <p className="text-xs text-muted-foreground">out of {daysInAnalyticsMonth.length} days</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Best Day</p>
                <p className="text-3xl font-bold text-green-400" data-testid="text-best-day">{analytics.bestDay.avg}</p>
                <p className="text-xs text-muted-foreground">{analytics.bestDay.fullDate}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Lowest Day</p>
                <p className="text-3xl font-bold text-red-400" data-testid="text-worst-day">{analytics.worstDay.avg > 0 && analytics.worstDay.avg < 10 ? analytics.worstDay.avg : "—"}</p>
                <p className="text-xs text-muted-foreground">{analytics.worstDay.avg > 0 && analytics.worstDay.avg < 10 ? analytics.worstDay.fullDate : "N/A"}</p>
              </div>
            </div>

            {/* Session Type Breakdown */}
            {analytics.sessionBreakdownMonth.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold">Session Type Breakdown</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">How you spent your time this month (precise minutes used when available)</p>
                  <div className="h-[240px]" data-testid="chart-session-pie">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.sessionBreakdownMonth} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={85}>
                          {analytics.sessionBreakdownMonth.map((entry) => (
                            <Cell key={entry.id} fill={PIE_COLORS[entry.id] || PIE_COLORS.other} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}h`, "Hours"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {analytics.sessionBreakdownMonth.map(s => {
                      const st = getSessionType(s.id);
                      const total = analytics.sessionBreakdownMonth.reduce((a, x) => a + x.hours, 0);
                      const pct = total > 0 ? Math.round((s.hours / total) * 100) : 0;
                      return (
                        <div key={s.id} className="flex items-center gap-2">
                          {st.dot ? <div className={cn("w-2 h-2 rounded-full shrink-0", st.dot)} /> : <div className="w-2 shrink-0" />}
                          <span className="text-xs text-muted-foreground flex-1">{s.name}</span>
                          <span className="text-xs font-medium">{s.hours}h</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[s.id] }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Hours by Session Type</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Total hours per category this month</p>
                  <div className="h-[320px]" data-testid="chart-session-bar">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.sessionBreakdownMonth} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={95} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}h`, "Hours"]} />
                        <Bar dataKey="hours" radius={[0, 4, 4, 0]} maxBarSize={24}>
                          {analytics.sessionBreakdownMonth.map((entry) => (
                            <Cell key={entry.id} fill={PIE_COLORS[entry.id] || PIE_COLORS.other} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Average Chart */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Daily Average Productivity — {format(analyticsMonth, "MMMM yyyy")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Every day's average productivity score for the month</p>
              <div className="h-[260px]" data-testid="chart-daily-avg">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => name === "avg" ? [`${v}/10`, "Avg Score"] : [`${v}h`, "Hours"]} labelFormatter={(_, p) => p?.[0]?.payload?.fullDate || ""} />
                    <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={20} name="avg" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly + Peak Hours */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-semibold">Weekly Average — {format(analyticsMonth, "MMMM yyyy")}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Average productivity grouped by week</p>
                <div className="h-[240px]" data-testid="chart-weekly-avg">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => name === "avg" ? [`${v}/10`, "Avg Score"] : [v, name]} />
                      <Area type="monotone" dataKey="avg" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.15} strokeWidth={2} name="avg" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {analytics.weeklyData.map((w, i) => (
                    <div key={w.week} className="bg-background border border-border rounded-lg p-3 text-center" data-testid={`card-week-${i + 1}`}>
                      <p className="text-xs text-muted-foreground">{w.week}</p>
                      <p className="text-xl font-bold">{w.avg}</p>
                      <p className="text-xs text-muted-foreground">{w.hours}h / {w.days}d</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold">Peak Hours — {format(analyticsMonth, "MMMM yyyy")}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Which hours of the day are you most productive?</p>
                <div className="h-[280px]" data-testid="chart-hourly-distribution">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.hourlyDistribution.filter(h => h.entries > 0)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                      <YAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => name === "avg" ? [`${v}/10`, "Avg Score"] : [v, "Times Tracked"]} />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={16} name="avg">
                        {analytics.hourlyDistribution.filter(h => h.entries > 0).map((h, i) => (
                          <Cell key={i} fill={h.avg >= 8 ? "hsl(142, 71%, 45%)" : h.avg >= 5 ? "hsl(45, 93%, 47%)" : "hsl(0, 72%, 51%)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Heatmap */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold">Productivity Heatmap — {format(analyticsMonth, "MMMM yyyy")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Score for every day at a glance</p>
              <div className="grid grid-cols-7 gap-2" data-testid="chart-heatmap">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
                ))}
                {(() => {
                  const firstDayOfWeek = (analyticsMonthStart.getDay() + 6) % 7;
                  const cells = [];
                  for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`empty-${i}`} className="aspect-square" />);
                  analytics.dailyData.forEach(d => {
                    const intensity = d.avg > 0 ? Math.min(d.avg / 10, 1) : 0;
                    const bgColor = d.avg === 0 ? "bg-muted/30" : d.avg >= 8 ? "bg-green-500" : d.avg >= 5 ? "bg-yellow-500" : "bg-red-500";
                    cells.push(
                      <div key={d.day} className={cn("aspect-square rounded-md flex flex-col items-center justify-center text-xs border border-border/50 transition-all hover:scale-105", bgColor, d.avg > 0 ? "text-white font-bold" : "text-muted-foreground")} style={d.avg > 0 ? { opacity: 0.4 + intensity * 0.6 } : {}} title={`${d.fullDate}: ${d.avg}/10 (${d.totalHours}h)`} data-testid={`cell-heatmap-${d.day}`}>
                        <span className="text-[10px]">{d.day}</span>
                        {d.avg > 0 && <span className="text-[8px] opacity-80">{d.avg}</span>}
                      </div>
                    );
                  });
                  return cells;
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
