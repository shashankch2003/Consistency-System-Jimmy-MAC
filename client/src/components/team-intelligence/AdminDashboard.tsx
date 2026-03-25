import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ChevronUp, ChevronDown, TrendingUp, TrendingDown,
  AlertCircle, Award, Zap, Activity, Building2,
  MoreVertical, GripVertical, Undo2, History, RotateCcw,
  ChevronRight, Users,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import MetricCard from "./shared/MetricCard";
import ScoreCircle from "./shared/ScoreCircle";
import EmployeeDetailPanel from "./shared/EmployeeDetailPanel";
import type { AdminDashboardData } from "@shared/lib/team-intelligence/types";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type SectionId = "overview" | "org-gauge" | "org-trend" | "teams-table" | "team-heatmap" | "team-bar-chart" | "team-scatter" | "risk-distribution" | "top-performers" | "recent-activity" | "ai-brief";

const DEFAULT_SECTIONS: SectionId[] = [
  "overview", "org-gauge", "org-trend", "teams-table", "team-heatmap",
  "team-bar-chart", "team-scatter", "risk-distribution", "top-performers", "recent-activity", "ai-brief",
];

interface ColorSettings { riskCardBorders: boolean; scoreCellColors: boolean; activityIcons: boolean; }
const DEFAULT_COLORS: ColorSettings = { riskCardBorders: false, scoreCellColors: true, activityIcons: false };

interface HistorySnapshot { ts: number; label: string; sections: SectionId[]; colors: ColorSettings; }

type SortKey = "teamName" | "managerName" | "memberCount" | "score" | "velocity" | "overduePercent" | "health";

/* ─── Demo data ──────────────────────────────────────────────────────────── */
const DEMO_TEAMS = [
  { teamId: "t1", teamName: "Engineering",      managerName: "Priya Nair",    memberCount: 12, score: 82, velocity: 94,  overduePercent: 8,  health: "on_track" as const },
  { teamId: "t2", teamName: "Product",          managerName: "James Okafor", memberCount: 8,  score: 76, velocity: 81,  overduePercent: 12, health: "on_track" as const },
  { teamId: "t3", teamName: "Marketing",        managerName: "Sofia Reyes",  memberCount: 7,  score: 85, velocity: 103, overduePercent: 5,  health: "on_track" as const },
  { teamId: "t4", teamName: "Design",           managerName: "Liam Chen",    memberCount: 6,  score: 71, velocity: 78,  overduePercent: 14, health: "needs_attention" as const },
  { teamId: "t5", teamName: "Operations",       managerName: "Amara Diallo", memberCount: 9,  score: 63, velocity: 65,  overduePercent: 22, health: "at_risk" as const },
  { teamId: "t6", teamName: "Data & Analytics", managerName: "Tom Keller",   memberCount: 5,  score: 79, velocity: 88,  overduePercent: 9,  health: "on_track" as const },
  { teamId: "t7", teamName: "Sales",            managerName: "Neha Sharma",  memberCount: 10, score: 74, velocity: 86,  overduePercent: 16, health: "needs_attention" as const },
];

const ALL_WEEKS = [
  { week: "Jan W1", score: 66 }, { week: "Jan W2", score: 67 }, { week: "Jan W3", score: 69 }, { week: "Jan W4", score: 68 },
  { week: "Feb W1", score: 68 }, { week: "Feb W2", score: 70 }, { week: "Feb W3", score: 72 }, { week: "Feb W4", score: 73 },
  { week: "Mar W1", score: 74 }, { week: "Mar W2", score: 77 }, { week: "Mar W3", score: 76 }, { week: "Mar W4", score: 78 },
];

