import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Loader2, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Smile, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const fmt = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

const toDateStr = (d: Date) => d.toISOString().split("T")[0];

const MOODS = ["great", "good", "okay", "bad", "terrible"] as const;
const MOOD_EMOJI: Record<string, string> = { great: "😄", good: "😊", okay: "😐", bad: "😕", terrible: "😞" };

const CAT_COLOR: Record<string, string> = { distractive: "#EC4899", neutral: "#6366F1", productive: "#10B981" };

function generateHourlyData(totalMinutes: number) {
  const weights = [0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.1, 0.3, 0.7, 1.0, 1.1, 1.2, 1.0, 0.9, 0.8, 0.85, 0.9, 1.0, 1.1, 1.0, 0.9, 0.7, 0.5, 0.3];
  const total = weights.reduce((a, b) => a + b, 0);
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, "0")}:00`,
    minutes: Math.round((weights[i] / total) * totalMinutes),
  }));
}

export default function DigitalFocusInsights() {
  const [tab, setTab] = useState<"day" | "week" | "trend">("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const qc = useQueryClient();

  const today = new Date();
  const selectedDay = new Date(today);
  selectedDay.setDate(today.getDate() - dayOffset);
  const selectedDayStr = toDateStr(selectedDay);

  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysFromMonday - weekOffset * 7);
  const weekStart = toDateStr(thisMonday);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  const weekEnd = toDateStr(thisSunday);

  const { data: dayLog, isLoading: loadingDay } = useQuery<any>({
    queryKey: [`/api/focus-daily-logs?startDate=${selectedDayStr}&endDate=${selectedDayStr}`],
    select: (d: any[]) => d?.[0] ?? null,
  });

  const { data: weekLogs = [] } = useQuery<any[]>({
    queryKey: [`/api/focus-daily-logs?startDate=${weekStart}&endDate=${weekEnd}`],
  });

  const prevMondayDate = new Date(thisMonday);
  prevMondayDate.setDate(thisMonday.getDate() - 7);
  const prevSundayDate = new Date(thisMonday);
  prevSundayDate.setDate(thisMonday.getDate() - 1);
  const prevWeekStartStr = toDateStr(prevMondayDate);
  const prevWeekEndStr = toDateStr(prevSundayDate);

  const { data: prevWeekLogs = [] } = useQuery<any[]>({
    queryKey: [`/api/focus-daily-logs?startDate=${prevWeekStartStr}&endDate=${prevWeekEndStr}`],
  });

  const { data: dayAppUsage = [] } = useQuery<any[]>({
    queryKey: [`/api/focus-app-usage?date=${selectedDayStr}`],
  });

  const { data: weeklyAppUsage = [] } = useQuery<any[]>({ queryKey: ["/api/focus-app-usage/weekly"] });
  const { data: allLogs = [] } = useQuery<any[]>({ queryKey: ["/api/focus-daily-logs"] });
  const { data: latestReport } = useQuery<any>({ queryKey: ["/api/focus-weekly-reports/latest"] });

  const moodMutation = useMutation({
    mutationFn: async (mood: string) => (await apiRequest("POST", "/api/focus-daily-logs", { mood })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/focus-daily-logs"] });
      setShowMoodPicker(false);
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/focus-weekly-reports/generate")).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/focus-weekly-reports/latest"] }),
  });

  const hourlyData = generateHourlyData(dayLog?.totalScreenTimeMinutes ?? 0);

  const avgThisWeek = weekLogs.length > 0 ? weekLogs.reduce((s, r) => s + (r.totalScreenTimeMinutes ?? 0), 0) / weekLogs.length : 0;
  const avgPrevWeek = prevWeekLogs.length > 0 ? prevWeekLogs.reduce((s, r) => s + (r.totalScreenTimeMinutes ?? 0), 0) / prevWeekLogs.length : 0;
  const weekChangePercent = avgPrevWeek > 0 ? Math.round(((avgThisWeek - avgPrevWeek) / avgPrevWeek) * 100) : 0;

  const weekChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(thisMonday);
    d.setDate(thisMonday.getDate() + i);
    const dStr = toDateStr(d);
    const log = weekLogs.find((l) => l.logDate === dStr);
    return {
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      distractive: log?.totalDistractiveMinutes ?? 0,
      productive: log?.totalProductiveMinutes ?? 0,
      neutral: log?.totalNeutralMinutes ?? 0,
    };
  });

  const firstLogDate = allLogs.length > 0 ? new Date(allLogs[allLogs.length - 1].logDate) : new Date();
  const sinceLabel = firstLogDate.toLocaleString("default", { month: "long", year: "numeric" });

  const allAppAgg: Record<string, { appName: string; appCategory: string; thisWeek: number; prevWeek: number }> = {};
  for (const r of weeklyAppUsage) {
    if (!allAppAgg[r.appName]) allAppAgg[r.appName] = { appName: r.appName, appCategory: r.appCategory, thisWeek: 0, prevWeek: 0 };
    allAppAgg[r.appName].thisWeek += r.timeSpentMinutes;
  }

  const appChanges = Object.values(allAppAgg).map((a) => ({ ...a, change: a.thisWeek - a.prevWeek }));
  const timeSavers = appChanges.filter((a) => a.change < 0).sort((a, b) => a.change - b.change).slice(0, 3);
  const timeIncreases = appChanges.filter((a) => a.change > 0).sort((a, b) => b.change - a.change).slice(0, 3);

  const TABS = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    { id: "trend", label: "Trend" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Focus Insights</h1>

      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "day" && (
        <motion.div key="day" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setDayOffset(d => d + 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <div className="text-center">
              <p className="font-semibold">{dayOffset === 0 ? "TODAY" : selectedDay.toLocaleDateString("default", { weekday: "long", month: "short", day: "numeric" })}</p>
              <p className="text-xs text-muted-foreground">{selectedDayStr}</p>
            </div>
            <Button variant="ghost" size="icon" disabled={dayOffset === 0} onClick={() => setDayOffset(d => d - 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>

          {loadingDay ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-4xl font-bold">{fmt(dayLog?.totalScreenTimeMinutes ?? 0)}</p>
                <p className="text-sm text-muted-foreground mt-1">Screen Time</p>
                <div className="flex justify-center gap-3 mt-3">
                  <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />{fmt(dayLog?.totalDistractiveMinutes ?? 0)} distractive</span>
                  <span className="flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />{fmt(dayLog?.totalProductiveMinutes ?? 0)} productive</span>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">HOURLY BREAKDOWN</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={hourlyData} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
                      <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={3} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: any) => [`${v}m`, "Screen time"]} />
                      <Bar dataKey="minutes" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">MOST USED APPS</CardTitle></CardHeader>
                <CardContent>
                  {dayAppUsage.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No app data for this day.</p>
                  ) : (
                    <div className="space-y-2">
                      {dayAppUsage.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT_COLOR[a.appCategory] ?? "#6366F1" }} />
                            <span className="text-sm">{a.appName}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{fmt(a.timeSpentMinutes)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">USAGE BREAKDOWN</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(["distractive", "neutral", "productive"] as const).map((cat) => {
                      const val = cat === "distractive" ? (dayLog?.totalDistractiveMinutes ?? 0) : cat === "neutral" ? (dayLog?.totalNeutralMinutes ?? 0) : (dayLog?.totalProductiveMinutes ?? 0);
                      const total = (dayLog?.totalScreenTimeMinutes ?? 0) || 1;
                      const pct = Math.round((val / total) * 100);
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="capitalize">{cat}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CAT_COLOR[cat] }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">FOCUS</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Longest streak</span><span>{fmt(dayLog?.longestFocusStreak ?? 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Continuous use</span><span>{fmt(dayLog?.longestContinuousUse ?? 0)}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">DISTRACTIONS</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Notifications</span><span>{dayLog?.totalNotifications ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pickups</span><span>{dayLog?.totalPickups ?? 0}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">MOOD</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{MOOD_EMOJI[dayLog?.mood ?? ""] ?? "—"}</span>
                      <Button data-testid="mood-checkin" size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowMoodPicker(true)}>
                        <Smile className="w-3 h-3 mr-1" />+
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </motion.div>
      )}

      {tab === "week" && (
        <motion.div key="week" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <div className="text-center">
              <p className="font-semibold">{weekOffset === 0 ? "THIS WEEK" : `${weekStart} – ${weekEnd}`}</p>
            </div>
            <Button variant="ghost" size="icon" disabled={weekOffset === 0} onClick={() => setWeekOffset(w => w - 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold">{fmt(Math.round(avgThisWeek))}</p>
            <p className="text-sm text-muted-foreground mt-1">Avg daily screen time</p>
            {avgPrevWeek > 0 && (
              <Badge variant={weekChangePercent <= 0 ? "default" : "destructive"} className="mt-2 text-xs">
                {weekChangePercent > 0 ? "+" : ""}{weekChangePercent}% vs last week
              </Badge>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">DAILY BREAKDOWN</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weekChartData} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any, n: any) => [`${v}m`, n]} />
                  <Bar dataKey="distractive" stackId="a" fill="#EC4899" name="Distractive" />
                  <Bar dataKey="neutral" stackId="a" fill="#6366F1" name="Neutral" />
                  <Bar dataKey="productive" stackId="a" fill="#10B981" name="Productive" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">MOST USED APPS (THIS WEEK)</CardTitle></CardHeader>
            <CardContent>
              {weeklyAppUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No app data this week.</p>
              ) : (
                <div className="space-y-2">
                  {weeklyAppUsage.slice(0, 6).map((a: any) => (
                    <div key={a.appName} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT_COLOR[a.appCategory] ?? "#6366F1" }} />
                        <span className="text-sm">{a.appName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{fmt(a.timeSpentMinutes)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">BALANCE</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm">
                  {Math.min(100, Math.round((avgThisWeek / (16 * 60)) * 100))}%
                  <span className="text-muted-foreground text-xs ml-1">of 16h awake</span>
                </p>
                <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.round((avgThisWeek / (16 * 60)) * 100))}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">WEEKLY FOCUS</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sessions</span><span>{weekLogs.reduce((s, r) => s + (r.sessionsCompleted ?? 0), 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Focus time</span><span>{fmt(weekLogs.reduce((s, r) => s + (r.totalFocusTimeMinutes ?? 0), 0))}</span></div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {tab === "trend" && (
        <motion.div key="trend" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">SINCE {sinceLabel.toUpperCase()}</p>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Screen Time Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">First week avg</p>
                  <p className="text-xl font-bold">{fmt(Math.round(avgPrevWeek))}</p>
                </div>
                <div className="flex items-center">
                  {weekChangePercent < 0 ? <TrendingDown className="w-5 h-5 text-green-400" /> : <TrendingUp className="w-5 h-5 text-red-400" />}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Last week avg</p>
                  <p className="text-xl font-bold">{fmt(Math.round(avgThisWeek))}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {timeSavers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-green-400" />
                  Top Time-Savers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 justify-center">
                  {[1, 0, 2].map((rank) => {
                    const app = timeSavers[rank];
                    if (!app) return null;
                    const heights = [96, 128, 80];
                    return (
                      <div key={rank} className="flex flex-col items-center gap-1">
                        <span className="text-xs text-green-400 font-medium">-{fmt(Math.abs(app.change))}</span>
                        <div className="w-14 bg-green-500/20 rounded-t-lg flex items-end justify-center" style={{ height: heights[rank] }}>
                          <span className="text-lg pb-2">{["🥇", "🥈", "🥉"][rank]}</span>
                        </div>
                        <span className="text-xs text-center max-w-[3.5rem] truncate">{app.appName}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {timeIncreases.length > 0 && (
            <Card className="border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  Pay Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeIncreases.map((a) => (
                    <div key={a.appName} className="flex items-center justify-between">
                      <span className="text-sm">{a.appName}</span>
                      <span className="text-sm text-red-400">+{fmt(a.change)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">MOST USED APPS</CardTitle></CardHeader>
            <CardContent>
              {weeklyAppUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No app data yet.</p>
              ) : (
                <div className="space-y-2">
                  {weeklyAppUsage.map((a: any) => (
                    <div key={a.appName} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT_COLOR[a.appCategory] ?? "#6366F1" }} />
                        <span className="text-sm">{a.appName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{fmt(a.timeSpentMinutes)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            data-testid="generate-report"
            variant="outline"
            className="w-full"
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
          >
            {generateReportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Weekly Report
          </Button>

          {latestReport && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  AI Weekly Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{latestReport.aiSummary}</p>
                {latestReport.aiRecommendations && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">RECOMMENDATIONS</p>
                    <div className="space-y-1">
                      {latestReport.aiRecommendations.split("\n").filter(Boolean).map((r: string, i: number) => (
                        <p key={i} className="text-sm">{r}</p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      <Dialog open={showMoodPicker} onOpenChange={setShowMoodPicker}>
        <DialogContent>
          <DialogHeader><DialogTitle>How are you feeling?</DialogTitle></DialogHeader>
          <div className="flex justify-center gap-3 py-2">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => moodMutation.mutate(m)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <span className="text-2xl">{MOOD_EMOJI[m]}</span>
                <span className="text-xs text-muted-foreground capitalize">{m}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
