import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronUp, ChevronDown, TrendingUp, TrendingDown, Minus,
  Users, Target, Clock, CheckCircle2, AlertCircle, Award, Zap,
  Activity, BarChart3, Building2,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import MetricCard from "./shared/MetricCard";
import ScoreCircle from "./shared/ScoreCircle";
import type { AdminDashboardData } from "@shared/lib/team-intelligence/types";

const HEALTH_BADGE: Record<string, string> = {
  on_track: "bg-green-500/20 text-green-400 border-green-500/30",
  needs_attention: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  at_risk: "bg-red-500/20 text-red-400 border-red-500/30",
};
const HEALTH_LABEL: Record<string, string> = {
  on_track: "On Track",
  needs_attention: "Needs Attention",
  at_risk: "At Risk",
};
const TEAM_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#06B6D4"];

type SortKey = "teamName" | "managerName" | "memberCount" | "score" | "velocity" | "overduePercent" | "health";

const DEMO_TEAMS = [
  { teamId: "t1", teamName: "Engineering",  managerName: "Priya Nair",      memberCount: 12, score: 82, velocity: 94,  overduePercent: 8,  health: "on_track" as const },
  { teamId: "t2", teamName: "Product",      managerName: "James Okafor",    memberCount: 8,  score: 76, velocity: 81,  overduePercent: 12, health: "on_track" as const },
  { teamId: "t3", teamName: "Marketing",    managerName: "Sofia Reyes",     memberCount: 7,  score: 85, velocity: 103, overduePercent: 5,  health: "on_track" as const },
  { teamId: "t4", teamName: "Design",       managerName: "Liam Chen",       memberCount: 6,  score: 71, velocity: 78,  overduePercent: 14, health: "needs_attention" as const },
  { teamId: "t5", teamName: "Operations",   managerName: "Amara Diallo",    memberCount: 9,  score: 63, velocity: 65,  overduePercent: 22, health: "at_risk" as const },
  { teamId: "t6", teamName: "Data & Analytics", managerName: "Tom Keller",  memberCount: 5,  score: 79, velocity: 88,  overduePercent: 9,  health: "on_track" as const },
  { teamId: "t7", teamName: "Sales",        managerName: "Neha Sharma",     memberCount: 10, score: 74, velocity: 86,  overduePercent: 16, health: "needs_attention" as const },
];

const DEMO_ORG_TREND = [
  { week: "Jan W1", score: 66 }, { week: "Jan W3", score: 69 }, { week: "Feb W1", score: 68 },
  { week: "Feb W3", score: 72 }, { week: "Mar W1", score: 74 }, { week: "Mar W2", score: 77 },
  { week: "Mar W3", score: 76 }, { week: "Mar W4", score: 78 },
];

const DEMO_TOP_PERFORMERS = [
  { name: "Priya Nair",       role: "Senior Engineer",     score: 94, streak: 18, dept: "Engineering" },
  { name: "Sofia Reyes",      role: "Marketing Lead",      score: 91, streak: 14, dept: "Marketing" },
  { name: "James Okafor",     role: "Product Manager",     score: 88, streak: 12, dept: "Product" },
  { name: "Tom Keller",       role: "Data Analyst",        score: 86, streak: 10, dept: "Data & Analytics" },
  { name: "Neha Sharma",      role: "Sales Manager",       score: 84, streak: 9,  dept: "Sales" },
];

