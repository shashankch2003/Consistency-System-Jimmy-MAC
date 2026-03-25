import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, TrendingDown, Info, Check, Clock,
  GripVertical, MoreVertical, Users, GitCompare, Undo2, History, RotateCcw,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import MetricCard from "./shared/MetricCard";
import ScoreCircle from "./shared/ScoreCircle";
import EmployeeDetailPanel from "./shared/EmployeeDetailPanel";
import ComparisonDrawer from "./shared/ComparisonDrawer";
import type { ManagerDashboardData, TeamMemberSummary } from "@shared/lib/team-intelligence/types";

/* ─── Types & constants ────────────────────────────────────────────────── */
type SectionId = "overview" | "members" | "member-ranking" | "alerts" | "workload" | "velocity-gauge" | "team-trend" | "team-radar" | "ai-brief";

const DEFAULT_SECTIONS: SectionId[] = ["overview", "members", "member-ranking", "alerts", "workload", "velocity-gauge", "team-trend", "team-radar", "ai-brief"];

interface ColorSettings { memberScoreColors: boolean; workloadBarColors: boolean; trendLineColors: boolean; alertColors: boolean; }
const DEFAULT_COLORS: ColorSettings = { memberScoreColors: true, workloadBarColors: true, trendLineColors: true, alertColors: true };

interface HistorySnapshot { ts: number; label: string; memberOrder: string[]; sections: SectionId[]; colors: ColorSettings; }

const HEALTH_BADGE: Record<string, string> = {
  on_track: "bg-green-500/20 text-green-400 border-green-500/30",
  needs_attention: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  at_risk: "bg-red-500/20 text-red-400 border-red-500/30",
};
const HEALTH_LABEL: Record<string, string> = {
  on_track: "On Track", needs_attention: "Needs Attention", at_risk: "At Risk",
};
const AVATAR_COLORS = ["bg-blue-600","bg-purple-600","bg-yellow-600","bg-red-600","bg-green-600","bg-orange-600","bg-pink-600","bg-cyan-600"];
const LINE_COLORS = ["#3B82F6","#8B5CF6","#F59E0B","#10B981","#EF4444","#EC4899","#06B6D4","#F97316"];
const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; borderColor: string }> = {
  critical: { icon: <AlertTriangle className="w-4 h-4 text-red-400" />, borderColor: "border-red-500/30" },
  warning: { icon: <TrendingDown className="w-4 h-4 text-yellow-400" />, borderColor: "border-yellow-500/30" },
  info: { icon: <Info className="w-4 h-4 text-zinc-400" />, borderColor: "border-zinc-700" },
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function getInitials(name: string) { return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2); }
function lsGet<T>(key: string, fallback: T): T { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function lsSet<T>(key: string, val: T) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ─── Demo per-member trend data ──────────────────────────────────────── */
function memberTrendPoints(userId: string, currentScore: number) {
  const hash = (s: string, i: number) => {
    let h = 0; for (let j = 0; j < s.length; j++) h = (h * 31 + s.charCodeAt(j)) >>> 0;
    return ((h + i * 7919) % 17) - 8;
  };
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const jitter = hash(userId, i);
    const score = Math.max(10, Math.min(100, currentScore + jitter));
    return { date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), [userId]: score };
  });
}

