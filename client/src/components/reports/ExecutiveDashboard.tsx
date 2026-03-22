import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Brain, FolderKanban, CheckCircle, Users, Target, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ExecutiveSummary {
  productivityScore: number;
  activeProjects: number;
  tasksCompletedThisWeek: number;
  teamUtilization: number;
  onTimeDeliveryRate: number;
  avgTaskCompletionDays: number;
  projectsAtRisk: any[];
  teamSize: number;
}

const DEPT_DATA = [
  { dept: "Engineering", score: 84 },
  { dept: "Design", score: 79 },
  { dept: "Product", score: 88 },
  { dept: "Marketing", score: 71 },
  { dept: "Sales", score: 76 },
];

export function ExecutiveDashboard() {
  const { workspaceId } = useWorkspace();

  const { data, isLoading } = useQuery<ExecutiveSummary>({
    queryKey: ["/api/reports/executive", workspaceId],
    queryFn: () => fetch(`/api/reports/executive?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const cards = [
    {
      label: "Company Productivity Score",
      value: `${data?.productivityScore ?? 0}`,
      unit: "/ 100",
      icon: Brain,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Active Projects",
      value: `${data?.activeProjects ?? 0}`,
      icon: FolderKanban,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Tasks Completed This Week",
      value: `${data?.tasksCompletedThisWeek ?? 0}`,
      icon: CheckCircle,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Team Utilization",
      value: `${data?.teamUtilization ?? 0}%`,
      icon: Users,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "On-Time Delivery Rate",
      value: `${data?.onTimeDeliveryRate ?? 0}%`,
      icon: Target,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Avg Task Completion Time",
      value: `${data?.avgTaskCompletionDays ?? 0}d`,
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="executive-dashboard">
      {/* Summary cards — 3x2 */}
      <div className="grid grid-cols-3 gap-4">
        {cards.map(({ label, value, unit, icon: Icon, color, bg }) => (
          <Card key={label} data-testid={`card-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg ${bg} shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                <p className="font-bold text-2xl leading-tight">
                  {value}<span className="text-sm font-normal text-muted-foreground ml-0.5">{unit}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Department Performance Comparison */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">Department Performance Comparison</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEPT_DATA} margin={{ left: -10 }}>
              <CartesianGrid stroke="#374151" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dept" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: number) => [`${v}`, "Score"]}
              />
              <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Projects at Risk */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <p className="font-semibold text-sm">Projects at Risk</p>
          </div>
          {(!data?.projectsAtRisk || data.projectsAtRisk.length === 0) ? (
            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              No projects at risk — great job!
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Project", "Status", "Completion", "Overdue Tasks", "Risk"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.projectsAtRisk.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-muted/10" data-testid={`risk-row-${p.id}`}>
                    <td className="px-3 py-2 font-medium truncate max-w-[200px]">{p.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">{p.status || "Active"}</Badge>
                    </td>
                    <td className="px-3 py-2">{p.completion ?? 0}%</td>
                    <td className="px-3 py-2 text-red-400">{p.overdueCount}</td>
                    <td className="px-3 py-2">
                      <Badge className={p.overdueCount > 3 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}>
                        {p.overdueCount > 3 ? "High" : "Medium"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