const DEMO_ACTIVITY = [
  { icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10", text: "Engineering team score rose 8 points this week", time: "2h ago" },
  { icon: AlertCircle, color: "text-red-400",   bg: "bg-red-500/10",   text: "Operations has 6 tasks overdue >5 days — review recommended", time: "4h ago" },
  { icon: Award,       color: "text-yellow-400",bg: "bg-yellow-500/10",text: "Sofia Reyes achieved a 14-day productivity streak", time: "6h ago" },
  { icon: TrendingDown,color: "text-orange-400",bg: "bg-orange-500/10",text: "Design team velocity dipped 12% — check workload balance", time: "1d ago" },
  { icon: CheckCircle2,color: "text-blue-400",  bg: "bg-blue-500/10",  text: "Marketing closed sprint with 100% task completion — 3rd consecutive sprint", time: "1d ago" },
];

const DEMO_BRIEF_POINTS = [
  {
    icon: "✓", color: "text-green-400",
    title: "Marketing is the top-performing team",
    body: "With a score of 85 and only 5% overdue tasks, the Marketing team has maintained the highest velocity in the organisation for 3 consecutive sprints. Sofia Reyes is driving strong deadline adherence.",
  },
  {
    icon: "⚠", color: "text-yellow-400",
    title: "Operations team requires immediate attention",
    body: "Operations has the lowest score (63) and a 22% overdue rate — more than 4× the company target. Recommend a 1:1 review with Amara Diallo to identify blockers and consider redistributing 2–3 tasks to Engineering.",
  },
  {
    icon: "↑", color: "text-blue-400",
    title: "Organisation score is trending upward",
    body: "The company-wide productivity score has risen from 66 in January to 78 in the current week — a 18% improvement over 10 weeks. This puts the organisation on track to reach its Q2 target of 82.",
  },
  {
    icon: "💡", color: "text-purple-400",
    title: "Focus time below target in 2 of 7 teams",
    body: "Operations (2.1h/day) and Design (2.7h/day) are below the recommended 3h daily deep-work baseline. Blocking morning focus hours in those calendars could recover an estimated 30–40 minutes per person daily.",
  },
];

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc" }) {
  if (sortKey !== col) return null;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">{children}</h2>;
}

