import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, Plus, TrendingUp, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TimeEntry = { id: number; description?: string; durationMinutes?: number; minutes: number; date: string; taskId?: number };

export default function TimeTrackingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0],
    endDate: today.toISOString().split("T")[0],
  });
  const [entryForm, setEntryForm] = useState({ description: "", durationMinutes: 30, startedAt: new Date().toISOString().slice(0, 16) });

  const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-tracking/entries", dateRange.startDate, dateRange.endDate],
    queryFn: () => fetch(`/api/time-tracking/entries?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`).then(r => r.json()),
  });

  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/time-tracking/analytics", dateRange.startDate, dateRange.endDate],
    queryFn: () => fetch(`/api/time-tracking/analytics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`).then(r => r.json()),
  });

  const { data: accuracy } = useQuery<any>({
    queryKey: ["/api/time-tracking/estimation-accuracy"],
    queryFn: () => fetch("/api/time-tracking/estimation-accuracy").then(r => r.json()),
  });

  const logEntry = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/time-tracking/entries", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/time-tracking/entries"] }); qc.invalidateQueries({ queryKey: ["/api/time-tracking/analytics"] }); setAddOpen(false); toast({ title: "Time logged" }); }
  });

  const byDayChartData = analytics?.byDay ? Object.entries(analytics.byDay).map(([date, minutes]: any) => ({ date: date.slice(5), hours: Math.round(minutes / 60 * 10) / 10 })) : [];
  const byTaskData = analytics?.byTask?.slice(0, 6) || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-7 h-7 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Time Tracking</h1>
            <p className="text-sm text-gray-400">Log and analyze your time with AI insights</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex gap-2">
            <Input type="date" value={dateRange.startDate} onChange={e => setDateRange(d => ({ ...d, startDate: e.target.value }))} className="bg-gray-800 border-gray-700 text-white w-36" data-testid="input-start-date" />
            <span className="text-gray-400 self-center">to</span>
            <Input type="date" value={dateRange.endDate} onChange={e => setDateRange(d => ({ ...d, endDate: e.target.value }))} className="bg-gray-800 border-gray-700 text-white w-36" data-testid="input-end-date" />
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700" data-testid="button-log-time"><Plus className="w-4 h-4 mr-2" />Log Time</Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader><DialogTitle>Log Time Entry</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="What did you work on?" value={entryForm.description} onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-description" />
                <div><label className="text-xs text-gray-400 mb-1 block">Duration (minutes)</label>
                  <Input type="number" value={entryForm.durationMinutes} onChange={e => setEntryForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} className="bg-gray-800 border-gray-700" data-testid="input-duration" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Started At</label>
                  <Input type="datetime-local" value={entryForm.startedAt} onChange={e => setEntryForm(f => ({ ...f, startedAt: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-started-at" /></div>
                <Button onClick={() => logEntry.mutate({ description: entryForm.description, durationMinutes: entryForm.durationMinutes, startedAt: new Date(entryForm.startedAt).toISOString() })} disabled={!entryForm.description || logEntry.isPending} className="w-full bg-green-600 hover:bg-green-700" data-testid="button-submit-entry">{logEntry.isPending ? "Saving..." : "Log Time"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800"><CardContent className="pt-6"><p className="text-gray-400 text-sm">Total Time</p><p className="text-2xl font-bold text-white mt-1" data-testid="text-total-hours">{analytics ? Math.round((analytics.totalMinutes || 0) / 60 * 10) / 10 : 0}h</p></CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardContent className="pt-6"><p className="text-gray-400 text-sm">Entries</p><p className="text-2xl font-bold text-white mt-1" data-testid="text-entry-count">{analytics?.entryCount || 0}</p></CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardContent className="pt-6"><p className="text-gray-400 text-sm">Estimation Accuracy</p><p className="text-2xl font-bold text-white mt-1" data-testid="text-accuracy">{accuracy ? `${100 - (accuracy.averageErrorPercent || 0)}%` : "N/A"}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><BarChart2 className="w-4 h-4 text-green-400" />Daily Breakdown</CardTitle></CardHeader>
          <CardContent>
            {byDayChartData.length === 0 ? <p className="text-gray-500 text-sm">No data for this period.</p> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byDayChartData}>
                  <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", color: "#fff" }} />
                  <Bar dataKey="hours" fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" />By Task</CardTitle></CardHeader>
          <CardContent>
            {byTaskData.length === 0 ? <p className="text-gray-500 text-sm">No task data yet.</p> : (
              <div className="space-y-2">
                {byTaskData.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between" data-testid={`row-task-${i}`}>
                    <span className="text-sm text-gray-300 flex-1 truncate">{t.title}</span>
                    <span className="text-sm text-white ml-2">{Math.round(t.minutes / 60 * 10) / 10}h</span>
                    <div className="w-24 ml-3 bg-gray-700 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (t.minutes / (byTaskData[0]?.minutes || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Clock className="w-4 h-4 text-green-400" />Recent Entries</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded bg-gray-800/50 animate-pulse" />)}</div>
            : entries.length === 0 ? <p className="text-gray-500 text-sm">No entries for this period. Log your first time entry.</p>
            : (
              <div className="space-y-2">
                {entries.slice(0, 10).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3" data-testid={`row-entry-${entry.id}`}>
                    <div>
                      <p className="text-sm text-white">{entry.description || "Time entry"}</p>
                      <p className="text-xs text-gray-400">{entry.date}</p>
                    </div>
                    <span className="text-sm font-medium text-green-400">{entry.durationMinutes || entry.minutes}min</span>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
