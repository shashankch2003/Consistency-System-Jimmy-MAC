import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown, ChevronUp, Zap, MoreVertical, GripVertical,
  Undo2, History, RotateCcw,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Tooltip,
} from "recharts";
import ScoreCircle from "./shared/ScoreCircle";
import MetricCard from "./shared/MetricCard";
import InsightCard from "./shared/InsightCard";
import ComparisonDrawer from "./shared/ComparisonDrawer";
import { useAuth } from "@/hooks/use-auth";
import type { EmployeeDashboardData, DailySnapshotData } from "@shared/lib/team-intelligence/types";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type SectionId = "morning-brief" | "score-overview" | "time-distribution" | "task-performance" | "productivity-trend" | "compare-periods" | "ai-insights";

const DEFAULT_SECTIONS: SectionId[] = [
  "morning-brief", "score-overview", "time-distribution",
  "task-performance", "productivity-trend", "compare-periods", "ai-insights",
];

const SECTION_LABELS: Record<SectionId, string> = {
  "morning-brief": "Morning Brief",
  "score-overview": "Score Overview",
  "time-distribution": "Time Distribution",
  "task-performance": "Task Performance",
  "productivity-trend": "Productivity Trend",
  "compare-periods": "Compare Periods",
  "ai-insights": "AI Insights",
};

interface ColorSettings {
  trendLineGreen: boolean;
  taskBarsColored: boolean;
  insightBadgeColors: boolean;
  pieColors: boolean;
}

const DEFAULT_COLORS: ColorSettings = {
  trendLineGreen: true,
  taskBarsColored: true,
  insightBadgeColors: true,
  pieColors: true,
};

interface HistorySnapshot {
  ts: number;
  label: string;
  sections: SectionId[];
  colors: ColorSettings;
}

/* ─── LocalStorage helper ────────────────────────────────────────────────── */
function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ─── Date helpers ───────────────────────────────────────────────────────── */
function todayStr() { return new Date().toISOString().split("T")[0]; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; }
function formatDate(dateStr: string) { return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function formatDay(dateStr: string) { return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }); }