export default function AdminDashboard({ workspaceId = "default" }: { workspaceId?: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useQuery<AdminDashboardData>({
    queryKey: [`/api/team-intelligence/admin-dashboard?workspaceId=${workspaceId}`],
  });

  const { data: insightsData } = useQuery<{ insights: any[]; total: number }>({
    queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`],
  });

  const hasRealData = !isLoading && data && data.teams && data.teams.length > 0;
  const isDemo = !isLoading && !hasRealData;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const teamsToShow = useMemo(() => {
    const source = isDemo ? DEMO_TEAMS : (data?.teams ?? []);
    return [...source].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [isDemo, data?.teams, sortKey, sortDir]);

  const executiveInsight = useMemo(() => {
    const ins = insightsData?.insights || [];
    return ins.find((i: any) => i.roleContext === "admin") || ins[0];
  }, [insightsData]);

  const orgScore   = isDemo ? 78      : (data?.orgScore ?? 0);
  const totalEmp   = isDemo ? 57      : (data?.totalEmployees ?? 0);
  const totalTasks = isDemo ? 1243    : (data?.totalTasksCompleted ?? 0);
  const deadline   = isDemo ? 87      : (data?.deadlineAdherenceRate ?? 0);
  const focusHours = isDemo ? 3.2     : Math.round((data?.avgFocusMinutes ?? 0) / 60 * 10) / 10;
  const riskDist   = isDemo
    ? { onTrack: 38, needsAttention: 13, atRisk: 6 }
    : (data?.riskDistribution ?? { onTrack: 0, needsAttention: 0, atRisk: 0 });
  const orgTrend   = isDemo ? "up" : (data?.orgTrend ?? "stable");

  const totalRisk = riskDist.onTrack + riskDist.needsAttention + riskDist.atRisk;
  const onTrackPct = totalRisk ? Math.round((riskDist.onTrack / totalRisk) * 100) : 0;
  const atRiskPct  = totalRisk ? Math.round((riskDist.atRisk  / totalRisk) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 bg-zinc-800 rounded-xl" />
        <Skeleton className="h-48 bg-zinc-800 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {isDemo && (
        <div className="px-3 py-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-zinc-400">
            <span className="text-yellow-400 font-medium">Preview mode — </span>
            Showing a sample organisation with realistic data. Real numbers will appear as your team logs their work.
          </p>
        </div>
      )}

      {/* ── KPI Strip ── */}
      <div>
        <SectionLabel>Organisation Overview</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            title="Org Score"
            value={String(orgScore)}
            trend={orgTrend === "up" ? "up" : orgTrend === "down" ? "down" : undefined}
            delta={orgTrend === "up" ? "+12 vs Jan" : orgTrend === "down" ? "-" : undefined}
          />
          <MetricCard title="Total Employees" value={String(totalEmp)} subtitle={isDemo ? "across 7 teams" : undefined} />
          <MetricCard title="Tasks Completed" value={String(totalTasks)} subtitle="this quarter" />
          <MetricCard title="Deadline Adherence" value={`${deadline}%`} delta={isDemo ? "+4% MoM" : undefined} trend={isDemo ? "up" : undefined} />
          <MetricCard title="Avg Focus" value={`${focusHours}h`} subtitle="per person / day" />
        </div>
      </div>

      {/* ── Score Trend Chart ── */}
      <div>
        <SectionLabel>Organisation Score — 10-Week Trend</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={DEMO_ORG_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="week" tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[55, 95]} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v}`, "Org Score"]}
                />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: "#3B82F6", r: 4 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            {isDemo && (
              <p className="text-xs text-zinc-600 text-center mt-1">Jan – Mar 2026 · Company-wide weekly average</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Teams Table ── */}
      <div>
        <SectionLabel>Teams Overview</SectionLabel>
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
                      {{ teamName:"Team", managerName:"Manager", memberCount:"Members", score:"Score", velocity:"Velocity", overduePercent:"Overdue %", health:"Health" }[col]}
                      {" "}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamsToShow.map((team) => (
                  <TableRow
                    key={team.teamId}
                    className="border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                    data-testid={`row-team-${team.teamName.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <TableCell className="text-white font-medium text-sm">{team.teamName}</TableCell>
                    <TableCell className="text-zinc-400 text-sm">{team.managerName}</TableCell>
                    <TableCell className="text-zinc-400 text-sm text-right">{team.memberCount}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-bold ${team.score >= 80 ? "text-green-400" : team.score >= 70 ? "text-blue-400" : team.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                        {team.score}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm text-right">{team.velocity}</TableCell>
                    <TableCell className={`text-sm text-right font-medium ${team.overduePercent > 15 ? "text-red-400" : team.overduePercent > 10 ? "text-yellow-400" : "text-zinc-400"}`}>
                      {team.overduePercent}%
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${HEALTH_BADGE[team.health]}`}>
                        {HEALTH_LABEL[team.health]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Team Score Bar Chart ── */}
      <div>
        <SectionLabel>Team Score Comparison</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teamsToShow} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="teamName" tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v}`, "Score"]}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {teamsToShow.map((team, idx) => (
                    <Cell
                      key={team.teamId}
                      fill={team.health === "at_risk" ? "#EF4444" : team.health === "needs_attention" ? "#F59E0B" : TEAM_COLORS[idx % TEAM_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Risk Distribution ── */}
      <div>
        <SectionLabel>Workforce Risk Distribution</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-green-500" data-testid="card-risk-on-track">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">On Track</p>
                  <p className="text-4xl font-bold text-green-400">{riskDist.onTrack}</p>
                  <p className="text-xs text-zinc-600 mt-1">employees</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-400">{onTrackPct}%</p>
                  <p className="text-xs text-zinc-600">of workforce</p>
                </div>
              </div>
              <div className="mt-3 w-full bg-zinc-800 rounded-full h-1.5">
                <div className="bg-green-500 h-full rounded-full" style={{ width: `${onTrackPct}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-yellow-500" data-testid="card-risk-needs-attention">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">Needs Attention</p>
                  <p className="text-4xl font-bold text-yellow-400">{riskDist.needsAttention}</p>
                  <p className="text-xs text-zinc-600 mt-1">employees</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-yellow-400">{totalRisk ? Math.round((riskDist.needsAttention / totalRisk) * 100) : 0}%</p>
                  <p className="text-xs text-zinc-600">of workforce</p>
                </div>
              </div>
              <div className="mt-3 w-full bg-zinc-800 rounded-full h-1.5">
                <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${totalRisk ? Math.round((riskDist.needsAttention / totalRisk) * 100) : 0}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-red-500" data-testid="card-risk-at-risk">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">At Risk</p>
                  <p className="text-4xl font-bold text-red-400">{riskDist.atRisk}</p>
                  <p className="text-xs text-zinc-600 mt-1">employees</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-red-400">{atRiskPct}%</p>
                  <p className="text-xs text-zinc-600">of workforce</p>
                </div>
              </div>
              <div className="mt-3 w-full bg-zinc-800 rounded-full h-1.5">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${atRiskPct}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Top Performers ── */}
      <div>
        <SectionLabel>Top Performers This Month</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-3">
            {DEMO_TOP_PERFORMERS.map((p, idx) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    {idx === 0 && <Award className="w-3.5 h-3.5 text-yellow-400" />}
                  </div>
                  <p className="text-xs text-zinc-500">{p.role} · {p.dept}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Streak</p>
                    <p className="text-xs font-medium text-orange-400">{p.streak}d</p>
                  </div>
                  <ScoreCircle score={p.score} label="" size="sm" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Activity Feed ── */}
      <div>
        <SectionLabel>Recent Activity</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3 space-y-2">
            {DEMO_ACTIVITY.map((item, idx) => (
              <div key={idx} className={`flex gap-3 p-2.5 rounded-lg ${item.bg}`}>
                <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0 mt-0.5`} />
                <p className="text-xs text-zinc-300 flex-1">{item.text}</p>
                <p className="text-xs text-zinc-600 flex-shrink-0">{item.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── AI Executive Brief ── */}
      <div>
        <SectionLabel>AI Executive Brief</SectionLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" /> Organisation Summary — Week of Mar 25, 2026
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDemo ? (
              DEMO_BRIEF_POINTS.map((pt, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className={`flex-shrink-0 mt-0.5 font-bold ${pt.color}`}>{pt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{pt.title}</p>
                    <p className="text-sm text-zinc-400 mt-0.5 leading-relaxed">{pt.body}</p>
                  </div>
                </div>
              ))
            ) : (
              <>
                {executiveInsight ? (
                  <div className="flex gap-2">
                    <span className="text-blue-400 flex-shrink-0 mt-0.5">💡</span>
                    <div>
                      <p className="text-sm font-medium text-white">{executiveInsight.title}</p>
                      <p className="text-sm text-zinc-300 mt-1">{executiveInsight.message}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">Executive insights will appear as organisation data accumulates.</p>
                )}
                {teamsToShow.length > 0 && (() => {
                  const topTeams  = teamsToShow.filter(t => t.score >= orgScore);
                  const riskTeams = teamsToShow.filter(t => t.health === "at_risk");
                  return (
                    <>
                      {topTeams.length > 0 && (
                        <div className="flex gap-2">
                          <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                          <p className="text-sm text-zinc-300">
                            <span className="font-medium text-white">Strong teams: </span>
                            {topTeams.map(t => t.teamName).join(", ")} performing above org average of {orgScore}.
                          </p>
                        </div>
                      )}
                      {riskTeams.length > 0 && (
                        <div className="flex gap-2">
                          <span className="text-yellow-400 flex-shrink-0 mt-0.5">⚠</span>
                          <p className="text-sm text-zinc-300">
                            <span className="font-medium text-white">Watch list: </span>
                            {riskTeams.map(t => t.teamName).join(", ")} at risk with high overdue rates.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
