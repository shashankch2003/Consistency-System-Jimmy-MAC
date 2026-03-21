import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ScoreCircle from "./ScoreCircle";
import InsightCard from "./InsightCard";
import type { EmployeeDashboardData, DailySnapshotData } from "@shared/lib/team-intelligence/types";

interface EmployeeDetailPanelProps {
  workspaceId?: string;
  employeeUserId: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EmployeeDetailPanel({ workspaceId = "default", employeeUserId, isOpen, onClose }: EmployeeDetailPanelProps) {
  const { data, isLoading } = useQuery<EmployeeDashboardData>({
    queryKey: [`/api/team-intelligence/employee/${employeeUserId}?workspaceId=${workspaceId}`],
    enabled: isOpen && !!employeeUserId,
  });

  const latest = data?.todaySnapshot || (data?.recentSnapshots?.[0] as DailySnapshotData | undefined);
  const last7 = (data?.recentSnapshots || []).slice(0, 7).reverse();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="bg-zinc-950 border-zinc-800 w-full sm:max-w-lg overflow-y-auto" data-testid="panel-employee-detail">
        <SheetHeader>
          <SheetTitle className="text-white">Employee Detail</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-32 w-full bg-zinc-800" />
            <Skeleton className="h-24 w-full bg-zinc-800" />
            <Skeleton className="h-48 w-full bg-zinc-800" />
          </div>
        ) : !data || !latest ? (
          <div className="mt-8 text-center text-zinc-500 text-sm">No data available for this employee.</div>
        ) : (
          <div className="space-y-5 mt-4">
            <div className="flex justify-center">
              <ScoreCircle score={data.currentScores.total} label="Productivity" trend={data.recentSnapshots.length >= 2 ? (data.currentScores.total > (data.recentSnapshots[1]?.productivityScore ?? 0) ? "up" : data.currentScores.total < (data.recentSnapshots[1]?.productivityScore ?? 0) ? "down" : "stable") : "stable"} size="lg" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-3">
                  <p className="text-xs text-zinc-500">Focus Time</p>
                  <p className="text-lg font-bold text-white">{Math.round(latest.deepWorkMinutes / 60 * 10) / 10}h</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-3">
                  <p className="text-xs text-zinc-500">Tasks Completed</p>
                  <p className="text-lg font-bold text-white">{latest.tasksCompleted}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-3">
                  <p className="text-xs text-zinc-500">Overdue</p>
                  <p className={`text-lg font-bold ${latest.tasksOverdue > 0 ? "text-red-400" : "text-white"}`}>{latest.tasksOverdue}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-3">
                  <p className="text-xs text-zinc-500">Streak</p>
                  <p className="text-lg font-bold text-white">{data.streak} days</p>
                </CardContent>
              </Card>
            </div>

            {last7.length > 1 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Trend — Last 7 Days</p>
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-3">
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={last7}>
                        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip contentStyle={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8 }} labelFormatter={formatDate} />
                        <Line type="monotone" dataKey="productivityScore" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {data.insights && data.insights.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Recent Insights</p>
                <div className="space-y-2">
                  {data.insights.slice(0, 3).map((ins, idx) => (
                    <InsightCard
                      key={idx}
                      category={ins.category}
                      title={ins.title}
                      message={ins.message}
                      confidence={ins.confidence}
                      timestamp=""
                      isRead={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