/* ─── Demo time distribution data (shown when no real data exists) ───────── */
const DEMO_PIE = [
  { name: "Deep Work", value: 195, fill: "#3F3F46" },
  { name: "Shallow Work", value: 120, fill: "#52525B" },
  { name: "Meetings", value: 75, fill: "#71717A" },
  { name: "Other", value: 30, fill: "#27272A" },
];

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function EmployeeDashboard({ workspaceId = "default" }: { workspaceId?: string }) {
  const { user } = useAuth();

  /* — Persistent state (localStorage) — */
  const [sectionOrder, _setSectionOrder] = useState<SectionId[]>(() => {
    const stored = lsGet<SectionId[]>("ti-emp-sections", DEFAULT_SECTIONS);
    return stored.length === DEFAULT_SECTIONS.length ? stored : DEFAULT_SECTIONS;
  });
  const [colors, _setColors] = useState<ColorSettings>(() => lsGet("ti-emp-colors", DEFAULT_COLORS));
  const [briefOpen, _setBriefOpen] = useState<boolean>(() => lsGet("ti-emp-brief-open", true));
  const [history, _setHistory] = useState<HistorySnapshot[]>(() => lsGet("ti-emp-history", []));

  /* — Ephemeral state — */
  const [taskRange, setTaskRange] = useState<"7d" | "30d" | "custom">("7d");
  const [taskFrom, setTaskFrom] = useState(daysAgo(7));
  const [taskTo, setTaskTo] = useState(todayStr());
  const [trendFrom, setTrendFrom] = useState(daysAgo(14));
  const [trendTo, setTrendTo] = useState(todayStr());
  const [trendCustom, setTrendCustom] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  /* — Helpers that persist — */
  const setSectionOrder = useCallback((next: SectionId[], label = "Layout change") => {
    _setSectionOrder(next);
    lsSet("ti-emp-sections", next);
    const snap: HistorySnapshot = { ts: Date.now(), label, sections: next, colors };
    const newHist = [snap, ...history].slice(0, 10);
    _setHistory(newHist);
    lsSet("ti-emp-history", newHist);
  }, [history, colors]);

  const setColors = useCallback((next: ColorSettings) => {
    _setColors(next);
    lsSet("ti-emp-colors", next);
    const snap: HistorySnapshot = { ts: Date.now(), label: "Color change", sections: sectionOrder, colors: next };
    const newHist = [snap, ...history].slice(0, 10);
    _setHistory(newHist);
    lsSet("ti-emp-history", newHist);
  }, [history, sectionOrder]);

  const setBriefOpen = (v: boolean) => { _setBriefOpen(v); lsSet("ti-emp-brief-open", v); };

  const undo = useCallback(() => {
    if (history.length < 2) return;
    const prev = history[1];
    _setSectionOrder(prev.sections);
    _setColors(prev.colors);
    lsSet("ti-emp-sections", prev.sections);
    lsSet("ti-emp-colors", prev.colors);
    const newHist = history.slice(1);
    _setHistory(newHist);
    lsSet("ti-emp-history", newHist);
  }, [history]);

  const restoreSnapshot = useCallback((snap: HistorySnapshot) => {
    _setSectionOrder(snap.sections);
    _setColors(snap.colors);
    lsSet("ti-emp-sections", snap.sections);
    lsSet("ti-emp-colors", snap.colors);
    setSettingsOpen(false);
  }, []);

  const resetLayout = () => {
    setSectionOrder(DEFAULT_SECTIONS, "Reset to default");
    setColors(DEFAULT_COLORS);
  };

  /* — API queries (30-day window) — */
  const fromStr = daysAgo(30);
  const toStr = todayStr();

  const { data: dashboard, isLoading: dashLoading } = useQuery<EmployeeDashboardData>({
    queryKey: [`/api/team-intelligence/my-dashboard?workspaceId=${workspaceId}&from=${fromStr}&to=${toStr}`],
  });
  const { data: insightsData, isLoading: insightsLoading } = useQuery<{ insights: any[]; total: number }>({
    queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`],
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/team-intelligence/insights/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`] }),
  });

  /* — Computed data — */
  const recent = dashboard?.recentSnapshots || [];
  const scores = dashboard?.currentScores;
  const streak = dashboard?.streak ?? 0;
  const insights = insightsData?.insights || [];
  const today = dashboard?.todaySnapshot;

  const morningInsight = useMemo(() =>
    insights.find((i: any) => i.category === "suggestion" || i.category === "pattern"),
    [insights]);

  const prevScore = recent.length >= 2 ? recent[1]?.productivityScore : null;
  const trend = scores && prevScore != null
    ? (scores.total > prevScore ? "up" : scores.total < prevScore ? "down" : "stable")
    : "stable";

  const totalScore = scores?.total ?? 0;
  const focusHours = Math.round((today?.deepWorkMinutes ?? 0) / 60 * 10) / 10;
  const tasksCompleted = today?.tasksCompleted ?? 0;
  const tasksOverdue = today?.tasksOverdue ?? 0;

  /* — Task performance range filtering — */
  const taskDataSlice = useMemo(() => {
    const sorted = [...recent].reverse();
    if (taskRange === "7d") return sorted.filter(s => s.date >= daysAgo(7));
    if (taskRange === "30d") return sorted.filter(s => s.date >= daysAgo(30));
    return sorted.filter(s => s.date >= taskFrom && s.date <= taskTo);
  }, [recent, taskRange, taskFrom, taskTo]);

  /* — Productivity trend range filtering — */
  const trendData = useMemo(() => {
    const sorted = [...recent].reverse();
    if (!trendCustom) return sorted.filter(s => s.date >= daysAgo(14));
    return sorted.filter(s => s.date >= trendFrom && s.date <= trendTo);
  }, [recent, trendCustom, trendFrom, trendTo]);

  /* — Pie chart data — */
  const pieData = useMemo(() => {
    if (!today) return [];
    const deep = today.deepWorkMinutes;
    const shallow = today.shallowWorkMinutes;
    const meetings = today.meetingTimeMinutes;
    const other = Math.max(0, today.activeTimeMinutes - deep - shallow - meetings);
    const COLORS = colors.pieColors
      ? ["#3B82F6", "#6B7280", "#8B5CF6", "#22C55E"]
      : ["#3F3F46", "#52525B", "#71717A", "#27272A"];
    return [
      { name: "Deep Work", value: deep, fill: COLORS[0] },
      { name: "Shallow Work", value: shallow, fill: COLORS[1] },
      { name: "Meetings", value: meetings, fill: COLORS[2] },
      { name: "Other", value: other, fill: COLORS[3] },
    ];
  }, [today, colors.pieColors]);

  const barData = useMemo(() =>
    taskDataSlice.map((s: DailySnapshotData) => ({
      day: formatDay(s.date), date: s.date,
      Completed: s.tasksCompleted, Assigned: s.tasksAssigned,
    })), [taskDataSlice]);

  const deadlineAdherence = useMemo(() => {
    const assigned = taskDataSlice.reduce((s, d) => s + d.tasksAssigned, 0);
    const overdue = taskDataSlice.reduce((s, d) => s + d.tasksOverdue, 0);
    return assigned > 0 ? Math.round(((assigned - overdue) / assigned) * 100) : 100;
  }, [taskDataSlice]);

  /* ─── Drag-to-reorder handlers ───────────────────────────────────────── */
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...sectionOrder];
    next.splice(idx, 0, next.splice(dragIdx, 1)[0]);
    setSectionOrder(next, "Moved section");
    setDragIdx(null);
    setDragOverIdx(null);
  };

  /* ─── Loading / empty states ─────────────────────────────────────────── */
  if (dashLoading) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <Skeleton className="h-28 w-full bg-zinc-800 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full bg-zinc-800 rounded-xl" />
        <Skeleton className="h-64 w-full bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!dashboard || recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-zinc-400 text-sm max-w-md">
          No productivity data yet. Complete tasks and focus sessions to start seeing your dashboard.
        </p>
      </div>
    );
  }

  /* ─── Section renderers ───────────────────────────────────────────────── */
  const SECTIONS: Record<SectionId, React.ReactNode> = {
    "morning-brief": (
      <Collapsible open={briefOpen} onOpenChange={setBriefOpen}>
        <Card className="bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">☀️</span>
              <span className="text-base font-semibold text-white">Morning Brief</span>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400" data-testid="button-toggle-brief">
                {briefOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 space-y-3">
              {morningInsight ? (
                <>
                  <p className="text-white font-medium">{morningInsight.title}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{morningInsight.message}</p>
                </>
              ) : (
                <>
                  <p className="text-white font-medium">Good morning!</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">Complete tasks and focus sessions to receive personalised insights.</p>
                </>
              )}
              {today && (
                <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Today so far</p>
                  <p className="text-sm text-zinc-300">
                    Score: <span className="text-white font-medium">{totalScore}</span> · Tasks: <span className="text-white font-medium">{tasksCompleted}</span> · Focus: <span className="text-white font-medium">{focusHours}h</span>
                  </p>
                </div>
              )}
              <div className="pt-1">
                <Button size="sm" variant="outline" className="gap-1.5 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800" data-testid="button-start-focus">
                  <Zap className="w-3.5 h-3.5" />
                  Start Focus Session
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ),

    "score-overview": (
      <div>
        <SectionLabel>Score Overview</SectionLabel>
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
          <div className="flex justify-center lg:justify-start">
            <ScoreCircle score={totalScore} label="Productivity" trend={trend as "up" | "down" | "stable"} size="lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
            <MetricCard title="Tasks Completed" value={String(tasksCompleted)} delta={tasksCompleted > 0 ? `+${tasksCompleted}` : undefined} trend={tasksCompleted > 0 ? "up" : undefined} />
            <MetricCard title="Focus Time" value={`${focusHours}h`} />
            <MetricCard title="Overdue Tasks" value={String(tasksOverdue)} delta={tasksOverdue > 0 ? `+${tasksOverdue}` : undefined} trend={tasksOverdue > 0 ? "down" : undefined} />
            <MetricCard title="Day Streak" value={String(streak)} subtitle="consecutive days" />
          </div>
        </div>
      </div>
    ),

    "time-distribution": (
      <div>
        <SectionLabel>Time Distribution — Today</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                      {pieData.map(e => <Cell key={e.name} fill={e.fill} />)}
                    </Pie>
                    <ReTooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {pieData.map(seg => (
                    <div key={seg.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.fill }} />
                      <span className="text-xs text-zinc-400">{seg.name}</span>
                      <span className="text-xs text-zinc-600">{seg.value}min</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-zinc-600 mb-4 text-center">No data recorded today — preview of how this looks with data:</p>
                <div className="flex flex-col md:flex-row items-center gap-6 opacity-50">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={DEMO_PIE} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                        {DEMO_PIE.map(e => <Cell key={e.name} fill={e.fill} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {DEMO_PIE.map(seg => (
                      <div key={seg.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.fill }} />
                        <span className="text-xs text-zinc-400">{seg.name}</span>
                        <span className="text-xs text-zinc-600">{seg.value}min</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    ),

    "task-performance": (
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel className="mb-0">Task Performance</SectionLabel>
          <div className="flex items-center gap-1">
            {(["7d", "30d", "custom"] as const).map(r => (
              <Button
                key={r}
                size="sm"
                variant={taskRange === r ? "secondary" : "ghost"}
                className={`h-7 px-2.5 text-xs ${taskRange === r ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                onClick={() => setTaskRange(r)}
                data-testid={`button-task-range-${r}`}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "Custom"}
              </Button>
            ))}
          </div>
        </div>
        {taskRange === "custom" && (
          <div className="flex items-center gap-2 mb-3">
            <Input type="date" value={taskFrom} onChange={e => setTaskFrom(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 w-36" data-testid="input-task-from" />
            <span className="text-zinc-600 text-xs">→</span>
            <Input type="date" value={taskTo} onChange={e => setTaskTo(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 w-36" data-testid="input-task-to" />
          </div>
        )}
        <div className="space-y-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-500 text-xs">Day</TableHead>
                    <TableHead className="text-zinc-500 text-xs text-right">Assigned</TableHead>
                    <TableHead className="text-zinc-500 text-xs text-right">Completed</TableHead>
                    <TableHead className="text-zinc-500 text-xs text-right">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskDataSlice.map((row: DailySnapshotData) => (
                    <TableRow key={row.date} className="border-zinc-800 hover:bg-zinc-800/50" data-testid={`row-task-${row.date}`}>
                      <TableCell className="text-zinc-300 text-sm font-medium">{formatDate(row.date)}</TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">{row.tasksAssigned}</TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">{row.tasksCompleted}</TableCell>
                      <TableCell className={`text-sm text-right ${row.tasksOverdue > 0 ? "text-red-400" : "text-zinc-400"}`}>{row.tasksOverdue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {barData.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                    <XAxis dataKey="day" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <ReTooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8 }} />
                    <Bar dataKey="Assigned" fill={colors.taskBarsColored ? "#52525B" : "#3F3F46"} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill={colors.taskBarsColored ? "#22C55E" : "#71717A"} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Deadline Adherence</p>
                <p className={`text-xl font-bold ${deadlineAdherence >= 80 ? "text-green-400" : deadlineAdherence >= 60 ? "text-yellow-400" : "text-red-400"}`}>{deadlineAdherence}%</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Avg Focus / Day</p>
                <p className="text-xl font-bold text-white">
                  {taskDataSlice.length > 0 ? Math.round(taskDataSlice.reduce((s, d) => s + d.deepWorkMinutes, 0) / taskDataSlice.length / 60 * 10) / 10 : 0}h
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    ),

    "productivity-trend": (
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel className="mb-0">Productivity Trend</SectionLabel>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
            onClick={() => setTrendCustom(v => !v)}
            data-testid="button-toggle-trend-range"
          >
            {trendCustom ? "14-day view" : "Custom range"}
          </Button>
        </div>
        {trendCustom && (
          <div className="flex items-center gap-2 mb-3">
            <Input type="date" value={trendFrom} onChange={e => setTrendFrom(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 w-36" data-testid="input-trend-from" />
            <span className="text-zinc-600 text-xs">→</span>
            <Input type="date" value={trendTo} onChange={e => setTrendTo(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white text-xs h-8 w-36" data-testid="input-trend-to" />
          </div>
        )}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8 }} labelFormatter={formatDate} />
                  <Line
                    type="monotone"
                    dataKey="productivityScore"
                    name="Score"
                    stroke={colors.trendLineGreen ? "#22C55E" : "#71717A"}
                    strokeWidth={2}
                    dot={{ fill: colors.trendLineGreen ? "#22C55E" : "#71717A", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">Not enough data for the selected range.</p>
            )}
          </CardContent>
        </Card>
      </div>
    ),

    "compare-periods": (
      <div>
        <SectionLabel>Compare Periods</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Select two time periods to compare your productivity metrics side by side.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 whitespace-nowrap"
              onClick={() => setIsComparisonOpen(true)}
              data-testid="button-compare-periods"
            >
              Compare
            </Button>
          </CardContent>
        </Card>
      </div>
    ),

    "ai-insights": (
      <div>
        <SectionLabel>AI Insights</SectionLabel>
        {insightsLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}</div>
        ) : insights.length > 0 ? (
          <div className="space-y-3">
            {insights.filter((i: any) => !i.isDismissed).map((ins: any) => (
              <InsightCard
                key={ins.id}
                category={ins.category}
                title={ins.title}
                message={ins.message}
                confidence={ins.confidence}
                timestamp={ins.createdAt ? new Date(ins.createdAt).toLocaleDateString() : ""}
                isRead={ins.isRead}
                showColors={colors.insightBadgeColors}
                onMarkRead={() => markReadMut.mutate(ins.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500 text-sm">No active insights. Check back later.</CardContent>
          </Card>
        )}
      </div>
    ),
  };

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto">
      {/* Settings button */}
      <div className="flex justify-end px-6 pt-4 pb-0">
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white" data-testid="button-dashboard-settings">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="bg-zinc-900 border-zinc-700 w-72 p-0">
            <SettingsPanel
              colors={colors}
              setColors={setColors}
              history={history}
              canUndo={history.length >= 2}
              onUndo={undo}
              onRestoreSnapshot={restoreSnapshot}
              onReset={resetLayout}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-6 px-6 pb-6">
        {sectionOrder.map((id, idx) => (
          <div
            key={id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className={`relative group transition-all ${dragOverIdx === idx && dragIdx !== idx ? "ring-2 ring-zinc-500 ring-offset-2 ring-offset-zinc-950 rounded-xl" : ""}`}
            data-testid={`section-${id}`}
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab z-10">
              <GripVertical className="w-4 h-4 text-zinc-600" />
            </div>
            {SECTIONS[id]}
          </div>
        ))}
      </div>

      <ComparisonDrawer
        workspaceId={workspaceId}
        userId={user?.id}
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
      />
    </div>
  );
}

/* ─── Settings panel ─────────────────────────────────────────────────────── */
function SettingsPanel({
  colors, setColors, history, canUndo, onUndo, onRestoreSnapshot, onReset,
}: {
  colors: ColorSettings;
  setColors: (c: ColorSettings) => void;
  history: HistorySnapshot[];
  canUndo: boolean;
  onUndo: () => void;
  onRestoreSnapshot: (s: HistorySnapshot) => void;
  onReset: () => void;
}) {
  const [view, setView] = useState<"main" | "history">("main");

  if (view === "history") {
    return (
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400" onClick={() => setView("main")}>
            <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
          </Button>
          <p className="text-xs font-medium text-white">Version History</p>
        </div>
        {history.length === 0 && <p className="text-xs text-zinc-500 text-center py-2">No history yet.</p>}
        {history.map((snap, i) => (
          <button
            key={snap.ts}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-zinc-800 text-left transition-colors"
            onClick={() => onRestoreSnapshot(snap)}
          >
            <div>
              <p className="text-xs text-zinc-300">{snap.label}</p>
              <p className="text-[10px] text-zinc-600">{new Date(snap.ts).toLocaleString()}</p>
            </div>
            {i === 0 && <span className="text-[10px] text-zinc-500">current</span>}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Customise Dashboard</p>
      <Separator className="bg-zinc-800" />

      <div className="space-y-2.5">
        <p className="text-xs text-zinc-500 font-medium">Colors</p>
        {[
          { key: "trendLineGreen" as const, label: "Productivity trend (green line)" },
          { key: "taskBarsColored" as const, label: "Task performance bars" },
          { key: "insightBadgeColors" as const, label: "AI insight badges" },
          { key: "pieColors" as const, label: "Time distribution chart" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300 cursor-pointer">{label}</Label>
            <Switch
              checked={colors[key]}
              onCheckedChange={(v) => setColors({ ...colors, [key]: v })}
              data-testid={`switch-color-${key}`}
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-zinc-400 hover:text-white justify-start px-0"
          onClick={() => setColors({ trendLineGreen: false, taskBarsColored: false, insightBadgeColors: false, pieColors: false })}
        >
          Turn off all colors
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-zinc-400 hover:text-white justify-start px-0"
          onClick={() => setColors({ trendLineGreen: true, taskBarsColored: true, insightBadgeColors: true, pieColors: true })}
        >
          Turn on all colors
        </Button>
      </div>

      <Separator className="bg-zinc-800" />

      <div className="space-y-1.5">
        <p className="text-xs text-zinc-500 font-medium">Layout</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-zinc-400 hover:text-white justify-start gap-2 px-1"
          disabled={!canUndo}
          onClick={onUndo}
          data-testid="button-undo"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo last change
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-zinc-400 hover:text-white justify-start gap-2 px-1"
          onClick={() => setView("history")}
          data-testid="button-version-history"
        >
          <History className="w-3.5 h-3.5" /> Version history
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-zinc-400 hover:text-white justify-start gap-2 px-1"
          onClick={onReset}
          data-testid="button-reset-layout"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset to default
        </Button>
      </div>
    </div>
  );
}

/* ─── Section label helper ───────────────────────────────────────────────── */
function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3 ${className}`}>{children}</h2>;
}
