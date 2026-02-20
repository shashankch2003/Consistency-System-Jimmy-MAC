import { useState, useMemo } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, getDaysInMonth } from "date-fns";
import { useGoodHabits, useCreateGoodHabit, useDeleteGoodHabit, useGoodHabitEntries, useToggleGoodHabitEntry } from "@/hooks/use-good-habits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, ChevronLeft, ChevronRight, BarChart3, Target, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function GoodHabitsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = new Date();
  const daysInMonth = getDaysInMonth(currentMonth);
  const isCurrentMonthView = isSameMonth(currentMonth, today);
  const daysPassed = daysInMonth;

  const monthStr = format(currentMonth, "yyyy-MM");

  const { data: habits } = useGoodHabits();
  const { data: entries } = useGoodHabitEntries(monthStr);

  const createHabit = useCreateGoodHabit();
  const deleteHabit = useDeleteGoodHabit();
  const toggleEntry = useToggleGoodHabitEntry();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    if (!name?.trim()) return;
    createHabit.mutate({ name }, {
      onSuccess: () => e.currentTarget.reset()
    });
  };

  const isCompleted = (habitId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return entries?.some(e => e.habitId === habitId && e.date === dateStr && e.completed);
  };

  const handleToggle = (habitId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const completed = !isCompleted(habitId, date);
    toggleEntry.mutate({ habitId, date: dateStr, completed });
  };

  const analytics = useMemo(() => {
    if (!habits?.length || !entries) return null;

    const completedEntries = entries.filter(e => e.completed);

    const perHabit = habits.map(habit => {
      const habitEntries = completedEntries.filter(e => e.habitId === habit.id);
      const completedDays = habitEntries.length;
      const rate = daysPassed > 0 ? Math.round((completedDays / daysPassed) * 100) : 0;
      return {
        id: habit.id,
        name: habit.name,
        completedDays,
        totalDays: daysPassed,
        remaining: Math.max(0, daysPassed - completedDays),
        rate,
      };
    });

    const totalPossible = habits.length * daysPassed;
    const totalCompleted = completedEntries.length;
    const overallRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    const overallRemaining = totalPossible - totalCompleted;

    const bestHabit = perHabit.reduce((best, h) => h.rate > best.rate ? h : best, perHabit[0]);

    const dailyData = days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayNum = parseInt(format(day, "d"));
      const dayCompleted = habits.filter(h =>
        completedEntries.some(e => e.habitId === h.id && e.date === dateStr)
      ).length;
      return {
        day: dayNum,
        completed: dayCompleted,
        total: habits.length,
        rate: habits.length > 0 ? Math.round((dayCompleted / habits.length) * 100) : 0,
      };
    });

    const weeklyData: { week: string; rate: number; completed: number; total: number }[] = [];
    let weekNum = 1;
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, Math.min(i + 7, days.length));
      const activeDays = weekDays;
      let weekCompleted = 0;
      let weekTotal = 0;
      activeDays.forEach(d => {
        const ds = format(d, "yyyy-MM-dd");
        habits.forEach(h => {
          weekTotal++;
          if (completedEntries.some(e => e.habitId === h.id && e.date === ds)) weekCompleted++;
        });
      });
      weeklyData.push({
        week: `Week ${weekNum}`,
        rate: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
        completed: weekCompleted,
        total: weekTotal,
      });
      weekNum++;
    }

    return { perHabit, overallRate, overallRemaining, totalCompleted, totalPossible, bestHabit, dailyData, weeklyData };
  }, [habits, entries, days, daysPassed, currentMonth]);

  return (
    <div className="p-8 max-w-[100vw] overflow-x-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-good-habits-title">Good Habits</h1>
          <p className="text-muted-foreground">Build consistency with daily tracking</p>
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

      <div className="bg-card border border-border rounded-xl p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          <div className="w-64 shrink-0 space-y-2 pt-12">
            {habits?.map(habit => (
              <div key={habit.id} className="h-10 flex items-center justify-between px-2 group" data-testid={`row-habit-${habit.id}`}>
                <span className="font-medium truncate" data-testid={`text-habit-name-${habit.id}`}>{habit.name}</span>
                <button
                  onClick={() => deleteHabit.mutate(habit.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1 rounded"
                  data-testid={`button-delete-habit-${habit.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <form onSubmit={handleCreate} className="flex gap-2 pt-2">
              <Input name="name" placeholder="New habit..." className="h-9" data-testid="input-new-habit-name" />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" data-testid="button-add-habit">
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
                  const active = isCompleted(habit.id, day);
                  return (
                    <button
                      key={`${habit.id}-${day}`}
                      onClick={() => handleToggle(habit.id, day)}
                      className={cn(
                        "h-10 w-8 rounded-md border flex items-center justify-center transition-all",
                        active
                          ? "bg-green-500 border-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                          : "bg-card/50 border-border hover:bg-accent/50"
                      )}
                      data-testid={`toggle-habit-${habit.id}-${format(day, "yyyy-MM-dd")}`}
                    >
                      {active && <Check className="w-4 h-4" />}
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
          <h2 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="text-analytics-title">
            <BarChart3 className="w-6 h-6 text-primary" />
            Habit Analytics — {format(currentMonth, "MMMM yyyy")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Overall Completion</p>
              <p className="text-3xl font-bold text-green-400" data-testid="text-overall-rate">{analytics.overallRate}%</p>
              <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${analytics.overallRate}%` }} />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Completed</p>
              <p className="text-3xl font-bold text-blue-400" data-testid="text-total-completed">{analytics.totalCompleted}</p>
              <p className="text-xs text-muted-foreground">out of {analytics.totalPossible} possible</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Remaining</p>
              <p className="text-3xl font-bold text-orange-400" data-testid="text-total-remaining">{analytics.overallRemaining}</p>
              <p className="text-xs text-muted-foreground">habits not yet done</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Best Habit</p>
              <p className="text-lg font-bold text-yellow-400 truncate" data-testid="text-best-habit">{analytics.bestHabit?.name}</p>
              <p className="text-xs text-muted-foreground">{analytics.bestHabit?.rate}% completion</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Per-Habit Completion Rate
              </h3>
              <p className="text-sm text-muted-foreground mb-4">How consistently each habit was done this month</p>
              <div className="h-[300px]" data-testid="chart-per-habit-rate">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.perHabit} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [`${v}%`, "Completion"]}
                    />
                    <Bar dataKey="rate" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-400" />
                Done vs Not Done — Per Habit
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Days completed out of {daysPassed} days in the month</p>
              <div className="space-y-3 max-h-[300px] overflow-y-auto" data-testid="chart-done-vs-not-done">
                {analytics.perHabit.map(h => (
                  <div key={h.id} className="space-y-1" data-testid={`row-done-not-done-${h.id}`}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">{h.name}</span>
                      <span className="text-muted-foreground" data-testid={`text-habit-progress-${h.id}`}>{h.completedDays}/{h.totalDays} days ({h.rate}%)</span>
                    </div>
                    <div className="flex h-6 rounded-full overflow-hidden bg-muted">
                      <div
                        className="bg-green-500 transition-all flex items-center justify-center text-xs font-bold text-white"
                        style={{ width: `${h.rate}%`, minWidth: h.completedDays > 0 ? "24px" : 0 }}
                      >
                        {h.completedDays > 0 && h.completedDays}
                      </div>
                      <div
                        className="bg-red-500/60 transition-all flex items-center justify-center text-xs font-bold text-white"
                        style={{ width: `${100 - h.rate}%`, minWidth: h.remaining > 0 ? "24px" : 0 }}
                      >
                        {h.remaining > 0 && h.remaining}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Daily Completion Rate
            </h3>
            <p className="text-sm text-muted-foreground mb-4">What % of habits were completed each day this month</p>
            <div className="h-[250px]" data-testid="chart-daily-completion">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyData} margin={{ top: 5, right: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                    formatter={(v: number, name: string) => {
                      if (name === "rate") return [`${v}%`, "Completion Rate"];
                      return [v, name];
                    }}
                    labelFormatter={l => `Day ${l}`}
                  />
                  <Bar dataKey="rate" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Weekly Summary
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Average habit completion by week</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3" data-testid="chart-weekly-summary">
              {analytics.weeklyData.map((w, i) => (
                <div key={i} className="bg-background border border-border rounded-lg p-4 text-center" data-testid={`card-week-${i + 1}`}>
                  <p className="text-sm font-medium text-muted-foreground mb-2">{w.week}</p>
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke={w.rate >= 80 ? "hsl(142, 71%, 45%)" : w.rate >= 50 ? "hsl(45, 93%, 47%)" : "hsl(0, 72%, 51%)"}
                        strokeWidth="3"
                        strokeDasharray={`${w.rate} ${100 - w.rate}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" data-testid={`text-week-rate-${i + 1}`}>
                      {w.rate}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid={`text-week-progress-${i + 1}`}>{w.completed}/{w.total} done</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Habit Ranking — Most to Least Consistent
            </h3>
            <div className="space-y-2" data-testid="chart-habit-ranking">
              {[...analytics.perHabit].sort((a, b) => b.rate - a.rate).map((h, i) => (
                <div key={h.id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg" data-testid={`row-ranking-${h.id}`}>
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                    i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                    i === 1 ? "bg-zinc-400/20 text-zinc-300" :
                    i === 2 ? "bg-orange-500/20 text-orange-400" :
                    "bg-muted text-muted-foreground"
                  )} data-testid={`text-rank-${h.id}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.completedDays} of {h.totalDays} days</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          h.rate >= 80 ? "bg-green-500" : h.rate >= 50 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${h.rate}%` }}
                      />
                    </div>
                    <span className={cn("font-bold text-sm min-w-[40px] text-right",
                      h.rate >= 80 ? "text-green-400" : h.rate >= 50 ? "text-yellow-400" : "text-red-400"
                    )} data-testid={`text-ranking-rate-${h.id}`}>
                      {h.rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(!habits || habits.length === 0) && (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Add your first habit above to start tracking and see analytics here.</p>
        </div>
      )}
    </div>
  );
}

function isSameMonth(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}