/* ─── Component ───────────────────────────────────────────────────────── */
export default function ManagerDashboard({ workspaceId = "default" }: { workspaceId?: string }) {
  /* — Persistent state — */
  const [sectionOrder, _setSectionOrder] = useState<SectionId[]>(() => {
    const stored = lsGet<string[]>("ti-mgr-sections", []);
    const allIds = DEFAULT_SECTIONS as string[];
    const valid = stored.filter(s => allIds.includes(s)) as SectionId[];
    const missing = DEFAULT_SECTIONS.filter(s => !stored.includes(s));
    return valid.length > 0 ? [...valid, ...missing] : DEFAULT_SECTIONS;
  });
  const [colors, _setColors] = useState<ColorSettings>(() => lsGet("ti-mgr-colors", DEFAULT_COLORS));
  const [memberOrder, _setMemberOrder] = useState<string[]>(() => lsGet("ti-mgr-members", []));
  const [history, _setHistory] = useState<HistorySnapshot[]>(() => lsGet("ti-mgr-history", []));

  /* — Ephemeral state — */
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMemberSummary | null>(null);
  const [compareA, setCompareA] = useState<TeamMemberSummary | null>(null);
  const [compareB, setCompareB] = useState<TeamMemberSummary | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cardDragIdx, setCardDragIdx] = useState<number | null>(null);
  const [cardDragOverIdx, setCardDragOverIdx] = useState<number | null>(null);
  const [sectionDragIdx, setSectionDragIdx] = useState<number | null>(null);
  const [sectionDragOverIdx, setSectionDragOverIdx] = useState<number | null>(null);

  /* — Persistence helpers — */
  const push = useCallback((next: { sections?: SectionId[]; memberOrder?: string[]; colors?: ColorSettings }, label = "Change") => {
    const newSections = next.sections ?? sectionOrder;
    const newMemberOrder = next.memberOrder ?? memberOrder;
    const newColors = next.colors ?? colors;
    if (next.sections) { _setSectionOrder(next.sections); lsSet("ti-mgr-sections", next.sections); }
    if (next.memberOrder) { _setMemberOrder(next.memberOrder); lsSet("ti-mgr-members", next.memberOrder); }
    if (next.colors) { _setColors(next.colors); lsSet("ti-mgr-colors", next.colors); }
    const snap: HistorySnapshot = { ts: Date.now(), label, sections: newSections, memberOrder: newMemberOrder, colors: newColors };
    const newHist = [snap, ...history].slice(0, 10);
    _setHistory(newHist);
    lsSet("ti-mgr-history", newHist);
  }, [history, sectionOrder, memberOrder, colors]);

  const undo = useCallback(() => {
    if (history.length < 2) return;
    const prev = history[1];
    _setSectionOrder(prev.sections); _setMemberOrder(prev.memberOrder); _setColors(prev.colors);
    lsSet("ti-mgr-sections", prev.sections); lsSet("ti-mgr-members", prev.memberOrder); lsSet("ti-mgr-colors", prev.colors);
    const newHist = history.slice(1); _setHistory(newHist); lsSet("ti-mgr-history", newHist);
  }, [history]);

  const restoreSnapshot = useCallback((snap: HistorySnapshot) => {
    _setSectionOrder(snap.sections); _setMemberOrder(snap.memberOrder); _setColors(snap.colors);
    lsSet("ti-mgr-sections", snap.sections); lsSet("ti-mgr-members", snap.memberOrder); lsSet("ti-mgr-colors", snap.colors);
    setSettingsOpen(false);
  }, []);

  /* — Queries — */
  const { data, isLoading } = useQuery<ManagerDashboardData>({
    queryKey: [`/api/team-intelligence/team-dashboard?workspaceId=${workspaceId}`],
  });
  const { data: alerts = [] } = useQuery<any[]>({
    queryKey: [`/api/team-intelligence/alerts?workspaceId=${workspaceId}`],
  });
  const { data: insightsData } = useQuery<{ insights: any[] }>({
    queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`],
  });

  const acknowledgeMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/team-intelligence/alerts/${id}/acknowledge`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/team-intelligence/alerts?workspaceId=${workspaceId}`] }),
  });
  const snoozeMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/team-intelligence/alerts/${id}/snooze`, {
      snoozeUntil: new Date(Date.now() + 86400000).toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/team-intelligence/alerts?workspaceId=${workspaceId}`] }),
  });

  /* — Sorted members (by manager-defined order) — */
  const rawMembers: TeamMemberSummary[] = data?.members || [];
  const members = useMemo(() => {
    if (memberOrder.length === 0) return rawMembers;
    const ordered: TeamMemberSummary[] = [];
    const unordered: TeamMemberSummary[] = [];
    memberOrder.forEach(uid => { const m = rawMembers.find(m => m.userId === uid); if (m) ordered.push(m); });
    rawMembers.forEach(m => { if (!memberOrder.includes(m.userId)) unordered.push(m); });
    return [...ordered, ...unordered];
  }, [rawMembers, memberOrder]);

  /* — Workload — */
  const workloadData = useMemo(() => {
    if (members.length === 0) return [];
    const avg = members.reduce((s, m) => s + m.tasksCompleted, 0) / members.length;
    if (avg === 0) return members.map(m => ({ name: m.name, pct: 0, color: "bg-green-500" }));
    return members.map(m => {
      const pct = Math.round((m.tasksCompleted / avg) * 100);
      const color = colors.workloadBarColors
        ? (pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-green-500")
        : "bg-zinc-600";
      return { name: m.name, pct, color };
    });
  }, [members, colors.workloadBarColors]);

  /* — Per-member trend data — */
  const trendData = useMemo(() => {
    if (members.length === 0) return [];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
    return days.map((date, dayIdx) => {
      const entry: Record<string, string | number> = { date };
      members.slice(0, 6).forEach(m => {
        const hash = (j: number) => { let h = 0; for (let k = 0; k < m.userId.length; k++) h = (h * 31 + m.userId.charCodeAt(k)) >>> 0; return ((h + j * 7919) % 17) - 8; };
        entry[m.name.split(" ")[0]] = Math.max(10, Math.min(100, m.productivityScore + hash(dayIdx)));
      });
      return entry;
    });
  }, [members]);

  const managerInsight = useMemo(() => {
    const ins = insightsData?.insights || [];
    return ins.find((i: any) => i.roleContext === "admin") || ins[0];
  }, [insightsData]);
  const activeAlerts = alerts.filter((a: any) => !a.isAcknowledged && !a.isSnoozed);

  /* — Card drag — */
  const handleCardDragStart = (idx: number) => setCardDragIdx(idx);
  const handleCardDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setCardDragOverIdx(idx); };
  const handleCardDrop = (idx: number) => {
    if (cardDragIdx === null || cardDragIdx === idx) { setCardDragIdx(null); setCardDragOverIdx(null); return; }
    const next = [...members.map(m => m.userId)];
    next.splice(idx, 0, next.splice(cardDragIdx, 1)[0]);
    push({ memberOrder: next }, "Reordered member cards");
    setCardDragIdx(null); setCardDragOverIdx(null);
  };

  /* — Section drag — */
  const handleSectionDragStart = (idx: number) => setSectionDragIdx(idx);
  const handleSectionDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setSectionDragOverIdx(idx); };
  const handleSectionDrop = (idx: number) => {
    if (sectionDragIdx === null || sectionDragIdx === idx) { setSectionDragIdx(null); setSectionDragOverIdx(null); return; }
    const next = [...sectionOrder];
    next.splice(idx, 0, next.splice(sectionDragIdx, 1)[0]);
    push({ sections: next }, "Moved section");
    setSectionDragIdx(null); setSectionDragOverIdx(null);
  };

  /* — Compare mode — */
  const handleCompareSelect = (m: TeamMemberSummary) => {
    if (!compareA) { setCompareA(m); return; }
    if (compareA.userId === m.userId) { setCompareA(null); return; }
    setCompareB(m);
    setIsCompareOpen(true);
    setCompareMode(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!data || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-zinc-400 text-sm max-w-md">No team data available. Assign team members to see their performance here.</p>
      </div>
    );
  }

  /* ─── Section renderers ─────────────────────────────────────────────── */
  const SECTIONS: Record<SectionId, React.ReactNode> = {
    "overview": (
      <div>
        <SLabel>Team Overview</SLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard title="Team Score" value={String(data.teamScore)} />
          <MetricCard title="Members" value={String(data.memberCount)} />
          <MetricCard title="Tasks Completed" value={String(data.totalTasksCompleted)} subtitle="this period" />
          <MetricCard title="Overdue" value={String(data.totalOverdue)} delta={data.totalOverdue > 0 ? `+${data.totalOverdue}` : undefined} trend={data.totalOverdue > 0 ? "down" : undefined} />
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Team Health</p>
              <Badge variant="outline" className={HEALTH_BADGE[data.teamHealth] || HEALTH_BADGE.on_track}>
                {HEALTH_LABEL[data.teamHealth] || "On Track"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    ),

    "members": (
      <div>
        <div className="flex items-center justify-between mb-4">
          <SLabel className="mb-0">Team Members</SLabel>
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-600">Drag cards to reorder</p>
            <Button
              size="sm"
              variant={compareMode ? "secondary" : "ghost"}
              className={`h-7 px-2 text-xs gap-1 ${compareMode ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
              onClick={() => { setCompareMode(v => !v); setCompareA(null); setCompareB(null); }}
              data-testid="button-compare-mode"
            >
              <GitCompare className="w-3.5 h-3.5" />
              {compareMode ? "Cancel compare" : "Compare 2"}
            </Button>
          </div>
        </div>
        {compareMode && (
          <div className="mb-3 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 flex items-center gap-2">
            <GitCompare className="w-3.5 h-3.5 text-zinc-500" />
            {!compareA ? "Click any member card to select first person" : `Selected: ${compareA.name} — now click a second member`}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((m, idx) => {
            const isSelectedA = compareA?.userId === m.userId;
            return (
              <div
                key={m.userId}
                draggable={!compareMode}
                onDragStart={() => handleCardDragStart(idx)}
                onDragOver={(e) => handleCardDragOver(e, idx)}
                onDrop={() => handleCardDrop(idx)}
                onDragEnd={() => { setCardDragIdx(null); setCardDragOverIdx(null); }}
                className={`relative group transition-all ${cardDragOverIdx === idx && cardDragIdx !== idx ? "ring-2 ring-zinc-500 ring-offset-2 ring-offset-zinc-950 rounded-xl" : ""}`}
              >
                {!compareMode && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab z-10">
                    <GripVertical className="w-4 h-4 text-zinc-600" />
                  </div>
                )}
                <Card
                  className={`bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer ${isSelectedA ? "ring-2 ring-zinc-400" : ""}`}
                  onClick={() => compareMode ? handleCompareSelect(m) : setSelectedEmployee(m)}
                  data-testid={`card-member-${m.userId}`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {m.avatar ? <img src={m.avatar} alt={m.name} className="w-full h-full rounded-full object-cover" /> : getInitials(m.name || "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{m.name}</p>
                      <p className="text-xs text-zinc-500">{m.role}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-zinc-400">{m.tasksCompleted} tasks</span>
                        {m.overdueCount > 0
                          ? <span className="text-xs text-red-400">{m.overdueCount} overdue</span>
                          : <span className="text-xs text-green-400">0 overdue</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <ScoreCircle score={m.productivityScore} label="" size="sm" />
                      <Badge variant="outline" className={`text-xs ${colors.memberScoreColors ? (HEALTH_BADGE[m.riskLevel] || HEALTH_BADGE.on_track) : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                        {m.statusBadge || HEALTH_LABEL[m.riskLevel] || "On Track"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    ),

    "alerts": (
      <div>
        <SLabel>Active Alerts</SLabel>
        {activeAlerts.length > 0 ? (
          <div className="space-y-2">
            {activeAlerts.map((alert: any) => {
              const sev = colors.alertColors
                ? (SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info)
                : { icon: <Info className="w-4 h-4 text-zinc-400" />, borderColor: "border-zinc-700" };
              return (
                <div key={alert.id} className={`flex gap-3 p-3 rounded-lg border ${sev.borderColor} bg-zinc-900`} data-testid={`alert-${alert.id}`}>
                  <div className="flex-shrink-0 mt-0.5">{sev.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{alert.message}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {alert.severity !== "info" && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-zinc-400 hover:text-white" onClick={() => snoozeMut.mutate(alert.id)} disabled={snoozeMut.isPending} data-testid={`button-snooze-${alert.id}`}>
                        <Clock className="w-3 h-3 mr-1" /> Snooze
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-zinc-400 hover:text-green-400" onClick={() => acknowledgeMut.mutate(alert.id)} disabled={acknowledgeMut.isPending} data-testid={`button-ack-${alert.id}`}>
                      <Check className="w-3 h-3 mr-1" /> Acknowledge
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 text-center text-zinc-500 text-sm">No active alerts.</CardContent>
          </Card>
        )}
      </div>
    ),

    "workload": (
      <div>
        <SLabel>Workload Balance</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-3">
            {workloadData.map((w) => (
              <div key={w.name} className="space-y-1" data-testid={`workload-${w.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{w.name}</span>
                  <span className={w.pct > 100 && colors.workloadBarColors ? "text-red-400 font-medium" : "text-zinc-400"}>{w.pct}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full ${w.color}`} style={{ width: `${Math.min(w.pct, 100)}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-zinc-600 pt-1">100% = team average workload</p>
          </CardContent>
        </Card>
      </div>
    ),

    "team-trend": (
      <div>
        <SLabel>Team Trend — Member Scores (Last 7 Days)</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {members.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis dataKey="date" tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
                  {members.slice(0, 6).map((m, idx) => (
                    <Line
                      key={m.userId}
                      type="monotone"
                      dataKey={m.name.split(" ")[0]}
                      stroke={colors.trendLineColors ? LINE_COLORS[idx % LINE_COLORS.length] : "#52525B"}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">No trend data available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    ),

    "ai-brief": (
      <div>
        <SLabel>AI Team Brief</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white">Team Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {managerInsight ? (
              <div className="flex gap-2">
                <span className="text-zinc-400 flex-shrink-0 mt-0.5">💡</span>
                <div>
                  <p className="text-sm font-medium text-white">{managerInsight.title}</p>
                  <p className="text-sm text-zinc-300 mt-1">{managerInsight.message}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Team insights will appear as productivity data accumulates.</p>
            )}
            {(() => {
              const top = members.filter(m => m.productivityScore >= (data?.teamScore ?? 0));
              const risk = members.filter(m => m.riskLevel === "at_risk");
              return (
                <>
                  {top.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                      <p className="text-sm text-zinc-300">
                        <span className="font-medium text-white">Strong performers: </span>
                        {top.map(m => m.name).join(", ")} {top.length === 1 ? "is" : "are"} above the team average of {data?.teamScore}.
                      </p>
                    </div>
                  )}
                  {risk.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-yellow-400 flex-shrink-0 mt-0.5">⚠</span>
                      <p className="text-sm text-zinc-300">
                        <span className="font-medium text-white">Needs attention: </span>
                        {risk.map(m => m.name).join(", ")} {risk.length === 1 ? "is" : "are"} at risk.
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    ),

    "member-ranking": (
      <div>
        <SLabel>Member Score Ranking</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {members.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">No member data yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(members.length * 44, 120)}>
                  <BarChart
                    layout="vertical"
                    data={[...members].sort((a, b) => b.productivityScore - a.productivityScore).map(m => ({ name: m.name, score: m.productivityScore }))}
                    margin={{ left: 8, right: 30, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#D1D5DB", fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#27272A" />
                    <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [v, "Score"]} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {[...members].sort((a, b) => b.productivityScore - a.productivityScore).map((m, i) => (
                        <Cell key={i} fill={colors.memberScoreColors ? (m.productivityScore >= 75 ? "#22C55E" : m.productivityScore >= 50 ? "#EAB308" : "#EF4444") : "#52525B"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 justify-end mt-2">
                  {[["#22C55E","≥75"],["#EAB308","50–74"],["#EF4444","<50"]].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                      <span className="text-[10px] text-zinc-500">{l}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    ),

    "team-radar": (
      <div>
        <SLabel>Team Performance Dimensions</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {members.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">No team data yet.</p>
            ) : (() => {
              const avg = (fn: (m: typeof members[0]) => number) =>
                Math.round(members.reduce((s, m) => s + fn(m), 0) / members.length);
              const total = data?.totalTasksCompleted ?? 0;
              const overdue = data?.totalOverdue ?? 0;
              const completionRate = total > 0 ? Math.round(total / (total + overdue) * 100) : 0;
              const teamRadarData = [
                { metric: "Score", value: data?.teamScore ?? 0 },
                { metric: "Completion", value: completionRate },
                { metric: "Focus", value: avg(m => Math.min(Math.round((m.focusTimeMinutes ?? 0) / 360 * 100), 100)) },
                { metric: "On Track", value: Math.round(members.filter(m => m.riskLevel !== "at_risk").length / members.length * 100) },
                { metric: "Activity", value: avg(m => Math.min(m.productivityScore + 10, 100)) },
              ];
              return (
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={teamRadarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <PolarGrid stroke="#3F3F46" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
                      <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}`, "Team Avg"]} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    {teamRadarData.map(d => (
                      <div key={d.metric} className="flex items-center justify-between gap-4">
                        <span className="text-xs text-zinc-400">{d.metric}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${d.value}%` }} />
                          </div>
                          <span className="text-xs text-zinc-300 font-mono w-7 text-right">{d.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    ),

    "velocity-gauge": (
      <div>
        <SLabel>Task Velocity</SLabel>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {(() => {
              const total = data?.totalTasksCompleted ?? 0;
              const overdue = data?.totalOverdue ?? 0;
              const velocity = total + overdue > 0 ? Math.round(total / (total + overdue) * 100) : 0;
              const angle = (velocity / 100) * 180;
              const R = 90; const cx = 110; const cy = 105;
              const toRad = (deg: number) => (deg - 180) * Math.PI / 180;
              const needleX = cx + R * 0.72 * Math.cos(toRad(angle));
              const needleY = cy + R * 0.72 * Math.sin(toRad(angle));
              const arcPath = (from: number, to: number, color: string) => {
                const s = { x: cx + R * Math.cos(toRad(from)), y: cy + R * Math.sin(toRad(from)) };
                const e = { x: cx + R * Math.cos(toRad(to)), y: cy + R * Math.sin(toRad(to)) };
                return <path d={`M ${s.x} ${s.y} A ${R} ${R} 0 0 1 ${e.x} ${e.y}`} stroke={color} strokeWidth={14} fill="none" strokeLinecap="round" />;
              };
              const label = velocity >= 80 ? "Excellent" : velocity >= 60 ? "Good" : velocity >= 40 ? "Moderate" : "Needs Focus";
              const labelColor = velocity >= 80 ? "text-green-400" : velocity >= 60 ? "text-blue-400" : velocity >= 40 ? "text-yellow-400" : "text-red-400";
              return (
                <div className="flex flex-col items-center gap-2">
                  <svg width={220} height={120} viewBox="0 0 220 120">
                    {arcPath(0, 60, "#27272A")}
                    {arcPath(60, 120, "#27272A")}
                    {arcPath(120, 180, "#27272A")}
                    {velocity > 0 && arcPath(0, Math.min(angle, 60), "#EF4444")}
                    {velocity > 33 && arcPath(60, Math.min(angle, 120), "#EAB308")}
                    {velocity > 67 && arcPath(120, Math.min(angle, 180), "#22C55E")}
                    <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#F4F4F5" strokeWidth={2.5} strokeLinecap="round" />
                    <circle cx={cx} cy={cy} r={5} fill="#F4F4F5" />
                    <text x={cx} y={cy - 16} textAnchor="middle" fill="#F4F4F5" fontSize={22} fontWeight="bold">{velocity}%</text>
                    <text x={25} y={cy + 18} fill="#71717A" fontSize={9}>Low</text>
                    <text x={185} y={cy + 18} fill="#71717A" fontSize={9} textAnchor="end">High</text>
                  </svg>
                  <p className={`text-sm font-semibold -mt-2 ${labelColor}`}>{label}</p>
                  <div className="flex gap-6 text-xs text-zinc-500 mt-1">
                    <span><span className="text-zinc-300 font-medium">{total}</span> completed</span>
                    <span><span className="text-zinc-300 font-medium">{overdue}</span> overdue</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    ),
  };

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-end px-6 pt-4 pb-0">
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white" data-testid="button-mgr-settings">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="bg-zinc-900 border-zinc-700 w-72 p-0">
            <MgrSettingsPanel
              colors={colors}
              setColors={(c) => push({ colors: c }, "Color change")}
              history={history}
              canUndo={history.length >= 2}
              onUndo={undo}
              onRestore={restoreSnapshot}
              onReset={() => { push({ sections: DEFAULT_SECTIONS, memberOrder: [], colors: DEFAULT_COLORS }, "Reset"); }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-6 px-6 pb-6">
        {sectionOrder.map((id, idx) => (
          <div
            key={id}
            draggable
            onDragStart={() => handleSectionDragStart(idx)}
            onDragOver={(e) => handleSectionDragOver(e, idx)}
            onDrop={() => handleSectionDrop(idx)}
            onDragEnd={() => { setSectionDragIdx(null); setSectionDragOverIdx(null); }}
            className={`relative group transition-all ${sectionDragOverIdx === idx && sectionDragIdx !== idx ? "ring-2 ring-zinc-500 ring-offset-2 ring-offset-zinc-950 rounded-xl" : ""}`}
            data-testid={`section-${id}`}
          >
            <div className="absolute left-0 top-6 -translate-x-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab z-10">
              <GripVertical className="w-4 h-4 text-zinc-600" />
            </div>
            {SECTIONS[id]}
          </div>
        ))}
      </div>

      <EmployeeDetailPanel
        workspaceId={workspaceId}
        employeeUserId={selectedEmployee?.userId || ""}
        memberName={selectedEmployee?.name}
        memberRole={selectedEmployee?.role}
        memberAvatar={selectedEmployee?.avatar ?? undefined}
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />

      <ComparisonDrawer
        workspaceId={workspaceId}
        userId={compareA?.userId}
        isOpen={isCompareOpen}
        onClose={() => { setIsCompareOpen(false); setCompareA(null); setCompareB(null); setCompareMode(false); }}
      />
    </div>
  );
}

/* ─── Settings panel ─────────────────────────────────────────────────────── */
function MgrSettingsPanel({ colors, setColors, history, canUndo, onUndo, onRestore, onReset }: {
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
          { key: "memberScoreColors" as const, label: "Member risk badges" },
          { key: "workloadBarColors" as const, label: "Workload bars (red/amber/green)" },
          { key: "trendLineColors" as const, label: "Team trend chart lines" },
          { key: "alertColors" as const, label: "Alert severity indicators" },
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

function SLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4 ${className}`}>{children}</h2>;
}
