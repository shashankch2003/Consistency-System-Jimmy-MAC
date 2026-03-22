import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface TeamTask {
  id: number;
  projectId: number;
  title: string;
  status: string;
  priority: string;
  assigneeId?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
}

interface WorkspaceMember {
  id: number;
  userId?: string;
  email: string;
  displayName?: string;
}

interface DashboardViewProps {
  projectId: number;
  members: WorkspaceMember[];
}

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "#6b7280",
  "In Progress": "#3b82f6",
  "In Review": "#eab308",
  "Completed": "#22c55e",
};

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

export function DashboardView({ projectId, members }: DashboardViewProps) {
  const { data: tasks = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks", projectId],
    queryFn: () => fetch(`/api/team-tasks?projectId=${projectId}`).then((r) => r.json()),
    enabled: !!projectId,
  });

  const byStatus = Object.entries(
    tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const byPriority = Object.entries(
    tasks.reduce((acc, t) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const byAssignee = members.map((m) => {
    const memberTasks = tasks.filter((t) => t.assigneeId === m.userId || t.assigneeId === m.email);
    const done = memberTasks.filter((t) => t.status === "Completed").length;
    const inProg = memberTasks.filter((t) => t.status === "In Progress").length;
    const notStarted = memberTasks.filter((t) => t.status === "Not Started").length;
    return {
      name: m.displayName || m.email.split("@")[0],
      Done: done,
      "In Progress": inProg,
      "Not Started": notStarted,
    };
  }).filter((m) => m.Done + m["In Progress"] + m["Not Started"] > 0);

  const completionRate = tasks.length
    ? Math.round((tasks.filter((t) => t.status === "Completed").length / tasks.length) * 100)
    : 0;

  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === "Completed") return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  return (
    <div className="p-4 overflow-auto h-full" data-testid="dashboard-view">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Tasks", value: tasks.length },
          { label: "Completed", value: tasks.filter((t) => t.status === "Completed").length },
          { label: "Completion Rate", value: `${completionRate}%` },
          { label: "Overdue", value: overdue },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Status distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {byStatus.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#888"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Priority Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byPriority}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {byPriority.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? "#888"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* By assignee */}
      {byAssignee.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tasks by Member</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byAssignee} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Done" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="In Progress" fill="#3b82f6" stackId="a" />
                <Bar dataKey="Not Started" fill="#6b7280" stackId="a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