const DEMO_PERFORMERS = [
  { name: "Priya Nair",      role: "Senior Engineer",     score: 94, streak: 18, dept: "Engineering",      userId: "demo-p1" },
  { name: "Sofia Reyes",     role: "Marketing Lead",      score: 91, streak: 14, dept: "Marketing",        userId: "demo-p2" },
  { name: "James Okafor",    role: "Product Manager",     score: 88, streak: 12, dept: "Product",          userId: "demo-p3" },
  { name: "Tom Keller",      role: "Data Analyst",        score: 86, streak: 10, dept: "Data & Analytics", userId: "demo-p4" },
  { name: "Neha Sharma",     role: "Sales Manager",       score: 84, streak: 9,  dept: "Sales",            userId: "demo-p5" },
  { name: "Aiko Tanaka",     role: "Frontend Engineer",   score: 83, streak: 8,  dept: "Engineering",      userId: "demo-p6" },
  { name: "Carlos Mendez",   role: "UX Designer",         score: 81, streak: 7,  dept: "Design",           userId: "demo-p7" },
  { name: "Fatima Al-Rashid",role: "Data Scientist",      score: 80, streak: 7,  dept: "Data & Analytics", userId: "demo-p8" },
  { name: "Oliver Schmidt",  role: "Backend Engineer",    score: 79, streak: 6,  dept: "Engineering",      userId: "demo-p9" },
  { name: "Yara Nwosu",      role: "Content Strategist",  score: 78, streak: 5,  dept: "Marketing",        userId: "demo-p10" },
  { name: "Dmitri Volkov",   role: "Sales Rep",           score: 77, streak: 5,  dept: "Sales",            userId: "demo-p11" },
  { name: "Mei Lin",         role: "Operations Lead",     score: 76, streak: 4,  dept: "Operations",       userId: "demo-p12" },
  { name: "Arjun Patel",     role: "Product Analyst",     score: 75, streak: 4,  dept: "Product",          userId: "demo-p13" },
  { name: "Isabelle Dupont", role: "Brand Designer",      score: 74, streak: 3,  dept: "Design",           userId: "demo-p14" },
  { name: "Kofi Mensah",     role: "Infrastructure Eng.", score: 73, streak: 3,  dept: "Engineering",      userId: "demo-p15" },
];

const DEMO_ACTIVITY = [
  { color: "text-zinc-300", bg: "", text: "Engineering team score rose 8 points this week", time: "2h ago" },
  { color: "text-zinc-400", bg: "", text: "Operations has 6 tasks overdue >5 days — review recommended", time: "4h ago" },
  { color: "text-zinc-300", bg: "", text: "Sofia Reyes achieved a 14-day productivity streak", time: "6h ago" },
  { color: "text-zinc-400", bg: "", text: "Design team velocity dipped 12% — check workload balance", time: "1d ago" },
  { color: "text-zinc-300", bg: "", text: "Marketing closed sprint with 100% task completion — 3rd consecutive sprint", time: "1d ago" },
  { color: "text-zinc-400", bg: "", text: "Sales team reached Q1 target 3 days early", time: "2d ago" },
  { color: "text-zinc-300", bg: "", text: "New member Yara Nwosu onboarded to Marketing", time: "2d ago" },
  { color: "text-zinc-400", bg: "", text: "Operations averaged 2.1h focus time vs 3h target — trending down", time: "3d ago" },
  { color: "text-zinc-300", bg: "", text: "Priya Nair completed 12 high-priority tasks this sprint", time: "3d ago" },
  { color: "text-zinc-400", bg: "", text: "Company-wide productivity score crossed 78 — new all-time high", time: "4d ago" },
];

const DEMO_BRIEF = [
  { icon: "✓", title: "Marketing is the top-performing team", body: "With a score of 85 and only 5% overdue tasks, Marketing has maintained the highest velocity for 3 consecutive sprints. Sofia Reyes is driving strong deadline adherence." },
  { icon: "⚠", title: "Operations team requires immediate attention", body: "Operations has the lowest score (63) and a 22% overdue rate — 4× the company target. Recommend a 1:1 with Amara Diallo to identify blockers and consider redistributing 2–3 tasks to Engineering." },
  { icon: "↑", title: "Organisation score is trending upward", body: "Company-wide productivity has risen from 66 in January to 78 in the current week — an 18% improvement over 12 weeks, putting the org on track to reach its Q2 target of 82." },
  { icon: "💡", title: "Focus time below target in 2 teams", body: "Operations (2.1h/day) and Design (2.7h/day) are below the recommended 3h daily deep-work baseline. Blocking morning focus hours could recover 30–40 minutes per person daily." },
  { icon: "📈", title: "Top talent retention signal strong", body: "15 employees have maintained productivity streaks of 3 days or more. Long streaks correlate with reduced churn risk — consider recognising these employees in the all-hands." },
  { icon: "🔍", title: "Sales team showing improvement", body: "The Sales team score improved from 68 to 74 over the past 4 weeks, driven by improved task completion rates. Q1 target was hit 3 days early." },
];

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function lsGet<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }
function lsSet<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

const HEALTH_BADGE: Record<string, string> = {
  on_track: "bg-green-500/20 text-green-400 border-green-500/30",
  needs_attention: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  at_risk: "bg-red-500/20 text-red-400 border-red-500/30",
};
const HEALTH_LABEL: Record<string, string> = {
  on_track: "On Track", needs_attention: "Needs Attention", at_risk: "At Risk",
};

function SLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3 ${className}`}>{children}</h2>;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc" }) {
  if (sortKey !== col) return null;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
}

/* ─── Team Drill-down Sheet ───────────────────────────────────────────── */
function TeamDetailSheet({ team, isOpen, onClose }: { team: typeof DEMO_TEAMS[0] | null; isOpen: boolean; onClose: () => void }) {
  if (!team) return null;
  const trend = Array.from({ length: 6 }, (_, i) => {
    const h = (n: number) => { let v = 0; for (let j = 0; j < team.teamId.length; j++) v = (v * 31 + team.teamId.charCodeAt(j)) >>> 0; return ((v + n * 7919) % 11) - 5; };
    return { week: `W${i + 1}`, score: Math.max(40, Math.min(100, team.score + h(i))) };
  });
  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-zinc-950 border-zinc-800 w-full sm:max-w-md overflow-y-auto" data-testid="sheet-team-detail">
        <SheetHeader>
          <SheetTitle className="text-white">{team.teamName} Team</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Manager", value: team.managerName },
              { label: "Members", value: String(team.memberCount) },
              { label: "Productivity Score", value: String(team.score) },
              { label: "Velocity", value: String(team.velocity) },
              { label: "Overdue Rate", value: `${team.overduePercent}%` },
              { label: "Health Status", value: HEALTH_LABEL[team.health] },
            ].map(({ label, value }) => (
              <Card key={label} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-3">
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">6-Week Score Trend</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="week" tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="score" stroke="#22C55E" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Risk Assessment</p>
            <Badge variant="outline" className={HEALTH_BADGE[team.health]}>{HEALTH_LABEL[team.health]}</Badge>
            {team.health === "at_risk" && <p className="text-xs text-zinc-400 mt-2">⚠ This team requires immediate attention. Overdue rate of {team.overduePercent}% exceeds the 15% threshold.</p>}
            {team.health === "needs_attention" && <p className="text-xs text-zinc-400 mt-2">Consider scheduling a team check-in to review blockers and priorities.</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function AdminDashboard({ workspaceId = "default" }: { workspaceId?: string }) {
  /* — Persistent state — */
  const [sectionOrder, _setSectionOrder] = useState<SectionId[]>(() => {
    const stored = lsGet<string[]>("ti-admin-sections", []);
    const allIds = DEFAULT_SECTIONS as string[];
    const valid = stored.filter(s => allIds.includes(s)) as SectionId[];
    const missing = DEFAULT_SECTIONS.filter(s => !stored.includes(s));
    return valid.length > 0 ? [...valid, ...missing] : DEFAULT_SECTIONS;
  });
  const [colors, _setColors] = useState<ColorSettings>(() => lsGet("ti-admin-colors", DEFAULT_COLORS));
  const [history, _setHistory] = useState<HistorySnapshot[]>(() => lsGet("ti-admin-history", []));

  /* — Ephemeral state — */
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [performersShown, setPerformersShown] = useState(5);
  const [activityShown, setActivityShown] = useState(5);
  const [briefShown, setBriefShown] = useState(2);
  const [trendFrom, setTrendFrom] = useState(0);
  const [trendTo, setTrendTo] = useState(ALL_WEEKS.length - 1);
  const [trendCustom, setTrendCustom] = useState(false);
  const [selectedPerformer, setSelectedPerformer] = useState<typeof DEMO_PERFORMERS[0] | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<typeof DEMO_TEAMS[0] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  /* — Persistence helpers — */
  const setSections = useCallback((next: SectionId[], label = "Change") => {
    _setSectionOrder(next); lsSet("ti-admin-sections", next);
    const snap: HistorySnapshot = { ts: Date.now(), label, sections: next, colors };
    const h = [snap, ...history].slice(0, 10); _setHistory(h); lsSet("ti-admin-history", h);
  }, [history, colors]);

  const setColors = useCallback((next: ColorSettings) => {
    _setColors(next); lsSet("ti-admin-colors", next);
    const snap: HistorySnapshot = { ts: Date.now(), label: "Color change", sections: sectionOrder, colors: next };
    const h = [snap, ...history].slice(0, 10); _setHistory(h); lsSet("ti-admin-history", h);
  }, [history, sectionOrder]);

  const undo = useCallback(() => {
    if (history.length < 2) return;
    const prev = history[1];
    _setSectionOrder(prev.sections); _setColors(prev.colors);
    lsSet("ti-admin-sections", prev.sections); lsSet("ti-admin-colors", prev.colors);
    const h = history.slice(1); _setHistory(h); lsSet("ti-admin-history", h);
  }, [history]);

  const restore = useCallback((snap: HistorySnapshot) => {
    _setSectionOrder(snap.sections); _setColors(snap.colors);
    lsSet("ti-admin-sections", snap.sections); lsSet("ti-admin-colors", snap.colors);
    setSettingsOpen(false);
  }, []);

  /* — API queries — */
  const { data, isLoading } = useQuery<AdminDashboardData>({ queryKey: [`/api/team-intelligence/admin-dashboard?workspaceId=${workspaceId}`] });
  const { data: insightsData } = useQuery<{ insights: any[] }>({ queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`] });

  const hasRealData = !isLoading && data?.teams && data.teams.length > 0;
  const isDemo = !isLoading && !hasRealData;

  /* — Sort teamsToShow — */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const teamsToShow = useMemo(() => {
    const source = isDemo ? DEMO_TEAMS : (data?.teams ?? []);
    return [...source].sort((a, b) => {
      const av = (a as any)[sortKey], bv = (b as any)[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [isDemo, data?.teams, sortKey, sortDir]);

  /* — Trend window — */
  const trendData = useMemo(() => {
    if (!trendCustom) return ALL_WEEKS.slice(-10);
    return ALL_WEEKS.slice(trendFrom, trendTo + 1);
  }, [trendCustom, trendFrom, trendTo]);

  /* — Derived values — */
  const executiveInsight = useMemo(() => {
    const ins = insightsData?.insights || [];
    return ins.find((i: any) => i.roleContext === "admin") || ins[0];
  }, [insightsData]);

  const orgScore   = isDemo ? 78   : (data?.orgScore ?? 0);
  const totalEmp   = isDemo ? 57   : (data?.totalEmployees ?? 0);
  const totalTasks = isDemo ? 1243 : (data?.totalTasksCompleted ?? 0);
  const deadline   = isDemo ? 87   : (data?.deadlineAdherenceRate ?? 0);
  const focusHours = isDemo ? 3.2  : Math.round((data?.avgFocusMinutes ?? 0) / 60 * 10) / 10;
  const riskDist   = isDemo ? { onTrack: 38, needsAttention: 13, atRisk: 6 } : (data?.riskDistribution ?? { onTrack: 0, needsAttention: 0, atRisk: 0 });
  const orgTrend   = isDemo ? "up" : (data?.orgTrend ?? "stable");
  const totalRisk  = riskDist.onTrack + riskDist.needsAttention + riskDist.atRisk;

  /* — Drag-to-reorder — */
  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver  = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop      = (i: number) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...sectionOrder]; next.splice(i, 0, next.splice(dragIdx, 1)[0]);
    setSections(next, "Moved section"); setDragIdx(null); setDragOverIdx(null);
  };

  /* ─── Section renderers ─────────────────────────────────────────────── */
  const SECTIONS: Record<SectionId, React.ReactNode> = {
    "overview": (
      <div>
        <SLabel>Organisation Overview</SLabel>
        {isDemo && (
          <div className="mb-3 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <p className="text-xs text-zinc-400"><span className="text-white font-medium">Preview — </span>Realistic sample data. Real numbers appear as your team logs work.</p>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard title="Org Score" value={String(orgScore)} trend={orgTrend === "up" ? "up" : orgTrend === "down" ? "down" : undefined} delta={orgTrend === "up" ? "+12 vs Jan" : undefined} />
          <MetricCard title="Total Employees" value={String(totalEmp)} subtitle={isDemo ? "across 7 teams" : undefined} />
          <MetricCard title="Tasks Completed" value={String(totalTasks)} subtitle="this quarter" />
          <MetricCard title="Deadline Adherence" value={`${deadline}%`} delta={isDemo ? "+4% MoM" : undefined} trend={isDemo ? "up" : undefined} />
          <MetricCard title="Avg Focus" value={`${focusHours}h`} subtitle="per person / day" />
        </div>
      </div>
    ),

    "org-trend": (
      <div>
        <div className="flex items-center justify-between mb-3">
          <SLabel className="mb-0">Organisation Score Trend</SLabel>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-zinc-400 hover:text-white" onClick={() => setTrendCustom(v => !v)} data-testid="button-trend-range">
            {trendCustom ? "Last 10 weeks" : "Custom range"}
          </Button>
        </div>
        {trendCustom && (
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zinc-500">From</Label>
              <select
                value={trendFrom}
                onChange={e => setTrendFrom(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1"
                data-testid="select-trend-from"
              >
                {ALL_WEEKS.map((w, i) => <option key={i} value={i}>{w.week}</option>)}
              </select>
            </div>
            <span className="text-zinc-600 text-xs">→</span>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zinc-500">To</Label>
              <select
                value={trendTo}
                onChange={e => setTrendTo(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1"
                data-testid="select-trend-to"
              >
                {ALL_WEEKS.map((w, i) => <option key={i} value={i}>{w.week}</option>)}
              </select>
            </div>
          </div>
        )}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="week" tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[55, 95]} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}`, "Org Score"]} />
                <Line type="monotone" dataKey="score" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: "#22C55E", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            {isDemo && <p className="text-xs text-zinc-600 text-center mt-1">Jan – Mar 2026 · Company-wide weekly average</p>}
          </CardContent>
        </Card>
      </div>
    ),

    "teams-table": (
      <div>
        <SLabel>Teams Overview — click any row for details</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  {(["teamName","managerName","memberCount","score","velocity","overduePercent","health"] as SortKey[]).map((col) => (
                    <TableHead
                      key={col}
                      className={`text-zinc-500 text-xs cursor-pointer select-none ${["memberCount","score","velocity","overduePercent"].includes(col) ? "text-right" : ""}`}
                      onClick={() => handleSort(col)}
                    >
                      {{"teamName":"Team","managerName":"Manager","memberCount":"Members","score":"Score","velocity":"Velocity","overduePercent":"Overdue %","health":"Health"}[col]}
                      {" "}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                    </TableHead>
                  ))}
                  <TableHead className="text-zinc-500 text-xs w-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamsToShow.map((team) => (
                  <TableRow
                    key={team.teamId}
                    className="border-zinc-800 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedTeam(team as any)}
                    data-testid={`row-team-${team.teamName.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <TableCell className="text-white font-medium text-sm">{team.teamName}</TableCell>
                    <TableCell className="text-zinc-400 text-sm">{team.managerName}</TableCell>
                    <TableCell className="text-zinc-400 text-sm text-right">{team.memberCount}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-bold ${colors.scoreCellColors ? (team.score >= 80 ? "text-green-400" : team.score >= 70 ? "text-yellow-400" : "text-red-400") : "text-white"}`}>{team.score}</span>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm text-right">{team.velocity}</TableCell>
                    <TableCell className={`text-sm text-right font-medium ${colors.scoreCellColors ? (team.overduePercent > 15 ? "text-red-400" : team.overduePercent > 10 ? "text-yellow-400" : "text-zinc-400") : "text-zinc-400"}`}>{team.overduePercent}%</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${HEALTH_BADGE[team.health]}`}>{HEALTH_LABEL[team.health]}</Badge></TableCell>
                    <TableCell><ChevronRight className="w-3.5 h-3.5 text-zinc-600" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    ),

    "team-bar-chart": (
      <div>
        <SLabel>Team Score Comparison</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teamsToShow} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="teamName" tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}`, "Score"]} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="#52525B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    ),

    "risk-distribution": (
      <div>
        <SLabel>Workforce Risk Distribution</SLabel>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "On Track", count: riskDist.onTrack, pct: totalRisk ? Math.round(riskDist.onTrack / totalRisk * 100) : 0, barClass: "bg-zinc-400" },
            { label: "Needs Attention", count: riskDist.needsAttention, pct: totalRisk ? Math.round(riskDist.needsAttention / totalRisk * 100) : 0, barClass: "bg-zinc-500" },
            { label: "At Risk", count: riskDist.atRisk, pct: totalRisk ? Math.round(riskDist.atRisk / totalRisk * 100) : 0, barClass: "bg-zinc-600" },
          ].map(({ label, count, pct, barClass }) => (
            <Card key={label} className="bg-zinc-900 border-zinc-800" data-testid={`card-risk-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">{label}</p>
                    <p className="text-4xl font-bold text-white">{count}</p>
                    <p className="text-xs text-zinc-600 mt-1">employees</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-zinc-300">{pct}%</p>
                    <p className="text-xs text-zinc-600">of workforce</p>
                  </div>
                </div>
                <div className="mt-3 w-full bg-zinc-800 rounded-full h-1.5">
                  <div className={`${barClass} h-full rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ),

    "top-performers": (
      <div>
        <SLabel>Top Performers This Month</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-2">
            {DEMO_PERFORMERS.slice(0, performersShown).map((p, idx) => (
              <button
                key={p.name}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                onClick={() => setSelectedPerformer(p)}
                data-testid={`button-performer-${p.userId}`}
              >
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    {idx === 0 && <Award className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                  <p className="text-xs text-zinc-500">{p.role} · {p.dept}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Streak</p>
                    <p className="text-xs font-medium text-zinc-300">{p.streak}d</p>
                  </div>
                  <ScoreCircle score={p.score} label="" size="sm" />
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
                </div>
              </button>
            ))}
          </CardContent>
          {performersShown < DEMO_PERFORMERS.length && (
            <div className="px-4 pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
                onClick={() => setPerformersShown(v => Math.min(v + 10, DEMO_PERFORMERS.length))}
                data-testid="button-see-more-performers"
              >
                See more ({DEMO_PERFORMERS.length - performersShown} remaining)
              </Button>
            </div>
          )}
        </Card>
      </div>
    ),

    "recent-activity": (
      <div>
        <SLabel>Recent Activity</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3 space-y-1.5">
            {DEMO_ACTIVITY.slice(0, activityShown).map((item, idx) => (
              <div key={idx} className="flex gap-3 p-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors">
                <Activity className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 flex-1">{item.text}</p>
                <p className="text-xs text-zinc-600 flex-shrink-0">{item.time}</p>
              </div>
            ))}
          </CardContent>
          {activityShown < DEMO_ACTIVITY.length && (
            <div className="px-3 pb-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
                onClick={() => setActivityShown(v => Math.min(v + 10, DEMO_ACTIVITY.length))}
                data-testid="button-see-more-activity"
              >
                See more ({DEMO_ACTIVITY.length - activityShown} remaining)
              </Button>
            </div>
          )}
        </Card>
      </div>
    ),

    "ai-brief": (
      <div>
        <SLabel>AI Executive Brief</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-zinc-500" /> Organisation Summary — Week of Mar 25, 2026
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDemo ? (
              DEMO_BRIEF.slice(0, briefShown).map((pt, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="flex-shrink-0 mt-0.5 font-bold text-zinc-400">{pt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{pt.title}</p>
                    <p className="text-sm text-zinc-400 mt-0.5 leading-relaxed">{pt.body}</p>
                  </div>
                </div>
              ))
            ) : (
              <>
                {executiveInsight ? (
                  <div className="flex gap-2"><span className="text-zinc-400 flex-shrink-0 mt-0.5">💡</span><div><p className="text-sm font-medium text-white">{executiveInsight.title}</p><p className="text-sm text-zinc-400 mt-1">{executiveInsight.message}</p></div></div>
                ) : (
                  <p className="text-sm text-zinc-400">Executive insights will appear as organisation data accumulates.</p>
                )}
              </>
            )}
            {isDemo && briefShown < DEMO_BRIEF.length && (
              <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700" onClick={() => setBriefShown(v => Math.min(v + 2, DEMO_BRIEF.length))} data-testid="button-see-more-brief">
                See more ({DEMO_BRIEF.length - briefShown} more points)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    ),

    "org-gauge": (
      <div>
        <SLabel>Org Health Gauge</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-6">
            {(() => {
              const score = orgScore;
              const angle = (score / 100) * 180;
              const R = 90; const cx = 110; const cy = 105;
              const toRad = (deg: number) => (deg - 180) * Math.PI / 180;
              const needleX = cx + R * 0.72 * Math.cos(toRad(angle));
              const needleY = cy + R * 0.72 * Math.sin(toRad(angle));
              const arcPath = (from: number, to: number, color: string) => {
                const s = { x: cx + R * Math.cos(toRad(from)), y: cy + R * Math.sin(toRad(from)) };
                const e = { x: cx + R * Math.cos(toRad(to)), y: cy + R * Math.sin(toRad(to)) };
                return <path d={`M ${s.x} ${s.y} A ${R} ${R} 0 0 1 ${e.x} ${e.y}`} stroke={color} strokeWidth={16} fill="none" strokeLinecap="round" />;
              };
              const label = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 45 ? "Moderate" : "Needs Attention";
              const labelColor = score >= 80 ? "text-green-400" : score >= 65 ? "text-blue-400" : score >= 45 ? "text-yellow-400" : "text-red-400";
              return (
                <div className="flex flex-col items-center">
                  <svg width={220} height={125} viewBox="0 0 220 125">
                    {arcPath(0, 60, "#27272A")} {arcPath(60, 120, "#27272A")} {arcPath(120, 180, "#27272A")}
                    {score > 0 && arcPath(0, Math.min(angle, 60), "#EF4444")}
                    {score > 33 && arcPath(60, Math.min(angle, 120), "#EAB308")}
                    {score > 67 && arcPath(120, Math.min(angle, 180), "#22C55E")}
                    <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#F4F4F5" strokeWidth={3} strokeLinecap="round" />
                    <circle cx={cx} cy={cy} r={6} fill="#F4F4F5" />
                    <text x={cx} y={cy - 18} textAnchor="middle" fill="#F4F4F5" fontSize={24} fontWeight="bold">{score}</text>
                    <text x={cx} y={cy - 4} textAnchor="middle" fill="#71717A" fontSize={10}>/ 100</text>
                    <text x={22} y={cy + 20} fill="#71717A" fontSize={9}>Low</text>
                    <text x={190} y={cy + 20} fill="#71717A" fontSize={9} textAnchor="end">High</text>
                  </svg>
                  <p className={`text-sm font-semibold -mt-1 ${labelColor}`}>{label}</p>
                </div>
              );
            })()}
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              {[
                { label: "Org Score", value: `${orgScore}`, sub: "overall health" },
                { label: "On Track", value: `${riskDist.onTrack}`, sub: "members", color: "text-green-400" },
                { label: "Needs Attention", value: `${riskDist.needsAttention}`, sub: "members", color: "text-yellow-400" },
                { label: "At Risk", value: `${riskDist.atRisk}`, sub: "members", color: "text-red-400" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color ?? "text-white"}`}>{item.value}</p>
                  </div>
                  <span className="text-xs text-zinc-600">{item.sub}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    ),

    "team-heatmap": (
      <div>
        <SLabel>Team Performance Matrix</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 overflow-x-auto">
            {(() => {
              const metrics = ["Score", "Velocity", "Overdue%", "Members"];
              const getVal = (t: typeof teamsToShow[0], metric: string): number => {
                if (metric === "Score") return t.score ?? 0;
                if (metric === "Velocity") return t.velocity ?? 0;
                if (metric === "Overdue%") return t.overduePercent ?? 0;
                if (metric === "Members") return t.memberCount ?? 0;
                return 0;
              };
              const maxes: Record<string, number> = {};
              metrics.forEach(m => { maxes[m] = Math.max(...teamsToShow.map(t => getVal(t, m)), 1); });
              const cellBg = (val: number, max: number, invert = false) => {
                const pct = val / max;
                const adj = invert ? 1 - pct : pct;
                if (adj < 0.2) return "#27272A";
                if (adj < 0.4) return "#166534";
                if (adj < 0.6) return "#15803D";
                if (adj < 0.8) return "#16A34A";
                return "#22C55E";
              };
              return (
                <table className="w-full text-xs border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="text-left text-zinc-500 pr-3 pb-1 font-normal w-24">Team</th>
                      {metrics.map(m => <th key={m} className="text-zinc-500 pb-1 font-normal text-center px-1">{m}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {teamsToShow.slice(0, 10).map((t, i) => (
                      <tr key={i}>
                        <td className="text-zinc-300 pr-3 py-0.5 truncate max-w-[80px]">{t.teamName}</td>
                        {metrics.map(m => {
                          const val = getVal(t, m);
                          const bg = cellBg(val, maxes[m], m === "Overdue%");
                          return (
                            <td key={m} className="text-center py-0.5 px-1">
                              <div className="rounded px-1.5 py-1 text-white text-[11px] font-mono" style={{ backgroundColor: bg, minWidth: 36 }} title={`${t.teamName} – ${m}: ${val}`}>
                                {val}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-zinc-600">Low</span>
              {["#27272A","#166534","#15803D","#16A34A","#22C55E"].map((c, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: c }} />
              ))}
              <span className="text-[10px] text-zinc-600">High</span>
            </div>
          </CardContent>
        </Card>
      </div>
    ),

    "team-scatter": (
      <div>
        <SLabel>Risk vs Performance — Team View</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {teamsToShow.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">No team data yet.</p>
            ) : (() => {
              const scatterData = teamsToShow.map(t => ({
                name: t.teamName,
                score: t.score ?? 0,
                overdue: t.overduePercent ?? 0,
                size: (t.memberCount ?? 5) * 40,
              }));
              const COLORS_SCATTER = ["#22C55E","#3B82F6","#EAB308","#F97316","#A855F7","#EC4899","#14B8A6"];
              return (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis dataKey="score" name="Score" type="number" domain={[0, 100]} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "Score →", position: "insideBottomRight", offset: -5, fill: "#52525B", fontSize: 10 }} />
                      <YAxis dataKey="overdue" name="Overdue%" type="number" domain={[0, 100]} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "Overdue% ↑", angle: -90, position: "insideLeft", fill: "#52525B", fontSize: 10 }} />
                      <ZAxis dataKey="size" range={[40, 400]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3", stroke: "#3F3F46" }}
                        contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="p-2 text-xs">
                              <p className="font-semibold text-white mb-1">{d.name}</p>
                              <p className="text-zinc-400">Score: <span className="text-white">{d.score}</span></p>
                              <p className="text-zinc-400">Overdue: <span className="text-white">{d.overdue}%</span></p>
                            </div>
                          );
                        }}
                      />
                      <Scatter data={scatterData} shape={(props: any) => {
                        const idx = scatterData.findIndex(d => d.name === props.name);
                        return <circle cx={props.cx} cy={props.cy} r={Math.sqrt(props.size / Math.PI)} fill={COLORS_SCATTER[idx % COLORS_SCATTER.length]} fillOpacity={0.8} stroke="#18181B" strokeWidth={1} />;
                      }} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {scatterData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS_SCATTER[i % COLORS_SCATTER.length] }} />
                        <span className="text-[10px] text-zinc-500">{d.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-2">Bubble size = team size. High score + low overdue = top-right quadrant.</p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    ),
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 bg-zinc-800 rounded-xl" />
        <Skeleton className="h-48 bg-zinc-800 rounded-xl" />
        <Skeleton className="h-48 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-end px-6 pt-4 pb-0">
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white" data-testid="button-admin-settings">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="bg-zinc-900 border-zinc-700 w-72 p-0">
            <AdminSettingsPanel colors={colors} setColors={setColors} history={history} canUndo={history.length >= 2} onUndo={undo} onRestore={restore} onReset={() => { setSections(DEFAULT_SECTIONS, "Reset"); setColors(DEFAULT_COLORS); }} />
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
            className={`relative group transition-all ${dragOverIdx === idx && dragIdx !== idx ? "ring-2 ring-zinc-600 ring-offset-2 ring-offset-zinc-950 rounded-xl" : ""}`}
            data-testid={`section-${id}`}
          >
            <div className="absolute left-0 top-6 -translate-x-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab z-10">
              <GripVertical className="w-4 h-4 text-zinc-600" />
            </div>
            {SECTIONS[id]}
          </div>
        ))}
      </div>

      {/* Employee detail from Top Performers click */}
      <EmployeeDetailPanel
        workspaceId={workspaceId}
        employeeUserId={selectedPerformer?.userId || ""}
        memberName={selectedPerformer?.name}
        memberRole={selectedPerformer?.role}
        isOpen={!!selectedPerformer}
        onClose={() => setSelectedPerformer(null)}
      />

      {/* Team drill-down */}
      <TeamDetailSheet
        team={selectedTeam as any}
        isOpen={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
      />
    </div>
  );
}

/* ─── Admin Settings Panel ────────────────────────────────────────────────── */
function AdminSettingsPanel({ colors, setColors, history, canUndo, onUndo, onRestore, onReset }: {
  colors: ColorSettings; setColors: (c: ColorSettings) => void;
  history: HistorySnapshot[]; canUndo: boolean;
  onUndo: () => void; onRestore: (s: HistorySnapshot) => void; onReset: () => void;
}) {
  const [view, setView] = useState<"main" | "history">("main");
  if (view === "history") {
    return (
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400" onClick={() => setView("main")}><RotateCcw className="w-3.5 h-3.5" /></Button>
          <p className="text-xs font-medium text-white">Version History</p>
        </div>
        {history.length === 0 && <p className="text-xs text-zinc-500 text-center py-2">No history yet.</p>}
        {history.map((snap, i) => (
          <button key={snap.ts} className="w-full flex items-center justify-between p-2 rounded hover:bg-zinc-800 text-left" onClick={() => onRestore(snap)}>
            <div><p className="text-xs text-zinc-300">{snap.label}</p><p className="text-[10px] text-zinc-600">{new Date(snap.ts).toLocaleString()}</p></div>
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
          { key: "scoreCellColors" as const, label: "Score & overdue cell colors" },
          { key: "riskCardBorders" as const, label: "Risk card colored borders" },
          { key: "activityIcons" as const, label: "Activity icon colors" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <Label className="text-xs text-zinc-300 cursor-pointer">{label}</Label>
            <Switch checked={colors[key]} onCheckedChange={(v) => setColors({ ...colors, [key]: v })} />
          </div>
        ))}
      </div>
      <Separator className="bg-zinc-800" />
      <div className="space-y-1.5">
        <p className="text-xs text-zinc-500 font-medium">Layout</p>
        <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-zinc-400 hover:text-white justify-start gap-2 px-1" disabled={!canUndo} onClick={onUndo}><Undo2 className="w-3.5 h-3.5" /> Undo last change</Button>
        <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-zinc-400 hover:text-white justify-start gap-2 px-1" onClick={() => setView("history")}><History className="w-3.5 h-3.5" /> Version history</Button>
        <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-zinc-400 hover:text-white justify-start gap-2 px-1" onClick={onReset}><RotateCcw className="w-3.5 h-3.5" /> Reset to default</Button>
      </div>
    </div>
  );
}
