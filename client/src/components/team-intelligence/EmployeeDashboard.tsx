import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Zap, X } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Tooltip } from "recharts";
import ScoreCircle from "./shared/ScoreCircle";
import MetricCard from "./shared/MetricCard";
import InsightCard from "./shared/InsightCard";
import ComparisonDrawer from "./shared/ComparisonDrawer";
import { useAuth } from "@/hooks/use-auth";
import type { EmployeeDashboardData, DailySnapshotData } from "@shared/lib/team-intelligence/types";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export default function EmployeeDashboard({ workspaceId = "default" }: { workspaceId?: string }) {
  const [briefOpen, setBriefOpen] = useState(true);
  const [briefDismissed, setBriefDismissed] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const { user } = useAuth();

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 14);
  const fromStr = from.toISOString().split("T")[0];
  const toStr = now.toISOString().split("T")[0];

  const { data: dashboard, isLoading: dashLoading } = useQuery<EmployeeDashboardData>({
    queryKey: [`/api/team-intelligence/my-dashboard?workspaceId=${workspaceId}&from=${fromStr}&to=${toStr}`],
  });

  const { data: insightsData, isLoading: insightsLoading } = useQuery<{ insights: any[]; total: number }>({
    queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`],
  });

  const { data: alerts } = useQuery<any[]>({
    queryKey: [`/api/team-intelligence/alerts?workspaceId=${workspaceId}`],
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/team-intelligence/insights/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`] });
    },
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/team-intelligence/insights/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team-intelligence/insights?workspaceId=${workspaceId}&limit=10&unreadOnly=false`] });
    },
  });

  const today = dashboard?.todaySnapshot;
  const recent = dashboard?.recentSnapshots || [];
  const last7 = recent.slice(0, 7).reverse();
  const last14 = [...recent].reverse();
  const scores = dashboard?.currentScores;
  const streak = dashboard?.streak ?? 0;
  const insights = insightsData?.insights || [];

  const morningInsight = useMemo(() => {
    return insights.find((i: any) => i.category === "suggestion" || i.category === "pattern");
  }, [insights]);

  const prevScore = recent.length >= 2 ? recent[1]?.productivityScore : null;
  const trend = scores && prevScore != null
    ? (scores.total > prevScore ? "up" : scores.total < prevScore ? "down" : "stable")
    : "stable";

  const totalScore = scores?.total ?? 0;
  const focusMinutes = today?.deepWorkMinutes ?? 0;
  const focusHours = Math.round(focusMinutes / 60 * 10) / 10;
  const tasksCompleted = today?.tasksCompleted ?? 0;
  const tasksOverdue = today?.tasksOverdue ?? 0;

  const pieData = useMemo(() => {
    if (!today) return [];
    const deep = today.deepWorkMinutes;
    const shallow = today.shallowWorkMinutes;
    const meetings = today.meetingTimeMinutes;
    const remainder = Math.max(0, today.activeTimeMinutes - deep - shallow - meetings);
    return [
      { name: "Deep Work", value: deep, fill: "#3B82F6" },
      { name: "Shallow Work", value: shallow, fill: "#6B7280" },
      { name: "Meetings", value: meetings, fill: "#8B5CF6" },
      { name: "Other", value: remainder, fill: "#22C55E" },
    ];
  }, [today]);

  const barData = useMemo(() => {
    return last7.map((s: DailySnapshotData) => ({
      day: formatDay(s.date),
      date: s.date,
      Completed: s.tasksCompleted,
      Assigned: s.tasksAssigned,
    }));
  }, [last7]);

  const deadlineAdherence = useMemo(() => {
    const totalAssigned = last7.reduce((s, d) => s + d.tasksAssigned, 0);
    const totalOverdue = last7.reduce((s, d) => s + d.tasksOverdue, 0);
    return totalAssigned > 0 ? Math.round(((totalAssigned - totalOverdue) / totalAssigned) * 100) : 100;
  }, [last7]);

  if (dashLoading) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <Skeleton className="h-28 w-full bg-zinc-800 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full bg-zinc-800 rounded-xl" />
        <Skeleton className="h-64 w-full bg-zinc-800 rounded-xl" />
        <Skeleton className="h-64 w-full bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!dashboard || recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-zinc-400 text-sm max-w-md">
          No productivity data yet. Complete tasks, run focus sessions, and check back. You can also ask an admin to seed demo data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {!briefDismissed && (
        <Collapsible open={briefOpen} onOpenChange={setBriefOpen}>
          <Card className="bg-zinc-900 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.08)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">☀️</span>
                  <CardTitle className="text-base font-semibold text-white">Morning Brief</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400" data-testid="button-toggle-brief">
                      {briefOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
                    onClick={() => {
                      setBriefDismissed(true);
                      if (morningInsight?.id) {
                        dismissMut.mutate(morningInsight.id);
                      }
                    }}
                    data-testid="button-close-brief"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {morningInsight ? (
                  <>
                    <p className="text-white font-medium">{morningInsight.title}</p>
                    <p className="text-zinc-400 text-sm leading-relaxed">{morningInsight.message}</p>
                  </>
                ) : (
                  <>
                    <p className="text-white font-medium">Good morning!</p>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Complete some tasks and focus sessions to start receiving personalized insights.
                    </p>
                  </>
                )}
                {today && (
                  <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Today's Stats</p>
                    <p className="text-sm text-zinc-300">
                      Score: <span className="text-blue-400 font-medium">{totalScore}</span> · Tasks: <span className="text-white font-medium">{tasksCompleted}</span> · Focus: <span className="text-white font-medium">{focusHours}h</span>
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white" data-testid="button-start-focus">
                    <Zap className="w-3.5 h-3.5" />
                    Start Focus Session
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-zinc-400 hover:text-white"
                    onClick={() => setBriefDismissed(true)}
                    data-testid="button-dismiss-brief"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4">Score Overview</h2>
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

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Time Distribution — Today</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ReTooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {pieData.map((seg) => (
                    <div key={seg.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.fill }} />
                      <span className="text-xs text-zinc-400">{seg.name}</span>
                      <span className="text-xs text-zinc-600">{seg.value}min</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">No time data recorded today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Task Performance — Last 7 Days</h2>
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
                  {last7.map((row: DailySnapshotData) => (
                    <TableRow key={row.date} className="border-zinc-800 hover:bg-zinc-800/50" data-testid={`row-task-${row.date}`}>
                      <TableCell className="text-zinc-300 text-sm font-medium">{formatDate(row.date)}</TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">{row.tasksAssigned}</TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">{row.tasksCompleted}</TableCell>
                      <TableCell className={`text-sm text-right ${row.tasksOverdue > 0 ? "text-red-400" : "text-zinc-400"}`}>
                        {row.tasksOverdue}
                      </TableCell>
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
                    <Bar dataKey="Assigned" fill="#6B7280" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="#22C55E" radius={[4, 4, 0, 0]} />
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
                <p className="text-xs text-zinc-500 mb-1">Avg Focus/Day</p>
                <p className="text-xl font-bold text-white">
                  {last7.length > 0 ? (Math.round(last7.reduce((s, d) => s + d.deepWorkMinutes, 0) / last7.length / 60 * 10) / 10) : 0}h
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Productivity Trend — Last 14 Days</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {last14.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={last14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8 }} labelFormatter={formatDate} />
                  <Line type="monotone" dataKey="productivityScore" name="Score" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-8">Not enough data to display trend. Check back after a few days.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Compare Periods</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Select two time periods to compare your productivity metrics.
            </p>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap"
              onClick={() => setIsComparisonOpen(true)}
              data-testid="button-compare-periods"
            >
              Compare
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">AI Insights</h2>
        {insightsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
          </div>
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
                onMarkRead={() => markReadMut.mutate(ins.id)}
                onDismiss={() => dismissMut.mutate(ins.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500 text-sm">
              No active insights. Check back later.
            </CardContent>
          </Card>
        )}
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
