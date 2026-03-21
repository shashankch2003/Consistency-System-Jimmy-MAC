import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, Award, Check, Clock } from "lucide-react";
import MetricCard from "./shared/MetricCard";
import ScoreCircle from "./shared/ScoreCircle";

const MEMBERS = [
  { name: 'Alex Chen', initials: 'AC', color: 'bg-blue-600', score: 82, tasks: 12, overdue: 0, status: 'On Track' },
  { name: 'Maria Garcia', initials: 'MG', color: 'bg-purple-600', score: 71, tasks: 9, overdue: 1, status: 'On Track' },
  { name: 'James Wilson', initials: 'JW', color: 'bg-yellow-600', score: 58, tasks: 6, overdue: 3, status: 'Needs Attention' },
  { name: 'Sarah Kim', initials: 'SK', color: 'bg-red-600', score: 45, tasks: 4, overdue: 4, status: 'At Risk' },
  { name: 'David Park', initials: 'DP', color: 'bg-green-600', score: 76, tasks: 10, overdue: 0, status: 'On Track' },
  { name: 'Lisa Johnson', initials: 'LJ', color: 'bg-orange-600', score: 63, tasks: 7, overdue: 2, status: 'Needs Attention' },
];

const WORKLOAD = [
  { name: 'Alex Chen', pct: 85, color: 'bg-green-500' },
  { name: 'Maria Garcia', pct: 70, color: 'bg-green-500' },
  { name: 'James Wilson', pct: 110, color: 'bg-red-500' },
  { name: 'Sarah Kim', pct: 120, color: 'bg-red-500' },
  { name: 'David Park', pct: 60, color: 'bg-green-500' },
  { name: 'Lisa Johnson', pct: 95, color: 'bg-yellow-500' },
];

const STATUS_BADGE: Record<string, string> = {
  'On Track': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Needs Attention': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'At Risk': 'bg-red-500/20 text-red-400 border-red-500/30',
};

function AlertItem({ icon, color, title, message, showSnooze }: { icon: React.ReactNode; color: string; title: string; message: string; showSnooze?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${color} bg-zinc-900`}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{message}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {showSnooze && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-zinc-400 hover:text-white" data-testid="button-snooze-alert">
            <Clock className="w-3 h-3 mr-1" /> Snooze
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-zinc-400 hover:text-green-400"
          onClick={() => setDismissed(true)}
          data-testid="button-acknowledge-alert"
        >
          <Check className="w-3 h-3 mr-1" /> Acknowledge
        </Button>
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* Section A — Team Overview */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4">Team Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard title="Team Score" value="68" delta="+3" trend="up" />
          <MetricCard title="Members" value="8" />
          <MetricCard title="Tasks Completed" value="47" subtitle="this week" />
          <MetricCard title="Overdue" value="6" delta="+2" trend="down" />
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Team Health</p>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                Needs Attention
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section B — Team Member Grid */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MEMBERS.map((m) => (
            <Card key={m.name} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer" data-testid={`card-member-${m.name.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${m.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{m.name}</p>
                  <p className="text-xs text-zinc-500">Team Member</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-400">{m.tasks} tasks</span>
                    {m.overdue > 0
                      ? <span className="text-xs text-red-400">{m.overdue} overdue</span>
                      : <span className="text-xs text-green-400">0 overdue</span>
                    }
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ScoreCircle score={m.score} label="" size="sm" />
                  <Badge variant="outline" className={`text-xs ${STATUS_BADGE[m.status]}`}>
                    {m.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Section C — Active Alerts */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Active Alerts</h2>
        <div className="space-y-2">
          <AlertItem
            icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
            color="border-red-500/30"
            title="Critical: Overdue Task Spike"
            message="Sarah Kim has 4 overdue tasks — up from 1 last week. Immediate attention may be needed."
            showSnooze
          />
          <AlertItem
            icon={<TrendingDown className="w-4 h-4 text-yellow-400" />}
            color="border-yellow-500/30"
            title="Warning: Declining Productivity"
            message="James Wilson's productivity score has dropped 18% over the past two weeks."
            showSnooze
          />
          <AlertItem
            icon={<Award className="w-4 h-4 text-blue-400" />}
            color="border-blue-500/30"
            title="Info: Personal Best Achieved"
            message="Alex Chen achieved a personal best productivity score of 82 this week."
          />
        </div>
      </div>

      {/* Section D — Workload Balance */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Workload Balance</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-3">
            {WORKLOAD.map((w) => (
              <div key={w.name} className="space-y-1" data-testid={`workload-${w.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{w.name}</span>
                  <span className={w.pct > 100 ? 'text-red-400 font-medium' : 'text-zinc-400'}>{w.pct}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${w.color}`}
                    style={{ width: `${Math.min(w.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-zinc-600 pt-1">100% = standard capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Section E — Team Trend Placeholder */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Team Trend — Last 14 Days</h2>
        <div
          className="border-2 border-dashed border-zinc-700 rounded-xl flex items-center justify-center text-zinc-600 text-sm"
          style={{ height: 250 }}
          data-testid="chart-placeholder-team-trend"
        >
          Chart loading...
        </div>
      </div>

      {/* Section F — AI Team Brief */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">AI Team Brief</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-white">Weekly Team Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-white">Strong performers:</span> Alex Chen and David Park are consistently above team average, with Alex achieving a new personal best of 82 this week.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-yellow-400 flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-white">Risk items:</span> Sarah Kim and James Wilson are showing signs of overload — their workload exceeds 100% capacity and overdue counts are rising.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0 mt-0.5">💡</span>
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-white">Suggestion:</span> Consider redistributing 2–3 tasks from Sarah and James to David, who is currently at 60% capacity. This could reduce overdue risk by an estimated 40%.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
