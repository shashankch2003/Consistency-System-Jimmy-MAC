import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Activity, AlertTriangle, Users, Heart, Zap, TrendingUp } from "lucide-react";

interface Snapshot {
  userId: string;
  overallScore: number;
  tasksCompleted: number;
  hoursWorked: number;
  consistencyScore: number;
  collaborationScore: number;
  date: string;
}

export function TeamHealthDashboard() {
  const { workspaceId } = useWorkspace();

  const { data: healthData } = useQuery<{ snapshots: Snapshot[]; date: string }>({
    queryKey: ["/api/productivity/team-health", workspaceId],
    queryFn: () => fetch(`/api/productivity/team-health?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const snapshots = healthData?.snapshots ?? [];

  const avgScore = snapshots.length
    ? Math.round(snapshots.reduce((a, s) => a + (s.overallScore ?? 0), 0) / snapshots.length)
    : 0;

  const totalHours = snapshots.reduce((a, s) => a + (s.hoursWorked ?? 0), 0);
  const totalTasks = snapshots.reduce((a, s) => a + (s.tasksCompleted ?? 0), 0);

  // Mock velocity data for 6 weeks
  const velocityData = Array.from({ length: 6 }, (_, i) => ({
    week: `W${i + 1}`,
    velocity: Math.round(60 + Math.random() * 30),
    completed: Math.round(8 + Math.random() * 12),
  }));

  // Workload per member
  const workloadData = snapshots.slice(0, 8).map((s, i) => ({
    name: `M${i + 1}`,
    hours: s.hoursWorked ?? 0,
    tasks: s.tasksCompleted ?? 0,
  }));

  const avgCollaboration = snapshots.length
    ? Math.round(snapshots.reduce((a, s) => a + (s.collaborationScore ?? 0), 0) / snapshots.length)
    : 0;

  const burnoutRisk = snapshots.filter((s) => (s.hoursWorked ?? 0) > 10 || (s.overallScore ?? 0) < 40);

  const getBurnoutBadge = (count: number) => {
    if (count === 0) return <Badge className="bg-green-500/20 text-green-400">Low Risk</Badge>;
    if (count <= 2) return <Badge className="bg-yellow-500/20 text-yellow-400">Moderate</Badge>;
    return <Badge className="bg-red-500/20 text-red-400">High Risk</Badge>;
  };

  const chartDefaults = {
    style: { background: "transparent" },
    tick: { fill: "#9ca3af", fontSize: 11 },
  };

  return (
    <div className="space-y-4" data-testid="team-health-dashboard">
      {/* Metric cards row 1 */}
      <div className="grid grid-cols-3 gap-4">
        {/* Team Velocity */}
        <Card className="col-span-1">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />Team Velocity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={velocityData}>
                <Line type="monotone" dataKey="velocity" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <XAxis dataKey="week" {...chartDefaults} tick={chartDefaults.tick} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-muted-foreground mt-1">Last 6 weeks</p>
          </CardContent>
        </Card>

        {/* Bottleneck Detection */}
        <Card className="col-span-1">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />Bottlenecks
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">{snapshots.filter((s) => (s.overallScore ?? 0) < 50).length}</div>
            <p className="text-xs text-muted-foreground">Members below 50%</p>
            <div className="mt-2 text-xs text-muted-foreground">
              Avg team score: <span className="text-foreground font-medium">{avgScore}</span>
            </div>
          </CardContent>
        </Card>

        {/* Workload Balance */}
        <Card className="col-span-1">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-green-400" />Workload Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={workloadData}>
                <Bar dataKey="hours" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <XAxis dataKey="name" {...chartDefaults} tick={chartDefaults.tick} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Metric cards row 2 */}
      <div className="grid grid-cols-3 gap-4">
        {/* Burnout Risk */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-red-400" />Burnout Risk
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {getBurnoutBadge(burnoutRisk.length)}
            <p className="text-xs text-muted-foreground mt-2">
              {burnoutRisk.length} of {snapshots.length} members flagged
            </p>
          </CardContent>
        </Card>

        {/* Team Morale Proxy */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-pink-400" />Team Morale
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-3 flex-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                  style={{ width: `${avgCollaboration}%` }}
                />
              </div>
              <span className="text-sm font-bold">{avgCollaboration}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Based on collaboration score</p>
          </CardContent>
        </Card>

        {/* Sprint Velocity Trend */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-blue-400" />Sprint Velocity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={velocityData}>
                <Bar dataKey="completed" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <XAxis dataKey="week" {...chartDefaults} tick={chartDefaults.tick} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {snapshots.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No productivity data available for this workspace yet.
        </div>
      )}
    </div>
  );
}
