import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Clock, Briefcase, TrendingUp, AlertCircle } from "lucide-react";

interface TimeEntry {
  id: number;
  date: string;
  minutes: number;
  notes: string;
  taskId?: number;
  projectId?: number;
  source: string;
}

type Range = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

function getDateRange(range: Range, customFrom?: string, customTo?: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const startOfWeek = (d: Date) => {
    const copy = new Date(d);
    copy.setDate(d.getDate() - d.getDay());
    return copy;
  };

  switch (range) {
    case "thisWeek": {
      const s = startOfWeek(now);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      return { from: fmt(s), to: fmt(e) };
    }
    case "lastWeek": {
      const s = startOfWeek(now); s.setDate(s.getDate() - 7);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      return { from: fmt(s), to: fmt(e) };
    }
    case "thisMonth":
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case "lastMonth":
      return { from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case "custom":
      return { from: customFrom || fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: customTo || fmt(now) };
  }
}

interface TimeReportProps {
  workspaceId?: number | null;
}

export function TimeReport({ workspaceId }: TimeReportProps) {
  const [range, setRange] = useState<Range>("thisWeek");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = getDateRange(range, customFrom, customTo);

  const { data: entries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", from, to],
    queryFn: () => fetch(`/api/time-entries?dateFrom=${from}&dateTo=${to}`).then((r) => r.json()),
  });

  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const days = new Set(entries.map((e) => e.date)).size || 1;
  const avgHoursPerDay = (totalMinutes / 60 / days).toFixed(1);
  const overtime = Math.max(0, totalMinutes / 60 - days * 8).toFixed(1);

  // Project aggregation (mock since we don't have project names here)
  const byProject: Record<string, number> = {};
  entries.forEach((e) => {
    const key = e.projectId ? `Project ${e.projectId}` : "No Project";
    byProject[key] = (byProject[key] ?? 0) + e.minutes;
  });
  const projectData = Object.entries(byProject).map(([name, minutes]) => ({
    name,
    hours: parseFloat((minutes / 60).toFixed(1)),
  }));
  const mostTimeOn = projectData.sort((a, b) => b.hours - a.hours)[0]?.name ?? "—";

  const statsCards = [
    { label: "Total Hours", value: `${totalHours}h`, icon: Clock, color: "text-blue-400" },
    { label: "Avg Hours/Day", value: `${avgHoursPerDay}h`, icon: TrendingUp, color: "text-green-400" },
    { label: "Most Time On", value: mostTimeOn, icon: Briefcase, color: "text-purple-400" },
    { label: "Overtime", value: `${overtime}h`, icon: AlertCircle, color: "text-orange-400" },
  ];

  return (
    <div className="space-y-4" data-testid="time-report">
      {/* Range selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-44" data-testid="select-date-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thisWeek">This Week</SelectItem>
            <SelectItem value="lastWeek">Last Week</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="lastMonth">Last Month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {range === "custom" && (
          <>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" data-testid="input-custom-from" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40" data-testid="input-custom-to" />
          </>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {statsCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-start gap-3">
              <Icon className={`h-5 w-5 ${color} shrink-0 mt-0.5`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold text-lg leading-tight">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart — hours per project */}
      {projectData.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">Hours by Project</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={projectData}>
                <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detail table */}
      <Card>
        <CardContent className="pt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Task ID", "Project ID", "Time", "Notes", "Source"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border/30 hover:bg-muted/20" data-testid={`report-row-${e.id}`}>
                    <td className="px-4 py-2 text-xs">{e.date}</td>
                    <td className="px-4 py-2 text-xs">{e.taskId ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{e.projectId ?? "—"}</td>
                    <td className="px-4 py-2 text-xs font-mono">{Math.floor(e.minutes / 60)}h {e.minutes % 60}m</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-xs truncate">{e.notes ?? "—"}</td>
                    <td className="px-4 py-2 text-xs capitalize">{e.source}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No entries for this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
