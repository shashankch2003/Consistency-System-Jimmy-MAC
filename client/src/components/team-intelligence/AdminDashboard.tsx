import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import MetricCard from "./shared/MetricCard";

const TEAMS = [
  { name: 'Engineering', manager: 'Alex Chen', members: 12, score: 72, velocity: 89, overduePercent: 8, health: 'On Track' },
  { name: 'Design', manager: 'Maria Garcia', members: 6, score: 65, velocity: 71, overduePercent: 14, health: 'Needs Attention' },
  { name: 'Marketing', manager: 'James Wilson', members: 8, score: 58, velocity: 62, overduePercent: 22, health: 'At Risk' },
  { name: 'Sales', manager: 'David Park', members: 10, score: 70, velocity: 83, overduePercent: 10, health: 'On Track' },
];

const HEALTH_BADGE: Record<string, string> = {
  'On Track': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Needs Attention': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'At Risk': 'bg-red-500/20 text-red-400 border-red-500/30',
};

const RISK_ITEMS = [
  { label: 'On Track', count: 32, border: 'border-l-green-500', text: 'text-green-400' },
  { label: 'Needs Attention', count: 9, border: 'border-l-yellow-500', text: 'text-yellow-400' },
  { label: 'At Risk', count: 4, border: 'border-l-red-500', text: 'text-red-400' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* Section A — Org Overview */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4">Organisation Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard title="Org Score" value="67" delta="+2" trend="up" />
          <MetricCard title="Total Employees" value="45" />
          <MetricCard title="Tasks Completed" value="312" subtitle="this week" />
          <MetricCard title="Deadline Adherence" value="82%" />
          <MetricCard title="Avg Focus Time" value="3.2h" subtitle="per day" />
        </div>
      </div>

      {/* Section B — Teams Overview Table */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Teams Overview</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs">Team</TableHead>
                  <TableHead className="text-zinc-500 text-xs">Manager</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Members</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Score</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Velocity</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Overdue %</TableHead>
                  <TableHead className="text-zinc-500 text-xs">Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TEAMS.map((team) => (
                  <TableRow key={team.name} className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors" data-testid={`row-team-${team.name.toLowerCase()}`}>
                    <TableCell className="text-white font-medium text-sm">{team.name}</TableCell>
                    <TableCell className="text-zinc-400 text-sm">{team.manager}</TableCell>
                    <TableCell className="text-zinc-400 text-sm text-right">{team.members}</TableCell>
                    <TableCell className="text-zinc-300 text-sm text-right font-medium">{team.score}</TableCell>
                    <TableCell className="text-zinc-400 text-sm text-right">{team.velocity}</TableCell>
                    <TableCell className={`text-sm text-right ${team.overduePercent > 15 ? 'text-red-400' : 'text-zinc-400'}`}>
                      {team.overduePercent}%
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${HEALTH_BADGE[team.health]}`}>
                        {team.health}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Section C — Workforce Trends Placeholder */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Workforce Trends</h2>
        <div
          className="border-2 border-dashed border-zinc-700 rounded-xl flex items-center justify-center text-zinc-600 text-sm"
          style={{ height: 250 }}
          data-testid="chart-placeholder-workforce"
        >
          Chart loading...
        </div>
      </div>

      {/* Section D — Risk Distribution */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Risk Distribution</h2>
        <div className="grid grid-cols-3 gap-3">
          {RISK_ITEMS.map((item) => (
            <Card key={item.label} className={`bg-zinc-900 border-zinc-800 border-l-4 ${item.border}`} data-testid={`card-risk-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">{item.label}</p>
                <p className={`text-3xl font-bold ${item.text}`}>{item.count}</p>
                <p className="text-xs text-zinc-600 mt-1">employees</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Section E — AI Executive Brief */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">AI Executive Brief</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white">Organisation Summary — This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-white">Team strength:</span> Engineering and Sales are performing above the org average of 67, with Engineering leading at 72. Task velocity in these teams is consistently high and deadline adherence is within acceptable thresholds.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-yellow-400 flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-white">Watch list:</span> Marketing is showing a declining trend with a score of 58 and 22% overdue rate — the highest across all teams. Four employees are currently classified as At Risk and may need immediate intervention.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0 mt-0.5">💡</span>
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-white">Meeting load recommendation:</span> Across the organisation, 3 of 4 teams are spending more than 35% of active time in meetings. Consider a company-wide focus block policy (e.g., no meetings before 11 AM) to improve deep work time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
