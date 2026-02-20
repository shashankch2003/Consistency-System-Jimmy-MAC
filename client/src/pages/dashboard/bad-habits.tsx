import { useState, useMemo } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, getDaysInMonth } from "date-fns";
import { useBadHabits, useCreateBadHabit, useDeleteBadHabit, useBadHabitEntries, useToggleBadHabitEntry } from "@/hooks/use-bad-habits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, X, ChevronLeft, ChevronRight, BarChart3, ShieldAlert, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function BadHabitsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = new Date();
  const daysInMonth = getDaysInMonth(currentMonth);
  const daysPassed = daysInMonth;

  const monthStr = format(currentMonth, "yyyy-MM");

  const { data: habits } = useBadHabits();
  const { data: entries } = useBadHabitEntries(monthStr);

  const createHabit = useCreateBadHabit();
  const deleteHabit = useDeleteBadHabit();
  const toggleEntry = useToggleBadHabitEntry();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    if (!name?.trim()) return;
    createHabit.mutate({ name }, {
      onSuccess: () => e.currentTarget.reset()
    });
  };

  const hasOccurred = (habitId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return entries?.some(e => e.habitId === habitId && e.date === dateStr && e.occurred);
  };

  const handleToggle = (habitId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const occurred = !hasOccurred(habitId, date);
    toggleEntry.mutate({ habitId, date: dateStr, occurred });
  };

  const analytics = useMemo(() => {
    if (!habits?.length || !entries) return null;

    const occurredEntries = entries.filter(e => e.occurred);

    const perHabit = habits.map(habit => {
      const habitOccurrences = occurredEntries.filter(e => e.habitId === habit.id);
      const slipDays = habitOccurrences.length;
      const cleanDays = Math.max(0, daysPassed - slipDays);
      const slipRate = daysPassed > 0 ? Math.round((slipDays / daysPassed) * 100) : 0;
      const cleanRate = daysPassed > 0 ? Math.round((cleanDays / daysPassed) * 100) : 0;
      return {
        id: habit.id,
        name: habit.name,
        slipDays,
        cleanDays,
        totalDays: daysPassed,
        slipRate,
        cleanRate,
      };
    });

    const totalPossible = habits.length * daysPassed;
    const totalSlips = occurredEntries.length;
    const totalClean = totalPossible - totalSlips;
    const overallSlipRate = totalPossible > 0 ? Math.round((totalSlips / totalPossible) * 100) : 0;
    const overallCleanRate = totalPossible > 0 ? Math.round((totalClean / totalPossible) * 100) : 0;

    const worstHabit = perHabit.reduce((worst, h) => h.slipRate > worst.slipRate ? h : worst, perHabit[0]);
    const bestHabit = perHabit.reduce((best, h) => h.cleanRate > best.cleanRate ? h : best, perHabit[0]);

    const dailyData = days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayNum = parseInt(format(day, "d"));
      const daySlips = habits.filter(h =>
        occurredEntries.some(e => e.habitId === h.id && e.date === dateStr)
      ).length;
      return {
        day: dayNum,
        slips: daySlips,
        total: habits.length,
        slipRate: habits.length > 0 ? Math.round((daySlips / habits.length) * 100) : 0,
      };
    });

    const weeklyData: { week: string; slipRate: number; slips: number; total: number; cleanRate: number }[] = [];
    let weekNum = 1;
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, Math.min(i + 7, days.length));
      let weekSlips = 0;
      let weekTotal = 0;
      weekDays.forEach(d => {
        const ds = format(d, "yyyy-MM-dd");
        habits.forEach(h => {
          weekTotal++;
          if (occurredEntries.some(e => e.habitId === h.id && e.date === ds)) weekSlips++;
        });
      });
      const sr = weekTotal > 0 ? Math.round((weekSlips / weekTotal) * 100) : 0;
      weeklyData.push({
        week: `Week ${weekNum}`,
        slipRate: sr,
        cleanRate: 100 - sr,
        slips: weekSlips,
        total: weekTotal,
      });
      weekNum++;
    }

    return { perHabit, overallSlipRate, overallCleanRate, totalSlips, totalClean, totalPossible, worstHabit, bestHabit, dailyData, weeklyData };
  }, [habits, entries, days, daysPassed, currentMonth]);

  return (
    <div className="p-8 max-w-[100vw] overflow-x-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-red-400" data-testid="text-bad-habits-title">Bad Habits</h1>
          <p className="text-muted-foreground">Track slip-ups and build discipline</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} data-testid="button-prev-month">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-lg font-semibold min-w-[180px] text-center" data-testid="text-current-month">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} data-testid="button-next-month">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="bg-card border border-red-500/20 rounded-xl p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          <div className="w-64 shrink-0 space-y-2 pt-12">
            {habits?.map(habit => (
              <div key={habit.id} className="h-10 flex items-center justify-between px-2 group" data-testid={`row-bad-habit-${habit.id}`}>
                <span className="font-medium truncate" data-testid={`text-bad-habit-name-${habit.id}`}>{habit.name}</span>
                <button
                  onClick={() => deleteHabit.mutate(habit.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1 rounded"
                  data-testid={`button-delete-bad-habit-${habit.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <form onSubmit={handleCreate} className="flex gap-2 pt-2">
              <Input name="name" placeholder="Habit to break..." className="h-9" data-testid="input-new-bad-habit-name" />
              <Button type="submit" variant="destructive" size="icon" className="h-9 w-9 shrink-0" data-testid="button-add-bad-habit">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
          </div>

          <div className="flex gap-1 pt-2 pb-4">
            {days.map(day => (
              <div key={day.toISOString()} className="flex flex-col gap-2 w-8 shrink-0">
                <div className="h-10 flex flex-col items-center justify-end text-xs text-muted-foreground">
                  <span>{format(day, "EEEEE")}</span>
                  <span className={cn("font-bold", isSameDay(day, today) && "text-primary")}>
                    {format(day, "d")}
                  </span>
                </div>
                {habits?.map(habit => {
                  const failed = hasOccurred(habit.id, day);
                  return (
                    <button
                      key={`${habit.id}-${day}`}
                      onClick={() => handleToggle(habit.id, day)}
                      className={cn(
                        "h-10 w-8 rounded-md border flex items-center justify-center transition-all",
                        failed
                          ? "bg-red-500 border-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                          : "bg-card/50 border-border hover:bg-accent/50"
                      )}
                      data-testid={`toggle-bad-habit-${habit.id}-${format(day, "yyyy-MM-dd")}`}
                    >
                      {failed && <X className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {analytics && habits && habits.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="text-bad-analytics-title">
            <BarChart3 className="w-6 h-6 text-red-400" />
            Bad Habit Analytics — {format(currentMonth, "MMMM yyyy")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Slip Rate</p>
              <p className="text-3xl font-bold text-red-400" data-testid="text-overall-slip-rate">{analytics.overallSlipRate}%</p>
              <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${analytics.overallSlipRate}%` }} />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Slips</p>
              <p className="text-3xl font-bold text-red-400" data-testid="text-total-slips">{analytics.totalSlips}</p>
              <p className="text-xs text-muted-foreground">out of {analytics.totalPossible} days</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Clean Days</p>
              <p className="text-3xl font-bold text-green-400" data-testid="text-total-clean">{analytics.totalClean}</p>
              <p className="text-xs text-muted-foreground">days without slipping</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Worst Habit</p>
              <p className="text-lg font-bold text-red-400 truncate" data-testid="text-worst-habit">{analytics.worstHabit?.name}</p>
              <p className="text-xs text-muted-foreground">{analytics.worstHabit?.slipRate}% slip rate</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Per-Habit Slip Rate
              </h3>
              <p className="text-sm text-muted-foreground mb-4">How often each bad habit occurred this month</p>
              <div className="h-[300px]" data-testid="chart-per-habit-slip-rate">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.perHabit} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [`${v}%`, "Slip Rate"]}
                    />
                    <Bar dataKey="slipRate" fill="hsl(0, 72%, 51%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange-400" />
                Slips vs Clean Days — Per Habit
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Slip days vs clean days out of {daysPassed} days in the month</p>
              <div className="space-y-3 max-h-[300px] overflow-y-auto" data-testid="chart-slips-vs-clean">
                {analytics.perHabit.map(h => (
                  <div key={h.id} className="space-y-1" data-testid={`row-slip-clean-${h.id}`}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">{h.name}</span>
                      <span className="text-muted-foreground" data-testid={`text-bad-habit-progress-${h.id}`}>{h.slipDays} slips / {h.cleanDays} clean ({h.slipRate}%)</span>
                    </div>
                    <div className="flex h-6 rounded-full overflow-hidden bg-muted">
                      <div
                        className="bg-red-500 transition-all flex items-center justify-center text-xs font-bold text-white"
                        style={{ width: `${h.slipRate}%`, minWidth: h.slipDays > 0 ? "24px" : 0 }}
                      >
                        {h.slipDays > 0 && h.slipDays}
                      </div>
                      <div
                        className="bg-green-500/60 transition-all flex items-center justify-center text-xs font-bold text-white"
                        style={{ width: `${h.cleanRate}%`, minWidth: h.cleanDays > 0 ? "24px" : 0 }}
                      >
                        {h.cleanDays > 0 && h.cleanDays}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Daily Slip Rate
            </h3>
            <p className="text-sm text-muted-foreground mb-4">What % of bad habits slipped each day this month</p>
            <div className="h-[250px]" data-testid="chart-daily-slips">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyData} margin={{ top: 5, right: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                    formatter={(v: number, name: string) => {
                      if (name === "slipRate") return [`${v}%`, "Slip Rate"];
                      return [v, name];
                    }}
                    labelFormatter={l => `Day ${l}`}
                  />
                  <Bar dataKey="slipRate" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-400" />
              Weekly Summary
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Slip rate by week — lower is better</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3" data-testid="chart-weekly-summary">
              {analytics.weeklyData.map((w, i) => (
                <div key={i} className="bg-background border border-border rounded-lg p-4 text-center" data-testid={`card-bad-week-${i + 1}`}>
                  <p className="text-sm font-medium text-muted-foreground mb-2">{w.week}</p>
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke={w.slipRate <= 20 ? "hsl(142, 71%, 45%)" : w.slipRate <= 50 ? "hsl(45, 93%, 47%)" : "hsl(0, 72%, 51%)"}
                        strokeWidth="3"
                        strokeDasharray={`${w.slipRate} ${100 - w.slipRate}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" data-testid={`text-bad-week-rate-${i + 1}`}>
                      {w.slipRate}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid={`text-bad-week-progress-${i + 1}`}>{w.slips}/{w.total} slips</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Habit Ranking — Most to Least Slip-Ups
            </h3>
            <div className="space-y-2" data-testid="chart-bad-habit-ranking">
              {[...analytics.perHabit].sort((a, b) => b.slipRate - a.slipRate).map((h, i) => (
                <div key={h.id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg" data-testid={`row-bad-ranking-${h.id}`}>
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                    i === 0 ? "bg-red-500/20 text-red-400" :
                    i === 1 ? "bg-orange-500/20 text-orange-400" :
                    i === 2 ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-muted text-muted-foreground"
                  )} data-testid={`text-bad-rank-${h.id}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.slipDays} slips out of {h.totalDays} days</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          h.slipRate >= 50 ? "bg-red-500" : h.slipRate >= 20 ? "bg-yellow-500" : "bg-green-500"
                        )}
                        style={{ width: `${h.slipRate}%` }}
                      />
                    </div>
                    <span className={cn("font-bold text-sm min-w-[40px] text-right",
                      h.slipRate >= 50 ? "text-red-400" : h.slipRate >= 20 ? "text-yellow-400" : "text-green-400"
                    )} data-testid={`text-bad-ranking-rate-${h.id}`}>
                      {h.slipRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(!habits || habits.length === 0) && (
        <div className="bg-card border border-red-500/20 rounded-xl p-12 text-center text-muted-foreground">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50 text-red-400" />
          <p className="text-lg">Add a bad habit above to start tracking slip-ups and see analytics here.</p>
        </div>
      )}
    </div>
  );
}
