import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown } from "lucide-react";
import MetricCard from "./shared/MetricCard";
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

type SortKey = "teamName" | "managerName" | "memberCount" | "score" | "velocity" | "overduePercent" | "health";

export default function AdminDashboard({ workspaceId = "default" }: { workspaceId?: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<AdminDashboardData>({
    queryKey: [`/api/team-intelligence/admin-dashboard?workspaceId=${workspaceId}`],
  });

  const { data: insightsData } = useQuery<{ insights: any[]; total: number }>({
    queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`],
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedTeams = useMemo(() => {
    if (!data?.teams) return [];
    return [...data.teams].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data?.teams, sortKey, sortDir]);

  const executiveInsight = useMemo(() => {
    const ins = insightsData?.insights || [];
    return ins.find((i: any) => i.roleContext === "admin") || ins[0];
  }, [insightsData]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 bg-zinc-800 rounded-xl" />
        <Skeleton className="h-48 bg-zinc-800 rounded-xl" />
        <Skeleton className="h-32 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-zinc-400 text-sm max-w-md">
          No organization data available. Seed demo data from settings to preview.
        </p>
      </div>
    );
  }

  const trendArrow = data.orgTrend === "up" ? "up" : data.orgTrend === "down" ? "down" : undefined;
  const avgFocusHours = Math.round((data.avgFocusMinutes / 60) * 10) / 10;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4">Organisation Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard title="Org Score" value={String(data.orgScore)} trend={trendArrow} delta={trendArrow === "up" ? "+" : trendArrow === "down" ? "-" : undefined} />
          <MetricCard title="Total Employees" value={String(data.totalEmployees)} />
          <MetricCard title="Tasks Completed" value={String(data.totalTasksCompleted)} subtitle="this period" />
          <MetricCard title="Deadline Adherence" value={`${data.deadlineAdherenceRate}%`} />
          <MetricCard title="Avg Focus Time" value={`${avgFocusHours}h`} subtitle="per day" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Teams Overview</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            {sortedTeams.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-500 text-xs cursor-pointer select-none" onClick={() => handleSort("teamName")}>
                      Team <SortIcon col="teamName" />
                    </TableHead>
                    <TableHead className="text-zinc-500 text-xs cursor-pointer select-none" onClick={() => handleSort("managerName")}>
                      Manager <SortIcon col="managerName" />
                    </TableHead>
                    <TableHead className="text-zinc-500 text-xs text-right cursor-pointer select-none" onClick={() => handleSort("memberCount")}>
                      Members <SortIcon col="memberCount" />
                    </TableHead>
                    <TableHead className="text-zinc-500 text-xs text-right cursor-pointer select-none" onClick={() => handleSort("score")}>
                      Score <SortIcon col="score" />
                    </TableHead>
                    <TableHead className="text-zinc-500 text-xs text-right cursor-pointer select-none" onClick={() => handleSort("velocity")}>
                      Velocity <SortIcon col="velocity" />
                    </TableHead>
                    <TableHead className="text-zinc-500 text-xs text-right cursor-pointer select-none" onClick={() => handleSort("overduePercent")}>
                      Overdue % <SortIcon col="overduePercent" />
                    </TableHead>
                    <TableHead className="text-zinc-500 text-xs cursor-pointer select-none" onClick={() => handleSort("health")}>
                      Health <SortIcon col="health" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTeams.map((team) => (
                    <TableRow
                      key={team.teamId}
                      className={`border-zinc-800 cursor-pointer transition-colors ${selectedTeamId === team.teamId ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
                      onClick={() => setSelectedTeamId(team.teamId === selectedTeamId ? null : team.teamId)}
                      data-testid={`row-team-${team.teamName.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <TableCell className="text-white font-medium text-sm">{team.teamName}</TableCell>
                      <TableCell className="text-zinc-400 text-sm">{team.managerName}</TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">{team.memberCount}</TableCell>
                      <TableCell className="text-zinc-300 text-sm text-right font-medium">{team.score}</TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">{team.velocity}</TableCell>
                      <TableCell className={`text-sm text-right ${team.overduePercent > 15 ? "text-red-400" : "text-zinc-400"}`}>
                        {team.overduePercent}%
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${HEALTH_BADGE[team.health] || HEALTH_BADGE.on_track}`}>
                          {HEALTH_LABEL[team.health] || "On Track"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-zinc-500 text-sm">No teams found. Set up manager assignments first.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Workforce Overview</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {sortedTeams.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sortedTeams.map((team) => (
                  <div key={team.teamId} className="text-center">
                    <p className="text-xs text-zinc-500 mb-1">{team.teamName}</p>
                    <p className={`text-2xl font-bold ${team.score >= 70 ? "text-green-400" : team.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {team.score}
                    </p>
                    <p className="text-xs text-zinc-600">{team.memberCount} members</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">No workforce data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Risk Distribution</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-green-500" data-testid="card-risk-on-track">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">On Track</p>
              <p className="text-3xl font-bold text-green-400">{data.riskDistribution.onTrack}</p>
              <p className="text-xs text-zinc-600 mt-1">employees</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-yellow-500" data-testid="card-risk-needs-attention">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">Needs Attention</p>
              <p className="text-3xl font-bold text-yellow-400">{data.riskDistribution.needsAttention}</p>
              <p className="text-xs text-zinc-600 mt-1">employees</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-red-500" data-testid="card-risk-at-risk">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">At Risk</p>
              <p className="text-3xl font-bold text-red-400">{data.riskDistribution.atRisk}</p>
              <p className="text-xs text-zinc-600 mt-1">employees</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">AI Executive Brief</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white">Organisation Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {executiveInsight ? (
              <div className="flex gap-2">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">💡</span>
                <div>
                  <p className="text-sm font-medium text-white">{executiveInsight.title}</p>
                  <p className="text-sm text-zinc-300 mt-1">{executiveInsight.message}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                Executive insights will appear as organization data accumulates.
              </p>
            )}
            {sortedTeams.length > 0 && (() => {
              const topTeams = sortedTeams.filter(t => t.score >= data.orgScore);
              const riskTeams = sortedTeams.filter(t => t.health === "at_risk");
              return (
                <>
                  {topTeams.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                      <p className="text-sm text-zinc-300">
                        <span className="font-medium text-white">Strong teams: </span>
                        {topTeams.map(t => t.teamName).join(", ")} performing above org average of {data.orgScore}.
                      </p>
                    </div>
                  )}
                  {riskTeams.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-yellow-400 flex-shrink-0 mt-0.5">⚠</span>
                      <p className="text-sm text-zinc-300">
                        <span className="font-medium text-white">Watch list: </span>
                        {riskTeams.map(t => t.teamName).join(", ")} {riskTeams.length === 1 ? "is" : "are"} at risk with overdue rates above acceptable thresholds.
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
