import { useState, useEffect } from "react";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday, startOfWeek, endOfWeek } from "date-fns";
import { useDailyScore, useDailyScoreRange, useDailyReason, useUpsertDailyReason } from "@/hooks/use-daily-score";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, Save, X, Flame, Trophy, TrendingUp, TrendingDown, Minus, BarChart3, Calendar, Award, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { useToast } from "@/hooks/use-toast";

type ComparisonStats = {
  dailyScores: { date: string; score: number }[];
  weeklyAverages: { weekStart: string; average: number; days: number }[];
  monthlyAverages: { month: string; average: number; days: number }[];
  lifetime: {
    average: number;
    totalDays: number;
    highestDaily: number;
    lowestDaily: number;
    bestWeek: { weekStart: string; average: number; days: number } | null;
    bestMonth: { month: string; average: number; days: number } | null;
  };
};

function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : score >= 25 ? "#f97316" : "#ef4444";

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth="6" fill="none" className="text-muted/20" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="6" fill="none"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}%</span>
      </div>
      {label && <span className="text-[10px] text-muted-foreground mt-1">{label}</span>}
    </div>
  );
}

function DiffIndicator({ current, previous, size = "md" }: { current: number; previous: number; size?: "sm" | "md" }) {
  const diff = current - previous;
  if (diff === 0) return <span className={cn("text-muted-foreground flex items-center gap-0.5", size === "sm" ? "text-xs" : "text-sm")}><Minus className="w-3 h-3" /> 0%</span>;
  const isUp = diff > 0;
  return (
    <span className={cn("flex items-center gap-0.5 font-semibold", isUp ? "text-green-400" : "text-red-400", size === "sm" ? "text-xs" : "text-sm")} data-testid="diff-indicator">
      {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {isUp ? "+" : ""}{diff}%
    </span>
  );
}

function SectionBar({ label, score, count, testId }: { label: string; score: number; count: number; testId: string }) {
  const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : score >= 25 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="space-y-1" data-testid={testId}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{score}%</span>
      </div>
      <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${score}%` }} />
      </div>
      {count === 0 && <p className="text-xs text-muted-foreground/40">No data recorded</p>}
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function getScoreTextColor(score: number) {
  if (score >= 75) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  if (score >= 25) return "text-orange-400";
  return "text-red-400";
}

function formatWeekLabel(weekStart: string, index: number) {
  return `${index + 1}`;
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

export default function DailyScorePage() {
  const [date, setDate] = useState(new Date());
  const [showReasonPage, setShowReasonPage] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [calMonth, setCalMonth] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const { toast } = useToast();

  const { data: score, isLoading } = useDailyScore(dateStr);
  const yesterdayStr = format(subDays(date, 1), "yyyy-MM-dd");
  const { data: yesterdayScore } = useDailyScore(yesterdayStr);
  const { data: reason } = useDailyReason(dateStr);
  const upsertReason = useUpsertDailyReason();

  const calMonthStart = startOfMonth(calMonth);
  const calMonthEnd = endOfMonth(calMonth);
  const calMonthStartStr = format(calMonthStart, "yyyy-MM-dd");
  const calMonthEndStr = format(calMonthEnd, "yyyy-MM-dd");
  const { data: calMonthScores } = useDailyScoreRange(calMonthStartStr, calMonthEndStr);

  const { data: stats } = useQuery<ComparisonStats>({ queryKey: [api.comparisonStats.get.path] });

  const { data: streakData } = useQuery<{ currentStreak: number; longestStreak: number; totalStreakDays: number; lastStreakUpdateDate: string | null }>({ queryKey: ["/api/streak"] });
  const updateStreak = useMutation({
    mutationFn: async (d: string) => {
      const res = await apiRequest("POST", "/api/streak/update", { date: d });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/streak"] });
    },
  });

  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (score && dateStr === todayStr && streakData !== undefined && streakData?.lastStreakUpdateDate !== todayStr && !updateStreak.isPending) {
      updateStreak.mutate(todayStr);
    }
  }, [score, dateStr, streakData]);

  const calDays = eachDayOfInterval({ start: calMonthStart, end: calMonthEnd });
  const startDayOfWeek = getDay(calMonthStart);
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const openReasonPage = () => {
    setReasonText(reason?.reason || "");
    setShowReasonPage(true);
  };

  const saveReason = () => {
    if (!reasonText.trim()) return;
    upsertReason.mutate({ date: dateStr, reason: reasonText.trim() }, {
      onSuccess: () => {
        setShowReasonPage(false);
        toast({ title: "Saved", description: "Your reason has been saved." });
      },
    });
  };

  const getCalDayScore = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return calMonthScores?.find(s => s.date === dayStr);
  };

  const currentWeekAvg = stats?.weeklyAverages?.length ? stats.weeklyAverages[stats.weeklyAverages.length - 1] : null;
  const lastWeekAvg = stats?.weeklyAverages?.length && stats.weeklyAverages.length > 1 ? stats.weeklyAverages[stats.weeklyAverages.length - 2] : null;
  const currentMonthAvg = stats?.monthlyAverages?.length ? stats.monthlyAverages[stats.monthlyAverages.length - 1] : null;
  const lastMonthAvg = stats?.monthlyAverages?.length && stats.monthlyAverages.length > 1 ? stats.monthlyAverages[stats.monthlyAverages.length - 2] : null;

  const weeklyChartData = stats?.weeklyAverages?.map((w, i) => ({
    name: formatWeekLabel(w.weekStart, i),
    average: w.average,
  })) || [];

  const monthlyChartData = stats?.monthlyAverages?.map(m => ({
    name: formatMonthLabel(m.month),
    average: m.average,
  })) || [];

  if (showReasonPage) {
    return (
      <div className="p-4 pt-14 sm:p-8 sm:pt-8 max-w-3xl mx-auto space-y-4" data-testid="reason-page">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowReasonPage(false)} data-testid="button-back-from-reason">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Comparison
          </Button>
        </div>
        <div className="bg-card/50 border border-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold">Daily Reason / Reflection</h2>
            <p className="text-sm text-muted-foreground mt-1">{format(date, "MMMM d, yyyy")} - Write your thoughts, reflections, or reasons for the day.</p>
          </div>
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Write your thoughts, reflections, or reasons for today's performance... You can write as much as you want here."
            className="w-full min-h-[300px] bg-background border border-border rounded-lg p-4 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-white/20"
            data-testid="textarea-reason"
          />
          <div className="flex gap-3">
            <Button onClick={saveReason} disabled={upsertReason.isPending || !reasonText.trim()} className="gap-2" data-testid="button-save-reason">
              <Save className="w-4 h-4" /> Save Reason
            </Button>
            <Button variant="outline" onClick={() => setShowReasonPage(false)} data-testid="button-cancel-reason">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-comparison-title">
            <BarChart3 className="w-7 h-7 text-blue-400" />
            Comparison
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Performance analytics across daily, weekly, monthly, and lifetime.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(subDays(date, 1))} data-testid="button-prev-day">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-sm font-semibold" data-testid="text-selected-date">{format(date, "MMM d, yyyy")}</h2>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(addDays(date, 1))} data-testid="button-next-day">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Streak + Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card/50 border border-border rounded-xl p-4 flex items-center gap-3" data-testid="streak-current">
          <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{streakData?.currentStreak || 0}</p>
            <p className="text-xs text-muted-foreground">Streak</p>
          </div>
        </div>
        <div className="bg-card/50 border border-border rounded-xl p-4 flex items-center gap-3" data-testid="streak-longest">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{streakData?.longestStreak || 0}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
        </div>
        <div className="bg-card/50 border border-border rounded-xl p-4 flex items-center gap-3" data-testid="stat-lifetime-avg">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.lifetime.average || 0}%</p>
            <p className="text-xs text-muted-foreground">Lifetime Avg</p>
          </div>
        </div>
        <div className="bg-card/50 border border-border rounded-xl p-4 flex items-center gap-3" data-testid="stat-total-days">
          <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.lifetime.totalDays || 0}</p>
            <p className="text-xs text-muted-foreground">Total Days</p>
          </div>
        </div>
      </div>

      {/* 1. Today vs Yesterday + Calendar sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          <div className="bg-card/50 border border-border rounded-xl p-6" data-testid="today-vs-yesterday">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Today vs Yesterday</h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Calculating...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="flex flex-col items-center">
                  <ScoreRing score={yesterdayScore?.totalScore || 0} label="Yesterday" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <DiffIndicator current={score?.totalScore || 0} previous={yesterdayScore?.totalScore || 0} />
                  <span className="text-xs text-muted-foreground">vs yesterday</span>
                </div>
                <div className="flex flex-col items-center">
                  <ScoreRing score={score?.totalScore || 0} label="Today" />
                </div>
              </div>
            )}
          </div>

          {/* Breakdown */}
          {score && (
            <div className="bg-card/50 border border-border rounded-xl p-6 space-y-3" data-testid="section-breakdown">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Breakdown — {format(date, "MMM d")}</h3>
              <SectionBar label="Tasks Completion" score={score.taskScore} count={score.taskCount} testId="bar-tasks" />
              <SectionBar label="Good Habits Done" score={score.goodHabitScore} count={score.goodHabitCount} testId="bar-good-habits" />
              <SectionBar label="Bad Habits Avoided" score={score.badHabitScore} count={score.badHabitCount} testId="bar-bad-habits" />
              <SectionBar label="Hourly Productivity" score={score.hourlyScore} count={score.hourlyCount} testId="bar-hourly" />
              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openReasonPage} data-testid="button-reason">
                  <FileText className="w-3.5 h-3.5" />
                  {reason?.reason ? "Edit Reason" : "Add Reason"}
                </Button>
                {reason?.reason && (
                  <p className="text-xs text-muted-foreground italic truncate max-w-sm">"{reason.reason.substring(0, 60)}..."</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Calendar */}
        <div className="space-y-4">
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden" data-testid="score-calendar">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalMonth(subMonths(calMonth, 1))} data-testid="button-cal-prev-month">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-sm font-semibold">{format(calMonth, "MMMM yyyy")}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalMonth(addMonths(calMonth, 1))} data-testid="button-cal-next-month">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="text-center text-[10px] text-muted-foreground/60 font-medium py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {calDays.map(day => {
                  const selected = isSameDay(day, date);
                  const today = isToday(day);
                  const dayScore = getCalDayScore(day);
                  return (
                    <button
                      key={format(day, "yyyy-MM-dd")}
                      onClick={() => setDate(day)}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors relative hover:bg-white/10",
                        selected && "bg-white text-black font-bold",
                        today && !selected && "ring-1 ring-white/40"
                      )}
                      data-testid={`cal-day-${format(day, "yyyy-MM-dd")}`}
                    >
                      <span>{format(day, "d")}</span>
                      {dayScore && (
                        <div className={cn("w-1.5 h-1.5 rounded-full mt-0.5", getScoreColor(dayScore.totalScore))} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card/50 border border-border rounded-xl p-4" data-testid="cal-day-info">
            <h3 className="text-sm font-semibold mb-2">{format(date, "MMMM d, yyyy")}</h3>
            {score ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Score</span>
                  <span className="text-sm font-bold">{score.totalScore}%</span>
                </div>
                <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", getScoreColor(score.totalScore))} style={{ width: `${score.totalScore}%` }} />
                </div>
                <div className="space-y-1.5 mt-3">
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Tasks</span><span className="font-medium">{score.taskScore}%</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Good Habits</span><span className="font-medium">{score.goodHabitScore}%</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Bad Habits</span><span className="font-medium">{score.badHabitScore}%</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Hourly</span><span className="font-medium">{score.hourlyScore}%</span></div>
                </div>
                {reason?.reason && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground italic">"{reason.reason.substring(0, 120)}..."</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No score data for this day.</p>
            )}
          </div>
        </div>
      </div>

      {/* Full-width sections below the grid */}
      <div className="space-y-6">
        {/* 2. This Week vs Last Week */}
        <div className="bg-card/50 border border-border rounded-xl p-6" data-testid="week-comparison">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">This Week vs Last Week</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="flex flex-col items-center">
              <ScoreRing score={lastWeekAvg?.average || 0} size={100} label="Last Week" />
            </div>
            <div className="flex flex-col items-center gap-2">
              {currentWeekAvg && lastWeekAvg ? (
                <>
                  <DiffIndicator current={currentWeekAvg.average} previous={lastWeekAvg.average} />
                  <span className="text-xs text-muted-foreground">week over week</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Not enough data</span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <ScoreRing score={currentWeekAvg?.average || 0} size={100} label="This Week" />
            </div>
          </div>
        </div>

        {/* 3. Weekly History Line Chart */}
        {weeklyChartData.length > 1 && (
          <div className="bg-card/50 border border-border rounded-xl p-6" data-testid="weekly-trend-chart">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Weekly Progression</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}%`, "Average"]} />
                  <Line type="monotone" dataKey="average" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Weekly History List */}
        {stats?.weeklyAverages && stats.weeklyAverages.length > 0 && (
          <div className="bg-background border border-border rounded-xl p-6" data-testid="weekly-history-list">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Weekly History</h3>
            <div className="max-h-64 overflow-y-auto space-y-1 dark-scrollbar">
              {stats.weeklyAverages.map((w, i) => (
                <div key={w.weekStart} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-8">{i + 1}</span>
                    <span className="text-xs text-muted-foreground/60">{format(new Date(w.weekStart + "T00:00:00"), "MMM d")}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", getScoreColor(w.average))} style={{ width: `${w.average}%` }} />
                    </div>
                    <span className={cn("text-sm font-semibold w-12 text-right", getScoreTextColor(w.average))}>{w.average}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. This Month vs Last Month */}
        <div className="bg-card/50 border border-border rounded-xl p-6" data-testid="month-comparison">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">This Month vs Last Month</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="flex flex-col items-center">
              <ScoreRing score={lastMonthAvg?.average || 0} size={100} label={lastMonthAvg ? formatMonthLabel(lastMonthAvg.month) : "Last Month"} />
            </div>
            <div className="flex flex-col items-center gap-2">
              {currentMonthAvg && lastMonthAvg ? (
                <>
                  <DiffIndicator current={currentMonthAvg.average} previous={lastMonthAvg.average} />
                  <span className="text-xs text-muted-foreground">month over month</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Not enough data</span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <ScoreRing score={currentMonthAvg?.average || 0} size={100} label={currentMonthAvg ? formatMonthLabel(currentMonthAvg.month) : "This Month"} />
            </div>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        {monthlyChartData.length > 1 && (
          <div className="bg-card/50 border border-border rounded-xl p-6" data-testid="monthly-bar-chart">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Monthly Comparison</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}%`, "Average"]} />
                  <Bar dataKey="average" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Monthly History List */}
        {stats?.monthlyAverages && stats.monthlyAverages.length > 0 && (
          <div className="bg-background border border-border rounded-xl p-6" data-testid="monthly-history-list">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monthly History</h3>
            <div className="max-h-64 overflow-y-auto space-y-1 dark-scrollbar">
              {stats.monthlyAverages.map((m) => (
                <div key={m.month} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-16">{formatMonthLabel(m.month)}</span>
                    <span className="text-xs text-muted-foreground/60">{m.days} days</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", getScoreColor(m.average))} style={{ width: `${m.average}%` }} />
                    </div>
                    <span className={cn("text-sm font-semibold w-12 text-right", getScoreTextColor(m.average))}>{m.average}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Lifetime Statistics */}
        {stats?.lifetime && (
          <div className="bg-card/50 border border-border rounded-xl p-6" data-testid="lifetime-stats">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Lifetime Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-white/[0.03] rounded-lg">
                <p className={cn("text-2xl font-bold", getScoreTextColor(stats.lifetime.average))}>{stats.lifetime.average}%</p>
                <p className="text-xs text-muted-foreground mt-1">Lifetime Avg</p>
              </div>
              <div className="text-center p-3 bg-white/[0.03] rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{stats.lifetime.totalDays}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Days</p>
              </div>
              <div className="text-center p-3 bg-white/[0.03] rounded-lg">
                <p className={cn("text-2xl font-bold", getScoreTextColor(stats.lifetime.highestDaily))}>{stats.lifetime.highestDaily}%</p>
                <p className="text-xs text-muted-foreground mt-1">Highest Daily</p>
              </div>
              <div className="text-center p-3 bg-white/[0.03] rounded-lg">
                <p className={cn("text-2xl font-bold", getScoreTextColor(stats.lifetime.lowestDaily))}>{stats.lifetime.lowestDaily}%</p>
                <p className="text-xs text-muted-foreground mt-1">Lowest Daily</p>
              </div>
              <div className="text-center p-3 bg-white/[0.03] rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{stats.lifetime.bestWeek?.average || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Best Week</p>
                {stats.lifetime.bestWeek && <p className="text-[10px] text-muted-foreground/50">{format(new Date(stats.lifetime.bestWeek.weekStart + "T00:00:00"), "MMM d")}</p>}
              </div>
              <div className="text-center p-3 bg-white/[0.03] rounded-lg">
                <p className="text-2xl font-bold text-purple-400">{stats.lifetime.bestMonth?.average || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Best Month</p>
                {stats.lifetime.bestMonth && <p className="text-[10px] text-muted-foreground/50">{formatMonthLabel(stats.lifetime.bestMonth.month)}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
