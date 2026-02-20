import { useState, useMemo } from "react";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getWeek, isSameDay, subMonths, addMonths, getDaysInMonth } from "date-fns";
import { useHourlyEntries, useHourlyEntriesByMonth, useUpdateHourlyEntry } from "@/hooks/use-hourly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, BarChart3, Clock, TrendingUp, Calendar, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, LineChart, Line, Cell } from "recharts";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function HourlyPage() {
  const [date, setDate] = useState(new Date());
  const [analyticsMonth, setAnalyticsMonth] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const analyticsMonthStr = format(analyticsMonth, "yyyy-MM");

  const { data: entries, isLoading } = useHourlyEntries(dateStr);
  const { data: monthEntries } = useHourlyEntriesByMonth(analyticsMonthStr);
  const updateEntry = useUpdateHourlyEntry();

  const handleUpdate = (hour: number, field: 'taskDescription' | 'productivityScore', value: string | number) => {
    const entry = entries?.find(e => e.hour === hour);
    updateEntry.mutate({
      date: dateStr,
      hour,
      taskDescription: field === 'taskDescription' ? String(value) : (entry?.taskDescription || ""),
      productivityScore: field === 'productivityScore' ? Number(value) : (entry?.productivityScore || 0),
    });
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

  const dailyAvg = useMemo(() => {
    if (!entries?.length) return 0;
    const scored = entries.filter(e => e.productivityScore > 0);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((sum, e) => sum + e.productivityScore, 0) / scored.length * 10) / 10;
  }, [entries]);

  const trackedHours = entries?.filter(e => e.productivityScore > 0).length || 0;

  const analyticsMonthStart = startOfMonth(analyticsMonth);
  const analyticsMonthEnd = endOfMonth(analyticsMonth);
  const daysInAnalyticsMonth = eachDayOfInterval({ start: analyticsMonthStart, end: analyticsMonthEnd });

  const analytics = useMemo(() => {
    if (!monthEntries) return null;

    const dailyData = daysInAnalyticsMonth.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEntries = monthEntries.filter(e => e.date === dayStr && e.productivityScore > 0);
      const avg = dayEntries.length > 0
        ? Math.round(dayEntries.reduce((sum, e) => sum + e.productivityScore, 0) / dayEntries.length * 10) / 10
        : 0;
      const totalHours = dayEntries.length;
      return {
        day: parseInt(format(day, "d")),
        date: dayStr,
        avg,
        totalHours,
        fullDate: format(day, "MMM d"),
      };
    });

    const weekMap = new Map<number, { total: number; count: number; hours: number; days: Set<string> }>();
    daysInAnalyticsMonth.forEach(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEntries = monthEntries.filter(e => e.date === dayStr && e.productivityScore > 0);
      const weekNum = getWeek(day, { weekStartsOn: 1 });
      if (!weekMap.has(weekNum)) weekMap.set(weekNum, { total: 0, count: 0, hours: 0, days: new Set() });
      const w = weekMap.get(weekNum)!;
      w.days.add(dayStr);
      dayEntries.forEach(e => {
        w.total += e.productivityScore;
        w.count += 1;
      });
      w.hours += dayEntries.length;
    });

    const weeklyData: { week: string; avg: number; hours: number; days: number }[] = [];
    Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]).forEach(([_, w]) => {
      weeklyData.push({
        week: `Week ${weeklyData.length + 1}`,
        avg: w.count > 0 ? Math.round(w.total / w.count * 10) / 10 : 0,
        hours: w.hours,
        days: w.days.size,
      });
    });

    const scoredEntries = monthEntries.filter(e => e.productivityScore > 0);
    const monthlyAvg = scoredEntries.length > 0
      ? Math.round(scoredEntries.reduce((sum, e) => sum + e.productivityScore, 0) / scoredEntries.length * 10) / 10
      : 0;
    const totalTrackedHours = scoredEntries.length;
    const activeDays = new Set(scoredEntries.map(e => e.date)).size;
    const bestDay = dailyData.reduce((best, d) => d.avg > best.avg ? d : best, { avg: 0, fullDate: "N/A", day: 0, date: "", totalHours: 0 });
    const worstDay = dailyData.filter(d => d.avg > 0).reduce((worst, d) => d.avg < worst.avg ? d : worst, { avg: 10, fullDate: "N/A", day: 0, date: "", totalHours: 0 });

    const hourlyDistribution = HOURS.map(hour => {
      const hourEntries = scoredEntries.filter(e => e.hour === hour);
      const avg = hourEntries.length > 0
        ? Math.round(hourEntries.reduce((sum, e) => sum + e.productivityScore, 0) / hourEntries.length * 10) / 10
        : 0;
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        hourNum: hour,
        avg,
        entries: hourEntries.length,
      };
    });

    return { dailyData, weeklyData, monthlyAvg, totalTrackedHours, activeDays, bestDay, worstDay, hourlyDistribution };
  }, [monthEntries, daysInAnalyticsMonth]);

  const tooltipStyle = {
    contentStyle: { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" },
    labelStyle: { color: "hsl(var(--foreground))" },
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto" style={{ height: "calc(100vh - 4rem)" }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-hourly-title">Hourly Tracker</h1>
          <p className="text-muted-foreground">Log your focus and productivity hour by hour</p>
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
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-primary/10 rounded-lg border border-primary/20" data-testid="badge-daily-avg">
              <span className="text-sm text-muted-foreground">Avg: </span>
              <span className="text-lg font-bold text-primary">{dailyAvg}/10</span>
            </div>
            <div className="px-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20" data-testid="badge-tracked-hours">
              <span className="text-sm text-muted-foreground">Hours: </span>
              <span className="text-lg font-bold text-blue-400">{trackedHours}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Hourly Log — {format(date, "MMMM d, yyyy")}</h2>
        </div>
        <div className="p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading hourly data...</div>
          ) : HOURS.map(hour => {
            const entry = entries?.find(e => e.hour === hour);
            const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
            return (
              <div key={`${dateStr}-${hour}`} className="flex gap-4 items-center group" data-testid={`row-hour-${hour}`}>
                <div className="w-16 font-mono text-sm text-muted-foreground" data-testid={`text-hour-label-${hour}`}>{timeLabel}</div>
                <Input
                  className="flex-1 bg-card/30 border-border/50 focus:bg-card transition-all"
                  placeholder="What did you do?"
                  defaultValue={entry?.taskDescription || ""}
                  onBlur={(e) => handleUpdate(hour, 'taskDescription', e.target.value)}
                  data-testid={`input-task-${hour}`}
                />
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                    <button
                      key={score}
                      onClick={() => handleUpdate(hour, 'productivityScore', score)}
                      className={cn(
                        "w-6 h-8 rounded text-[10px] font-bold border transition-all hover:scale-110",
                        (entry?.productivityScore === score)
                          ? getScoreColor(score)
                          : "text-muted-foreground/30 border-transparent hover:bg-secondary"
                      )}
                      data-testid={`button-score-${hour}-${score}`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="w-8">
                  {entry?.productivityScore ? (
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", getScoreBg(entry.productivityScore))} data-testid={`badge-score-${hour}`}>
                      {entry.productivityScore}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-display font-bold" data-testid="text-analytics-title">Productivity Analytics</h2>
              <p className="text-muted-foreground text-sm">Detailed productivity data and trends</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border">
            <Button variant="ghost" size="icon" onClick={() => setAnalyticsMonth(subMonths(analyticsMonth, 1))} data-testid="button-analytics-prev-month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono font-medium min-w-[140px] text-center" data-testid="text-analytics-month">
              {format(analyticsMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setAnalyticsMonth(addMonths(analyticsMonth, 1))} data-testid="button-analytics-next-month">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {analytics && (
          <>
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
                <p className="text-3xl font-bold text-blue-400" data-testid="text-total-hours">{analytics.totalTrackedHours}</p>
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

            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Daily Average Productivity — {format(analyticsMonth, "MMMM yyyy")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Every single day's average productivity score for the month</p>
              <div className="h-[300px]" data-testid="chart-daily-avg">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: number, name: string) => {
                        if (name === "avg") return [`${value}/10`, "Avg Score"];
                        return [`${value} hrs`, "Tracked Hours"];
                      }}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ""}
                    />
                    <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={20} name="avg" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold">Weekly Average — {format(analyticsMonth, "MMMM yyyy")}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Average productivity grouped by week</p>
                <div className="h-[280px]" data-testid="chart-weekly-avg">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(value: number, name: string) => {
                          if (name === "avg") return [`${value}/10`, "Avg Score"];
                          return [value, name];
                        }}
                      />
                      <Area type="monotone" dataKey="avg" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.15} strokeWidth={2} name="avg" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
                  {analytics.weeklyData.map((w, i) => (
                    <div key={w.week} className="bg-background border border-border rounded-lg p-3 text-center" data-testid={`card-week-${i + 1}`}>
                      <p className="text-xs text-muted-foreground">{w.week}</p>
                      <p className="text-xl font-bold">{w.avg}</p>
                      <p className="text-xs text-muted-foreground">{w.hours} hrs / {w.days} days</p>
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
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(value: number, name: string) => {
                          if (name === "avg") return [`${value}/10`, "Avg Score"];
                          return [value, "Times Tracked"];
                        }}
                      />
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

            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold">Daily Hours Tracked — {format(analyticsMonth, "MMMM yyyy")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Number of hours tracked each day this month</p>
              <div className="h-[250px]" data-testid="chart-daily-hours">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis domain={[0, 24]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: number) => [`${value} hours`, "Tracked"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ""}
                    />
                    <Bar dataKey="totalHours" fill="hsl(280, 68%, 60%)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold">Productivity Heatmap — {format(analyticsMonth, "MMMM yyyy")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Score breakdown for every day at a glance</p>
              <div className="grid grid-cols-7 gap-2" data-testid="chart-heatmap">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
                ))}
                {(() => {
                  const firstDayOfWeek = (analyticsMonthStart.getDay() + 6) % 7;
                  const cells = [];
                  for (let i = 0; i < firstDayOfWeek; i++) {
                    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }
                  analytics.dailyData.forEach(d => {
                    const intensity = d.avg > 0 ? Math.min(d.avg / 10, 1) : 0;
                    const bgColor = d.avg === 0 ? "bg-muted/30"
                      : d.avg >= 8 ? "bg-green-500"
                      : d.avg >= 5 ? "bg-yellow-500"
                      : "bg-red-500";
                    cells.push(
                      <div
                        key={d.day}
                        className={cn(
                          "aspect-square rounded-md flex flex-col items-center justify-center text-xs border border-border/50 transition-all hover:scale-105",
                          bgColor,
                          d.avg > 0 ? "text-white font-bold" : "text-muted-foreground"
                        )}
                        style={d.avg > 0 ? { opacity: 0.4 + intensity * 0.6 } : {}}
                        title={`${d.fullDate}: ${d.avg}/10 (${d.totalHours} hrs)`}
                        data-testid={`cell-heatmap-${d.day}`}
                      >
                        <span className="text-[10px]">{d.day}</span>
                        {d.avg > 0 && <span className="text-[9px]">{d.avg}</span>}
                      </div>
                    );
                  });
                  return cells;
                })()}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded bg-muted/30 border border-border/50" /> No data
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded bg-red-500" /> Low (1-4)
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded bg-yellow-500" /> Medium (5-7)
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded bg-green-500" /> High (8-10)
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
