import { useState } from "react";
import { format, addDays, subDays, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday, getYear } from "date-fns";
import { useDailyScore, useDailyScoreRange, useDailyReason, useUpsertDailyReason } from "@/hooks/use-daily-score";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : score >= 25 ? "#f97316" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="8" fill="none"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }} data-testid="text-total-score">{score}%</span>
        <span className="text-[10px] text-muted-foreground mt-1">Productivity</span>
      </div>
    </div>
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

export default function DailyScorePage() {
  const [date, setDate] = useState(new Date());
  const [showReason, setShowReason] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [calMonth, setCalMonth] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const { toast } = useToast();

  const twoWeeksAgo = format(subWeeks(date, 2), "yyyy-MM-dd");
  const { data: score, isLoading } = useDailyScore(dateStr);
  const { data: rangeScores } = useDailyScoreRange(twoWeeksAgo, dateStr);
  const { data: reason } = useDailyReason(dateStr);
  const upsertReason = useUpsertDailyReason();

  const calMonthStart = startOfMonth(calMonth);
  const calMonthEnd = endOfMonth(calMonth);
  const calMonthStartStr = format(calMonthStart, "yyyy-MM-dd");
  const calMonthEndStr = format(calMonthEnd, "yyyy-MM-dd");
  const { data: calMonthScores } = useDailyScoreRange(calMonthStartStr, calMonthEndStr);

  const calDays = eachDayOfInterval({ start: calMonthStart, end: calMonthEnd });
  const startDayOfWeek = getDay(calMonthStart);
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const openReason = () => {
    setReasonText(reason?.reason || "");
    setShowReason(true);
  };

  const saveReason = () => {
    if (!reasonText.trim()) return;
    upsertReason.mutate({ date: dateStr, reason: reasonText.trim() }, {
      onSuccess: () => {
        setShowReason(false);
        toast({ title: "Saved", description: "Your reason has been saved." });
      },
    });
  };

  const chartData = rangeScores?.map(s => ({
    date: format(new Date(s.date + "T00:00:00"), "MMM d"),
    score: s.totalScore,
  })) || [];

  const getCalDayScore = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return calMonthScores?.find(s => s.date === dayStr);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-daily-score-title">Daily Score</h1>
          <p className="text-muted-foreground mt-1">Your overall productivity percentage based on all sections.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Calculating your score...</div>
          ) : score ? (
            <>
              <div className="bg-card/50 border border-border rounded-xl p-6" data-testid="score-overview-card">
                <div className="flex items-start gap-8">
                  <div className="flex flex-col items-center shrink-0">
                    <ScoreRing score={score.totalScore} />
                    <p className="text-xs text-muted-foreground mt-2">{format(date, "MMMM d, yyyy")}</p>
                  </div>

                  <div className="flex-1 space-y-3 pt-2" data-testid="section-breakdown">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Breakdown</h3>
                    <SectionBar label="Tasks Completion" score={score.taskScore} count={score.taskCount} testId="bar-tasks" />
                    <SectionBar label="Good Habits Done" score={score.goodHabitScore} count={score.goodHabitCount} testId="bar-good-habits" />
                    <SectionBar label="Bad Habits Avoided" score={score.badHabitScore} count={score.badHabitCount} testId="bar-bad-habits" />
                    <SectionBar label="Hourly Productivity" score={score.hourlyScore} count={score.hourlyCount} testId="bar-hourly" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2" onClick={openReason} data-testid="button-reason">
                  <FileText className="w-4 h-4" />
                  {reason?.reason ? "Edit Reason" : "Add Reason"}
                </Button>
                {reason?.reason && !showReason && (
                  <p className="text-sm text-muted-foreground italic truncate max-w-md" data-testid="text-reason-preview">
                    "{reason.reason.substring(0, 80)}{reason.reason.length > 80 ? "..." : ""}"
                  </p>
                )}
              </div>

              {showReason && (
                <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3" data-testid="reason-editor">
                  <h3 className="text-sm font-semibold">Reason / Notes for {format(date, "MMMM d, yyyy")}</h3>
                  <textarea
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="Write down your thoughts, reasons, or reflections for today..."
                    className="w-full min-h-[120px] bg-background border border-border rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-white/20"
                    data-testid="textarea-reason"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveReason} disabled={upsertReason.isPending || !reasonText.trim()} className="gap-1" data-testid="button-save-reason">
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowReason(false)} data-testid="button-cancel-reason">
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-card/50 border border-border rounded-xl p-6 text-center py-12 text-muted-foreground">
              No data available for this day.
            </div>
          )}

          {chartData.length > 1 && (
            <div className="bg-card/50 border border-border rounded-xl p-6" data-testid="trend-chart">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Last 14 Days Trend</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px", fontSize: "12px" }}
                      labelStyle={{ color: "#999" }}
                      formatter={(value: number) => [`${value}%`, "Score"]}
                    />
                    <Area type="monotone" dataKey="score" stroke="#ffffff" strokeWidth={2} fill="url(#scoreGradient)" dot={{ fill: "#fff", strokeWidth: 0, r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden" data-testid="score-calendar">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalMonth(subMonths(calMonth, 1))} data-testid="button-cal-prev-month">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-sm font-semibold" data-testid="text-cal-month">{format(calMonth, "MMMM yyyy")}</span>
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
            <h3 className="text-sm font-semibold mb-2" data-testid="text-cal-day-date">{format(date, "MMMM d, yyyy")}</h3>
            {score ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Score</span>
                  <span className="text-sm font-bold" data-testid="text-cal-day-score">{score.totalScore}%</span>
                </div>
                <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", getScoreColor(score.totalScore))} style={{ width: `${score.totalScore}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="text-xs text-muted-foreground">Tasks: <span className="text-foreground font-medium">{score.taskScore}%</span></div>
                  <div className="text-xs text-muted-foreground">Good Habits: <span className="text-foreground font-medium">{score.goodHabitScore}%</span></div>
                  <div className="text-xs text-muted-foreground">Bad Habits: <span className="text-foreground font-medium">{score.badHabitScore}%</span></div>
                  <div className="text-xs text-muted-foreground">Hourly: <span className="text-foreground font-medium">{score.hourlyScore}%</span></div>
                </div>
                {reason?.reason && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground italic" data-testid="text-cal-day-reason">
                      "{reason.reason.substring(0, 120)}{reason.reason.length > 120 ? "..." : ""}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No score data for this day.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
