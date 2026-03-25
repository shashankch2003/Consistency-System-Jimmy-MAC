import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingDown, Award, Info, Check, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import MetricCard from "./shared/MetricCard";
import ScoreCircle from "./shared/ScoreCircle";
import EmployeeDetailPanel from "./shared/EmployeeDetailPanel";
import type { ManagerDashboardData, TeamMemberSummary } from "@shared/lib/team-intelligence/types";

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

const AVATAR_COLORS = ["bg-blue-600", "bg-purple-600", "bg-yellow-600", "bg-red-600", "bg-green-600", "bg-orange-600", "bg-pink-600", "bg-cyan-600"];

const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; borderColor: string }> = {
  critical: { icon: <AlertTriangle className="w-4 h-4 text-red-400" />, borderColor: "border-red-500/30" },
  warning: { icon: <TrendingDown className="w-4 h-4 text-yellow-400" />, borderColor: "border-yellow-500/30" },
  info: { icon: <Info className="w-4 h-4 text-blue-400" />, borderColor: "border-blue-500/30" },
};

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ManagerDashboard({ workspaceId = "default" }: { workspaceId?: string }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMemberSummary | null>(null);

  const { data, isLoading } = useQuery<ManagerDashboardData>({
    queryKey: [`/api/team-intelligence/team-dashboard?workspaceId=${workspaceId}`],
  });

  const { data: alerts = [] } = useQuery<any[]>({
    queryKey: [`/api/team-intelligence/alerts?workspaceId=${workspaceId}`],
  });

  const { data: insightsData } = useQuery<{ insights: any[]; total: number }>({
    queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`],
  });

  const acknowledgeMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/team-intelligence/alerts/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team-intelligence/alerts?workspaceId=${workspaceId}`] });
    },
  });

  const snoozeMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/team-intelligence/alerts/${id}/snooze`, {
      snoozeUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team-intelligence/alerts?workspaceId=${workspaceId}`] });
    },
  });

  const members = data?.members || [];

  const workloadData = useMemo(() => {
    if (members.length === 0) return [];
    const avgTasks = members.reduce((s, m) => s + m.tasksCompleted, 0) / members.length;
    if (avgTasks === 0) return members.map(m => ({ name: m.name, pct: 0, color: "bg-green-500" }));
    return members.map(m => {
      const pct = Math.round((m.tasksCompleted / avgTasks) * 100);
      const color = pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-green-500";
      return { name: m.name, pct, color };
    });
  }, [members]);

  const teamTrendData = useMemo(() => {
    if (members.length === 0) return [];
    const memberSnapshots = members.map(m => m.productivityScore);
    return [{ date: "Team Avg", score: data?.teamScore ?? 0 }];
  }, [data]);

  const managerInsight = useMemo(() => {
    const ins = insightsData?.insights || [];
    return ins.find((i: any) => i.roleContext === "admin") || ins[0];
  }, [insightsData]);

  const activeAlerts = alerts.filter((a: any) => !a.isAcknowledged && !a.isSnoozed);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 bg-zinc-800 rounded-xl" />
        <Skeleton className="h-64 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!data || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-zinc-400 text-sm max-w-md">
          No team data available. Assign team members and seed demo data from settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4">Team Overview</h2>
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

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((m: TeamMemberSummary, idx: number) => (
            <Card
              key={m.userId}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              onClick={() => { setSelectedEmployeeId(m.userId); setSelectedMember(m); }}
              data-testid={`card-member-${m.userId}`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {m.avatar ? (
                    <img src={m.avatar} alt={m.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(m.name || "?")
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{m.name}</p>
                  <p className="text-xs text-zinc-500">{m.role}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-400">{m.tasksCompleted} tasks</span>
                    {m.overdueCount > 0
                      ? <span className="text-xs text-red-400">{m.overdueCount} overdue</span>
                      : <span className="text-xs text-green-400">0 overdue</span>
                    }
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ScoreCircle score={m.productivityScore} label="" size="sm" />
                  <Badge variant="outline" className={`text-xs ${HEALTH_BADGE[m.riskLevel] || HEALTH_BADGE.on_track}`}>
                    {m.statusBadge || HEALTH_LABEL[m.riskLevel] || "On Track"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Active Alerts</h2>
        {activeAlerts.length > 0 ? (
          <div className="space-y-2">
            {activeAlerts.map((alert: any) => {
              const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
              return (
                <div key={alert.id} className={`flex gap-3 p-3 rounded-lg border ${sev.borderColor} bg-zinc-900`} data-testid={`alert-${alert.id}`}>
                  <div className="flex-shrink-0 mt-0.5">{sev.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{alert.message}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {alert.severity !== "info" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                        onClick={() => snoozeMut.mutate(alert.id)}
                        disabled={snoozeMut.isPending}
                        data-testid={`button-snooze-alert-${alert.id}`}
                      >
                        <Clock className="w-3 h-3 mr-1" /> Snooze
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-zinc-400 hover:text-green-400"
                      onClick={() => acknowledgeMut.mutate(alert.id)}
                      disabled={acknowledgeMut.isPending}
                      data-testid={`button-acknowledge-alert-${alert.id}`}
                    >
                      <Check className="w-3 h-3 mr-1" /> Acknowledge
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 text-center text-zinc-500 text-sm">
              No active alerts.
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Workload Balance</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-3">
            {workloadData.map((w) => (
              <div key={w.name} className="space-y-1" data-testid={`workload-${w.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{w.name}</span>
                  <span className={w.pct > 100 ? "text-red-400 font-medium" : "text-zinc-400"}>{w.pct}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full ${w.color}`} style={{ width: `${Math.min(w.pct, 100)}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-zinc-600 pt-1">100% = team average capacity</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Team Trend — Member Scores</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {members.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={members.map((m: TeamMemberSummary) => ({ name: m.name.split(" ")[0], score: m.productivityScore }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                  <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="score" name="Productivity" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">No team trend data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">AI Team Brief</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white">Team Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {managerInsight ? (
              <>
                <div className="flex gap-2">
                  <span className="text-blue-400 flex-shrink-0 mt-0.5">💡</span>
                  <div>
                    <p className="text-sm font-medium text-white">{managerInsight.title}</p>
                    <p className="text-sm text-zinc-300 mt-1">{managerInsight.message}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Team insights will appear here as productivity data accumulates.
              </p>
            )}
            {members.length > 0 && (
              <>
                {(() => {
                  const topPerformers = members.filter(m => m.productivityScore >= (data?.teamScore ?? 0));
                  const atRiskMembers = members.filter(m => m.riskLevel === "at_risk");
                  return (
                    <>
                      {topPerformers.length > 0 && (
                        <div className="flex gap-2">
                          <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                          <p className="text-sm text-zinc-300">
                            <span className="font-medium text-white">Strong performers: </span>
                            {topPerformers.map(m => m.name).join(", ")} {topPerformers.length === 1 ? "is" : "are"} above the team average of {data?.teamScore}.
                          </p>
                        </div>
                      )}
                      {atRiskMembers.length > 0 && (
                        <div className="flex gap-2">
                          <span className="text-yellow-400 flex-shrink-0 mt-0.5">⚠</span>
                          <p className="text-sm text-zinc-300">
                            <span className="font-medium text-white">Attention needed: </span>
                            {atRiskMembers.map(m => m.name).join(", ")} {atRiskMembers.length === 1 ? "is" : "are"} currently at risk and may need support.
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

      <EmployeeDetailPanel
        workspaceId={workspaceId}
        employeeUserId={selectedEmployeeId || ""}
        memberName={selectedMember?.name}
        memberRole={selectedMember?.role}
        memberAvatar={selectedMember?.avatar}
        isOpen={!!selectedEmployeeId}
        onClose={() => { setSelectedEmployeeId(null); setSelectedMember(null); }}
      />
    </div>
  );
}
