import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Zap, X } from "lucide-react";
import ScoreCircle from "./shared/ScoreCircle";
import MetricCard from "./shared/MetricCard";
import InsightCard from "./shared/InsightCard";

const TASK_ROWS = [
  { day: 'Mon', assigned: 10, completed: 8, overdue: 1 },
  { day: 'Tue', assigned: 8, completed: 7, overdue: 0 },
  { day: 'Wed', assigned: 12, completed: 10, overdue: 2 },
  { day: 'Thu', assigned: 9, completed: 8, overdue: 1 },
  { day: 'Fri', assigned: 7, completed: 7, overdue: 0 },
  { day: 'Sat', assigned: null, completed: null, overdue: null },
  { day: 'Sun', assigned: null, completed: null, overdue: null },
];

const TIME_SEGMENTS = [
  { label: 'Deep Work', minutes: 210, color: 'bg-blue-500' },
  { label: 'Shallow Work', minutes: 90, color: 'bg-zinc-500' },
  { label: 'Meetings', minutes: 75, color: 'bg-purple-500' },
  { label: 'Breaks', minutes: 45, color: 'bg-green-500' },
];

const TOTAL_MINUTES = TIME_SEGMENTS.reduce((s, t) => s + t.minutes, 0);

const HARDCODED_INSIGHTS = [
  {
    category: 'achievement',
    title: 'Strong Week',
    message: 'You completed 23 tasks this week, placing you in the top 20% of your team. Your consistency has improved significantly over the past month.',
    confidence: 'high',
    timestamp: 'Today',
    isRead: false,
  },
  {
    category: 'suggestion',
    title: 'Protect Your Peak Hours',
    message: 'Your data shows 9–11 AM is your most productive window. Consider blocking this time for deep work and moving meetings to the afternoon.',
    confidence: 'high',
    timestamp: 'Yesterday',
    isRead: true,
  },
  {
    category: 'warning',
    title: 'Overdue Tasks Increasing',
    message: 'You have 2 tasks overdue, up from 0 last week. Review your workload and consider reprioritizing or requesting deadline extensions.',
    confidence: 'medium',
    timestamp: '2 days ago',
    isRead: false,
  },
];

export default function EmployeeDashboard() {
  const [briefOpen, setBriefOpen] = useState(true);
  const [briefDismissed, setBriefDismissed] = useState(false);
  const [insights, setInsights] = useState(HARDCODED_INSIGHTS);

  const handleMarkRead = (idx: number) => {
    setInsights(prev => prev.map((ins, i) => i === idx ? { ...ins, isRead: true } : ins));
  };
  const handleDismiss = (idx: number) => {
    setInsights(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* Section A — Morning Brief */}
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
                    onClick={() => setBriefDismissed(true)}
                    data-testid="button-close-brief"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                <p className="text-white font-medium">Good morning! Here's your daily brief.</p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Yesterday you completed <span className="text-white font-medium">8 tasks</span> with{' '}
                  <span className="text-white font-medium">3.5 hours</span> of focused work. Your productivity score was{' '}
                  <span className="text-blue-400 font-medium">74</span>, up 5% from the day before.
                </p>
                <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Today's Suggestion</p>
                  <p className="text-sm text-zinc-300">
                    Try starting today with a 45-minute focus session on your highest priority task.
                  </p>
                </div>
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

      {/* Section B — Score Overview Row */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4">Score Overview</h2>
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
          <div className="flex justify-center lg:justify-start">
            <ScoreCircle score={72} label="Productivity" trend="up" size="lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
            <MetricCard title="Tasks Completed" value="8" delta="+2" trend="up" />
            <MetricCard title="Focus Time" value="3.5h" delta="+0.5h" trend="up" />
            <MetricCard title="Overdue Tasks" value="2" delta="+1" trend="down" />
            <MetricCard title="Day Streak" value="5" subtitle="consecutive days" />
          </div>
        </div>
      </div>

      {/* Section C — Time Distribution */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Time Distribution — Today</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-4">
            <div className="flex w-full h-8 rounded-lg overflow-hidden gap-0.5" data-testid="time-distribution-bar">
              {TIME_SEGMENTS.map((seg) => (
                <div
                  key={seg.label}
                  className={`${seg.color} h-full transition-all`}
                  style={{ width: `${(seg.minutes / TOTAL_MINUTES) * 100}%` }}
                  title={`${seg.label}: ${seg.minutes}min`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {TIME_SEGMENTS.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${seg.color} flex-shrink-0`} />
                  <span className="text-xs text-zinc-400">{seg.label}</span>
                  <span className="text-xs text-zinc-600">{seg.minutes}min</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section D — Task Performance */}
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
                  {TASK_ROWS.map((row) => (
                    <TableRow key={row.day} className="border-zinc-800 hover:bg-zinc-800/50" data-testid={`row-task-${row.day.toLowerCase()}`}>
                      <TableCell className="text-zinc-300 text-sm font-medium">{row.day}</TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">{row.assigned ?? '—'}</TableCell>
                      <TableCell className="text-zinc-400 text-sm text-right">{row.completed ?? '—'}</TableCell>
                      <TableCell className={`text-sm text-right ${row.overdue != null && row.overdue > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                        {row.overdue ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Deadline Adherence</p>
                <p className="text-xl font-bold text-green-400">85%</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Avg Completion Time</p>
                <p className="text-xl font-bold text-white">2.3 hours</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Section E — Trend Chart Placeholder */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">Productivity Trend — Last 14 Days</h2>
        <div
          className="border-2 border-dashed border-zinc-700 rounded-xl flex items-center justify-center text-zinc-600 text-sm"
          style={{ height: 250 }}
          data-testid="chart-placeholder-trend"
        >
          Chart loading...
        </div>
      </div>

      {/* Section F — Compare Periods */}
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
              data-testid="button-compare-periods"
            >
              Compare
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Section G — AI Insights Feed */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">AI Insights</h2>
        <div className="space-y-3">
          {insights.map((ins, idx) => (
            <InsightCard
              key={idx}
              {...ins}
              onMarkRead={() => handleMarkRead(idx)}
              onDismiss={() => handleDismiss(idx)}
            />
          ))}
          {insights.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6 text-center text-zinc-500 text-sm">
                No active insights. Check back later.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
