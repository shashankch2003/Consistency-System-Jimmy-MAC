import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type MemberStat = { userId: string; name: string; activeTasks: number; overdueTasks: number; focusMinutes: number; meetingMinutes: number; workloadScore: string };

const WORKLOAD_CONFIG: Record<string, { color: string; label: string }> = {
  green: { color: "text-green-400 bg-green-500/20", label: "Healthy" },
  yellow: { color: "text-yellow-400 bg-yellow-500/20", label: "Busy" },
  red: { color: "text-red-400 bg-red-500/20", label: "Overloaded" },
};

export default function TeamInsightsPage() {
  const { toast } = useToast();
  const [workspaceId, setWorkspaceId] = useState("1");
  const [insights, setInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);

  const { data: workloadData, isLoading, refetch } = useQuery<{ members: MemberStat[] }>({
    queryKey: ["/api/team-insights/workload", workspaceId],
    queryFn: () => fetch(`/api/team-insights/workload?workspaceId=${workspaceId}`).then(r => r.json()),
    enabled: !!workspaceId,
  });

  const getInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await apiRequest("POST", "/api/team-insights/insights", { workspaceId: Number(workspaceId) });
      const data = await res.json();
      setInsights(data.insights || "");
    } catch { toast({ title: "Failed to get insights", variant: "destructive" }); }
    finally { setLoadingInsights(false); }
  };

  const members = workloadData?.members || [];
  const maxTasks = Math.max(...members.map(m => m.activeTasks), 1);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-teal-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Team Insights</h1>
            <p className="text-sm text-gray-400">AI-powered team workload and collaboration analysis</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Workspace ID:</label>
            <Input value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} className="w-20 h-8 bg-gray-800 border-gray-700 text-white text-sm" data-testid="input-workspace-id" />
            <Button size="sm" onClick={() => refetch()} variant="outline" className="border-gray-700 text-gray-400 h-8" data-testid="button-load">Load</Button>
          </div>
          <Button onClick={getInsights} disabled={loadingInsights} className="bg-teal-600 hover:bg-teal-700" data-testid="button-get-insights">
            <Sparkles className="w-4 h-4 mr-2" />{loadingInsights ? "Analyzing..." : "AI Insights"}
          </Button>
        </div>
      </div>

      {insights && (
        <Card className="bg-teal-900/20 border-teal-700/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-teal-400 font-medium mb-1">AI Team Analysis</p>
                <p className="text-sm text-gray-200 whitespace-pre-wrap" data-testid="text-insights">{insights}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800"><CardContent className="pt-4"><p className="text-gray-400 text-sm">Team Size</p><p className="text-2xl font-bold text-white" data-testid="text-team-size">{members.length}</p></CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardContent className="pt-4"><p className="text-gray-400 text-sm">Overloaded</p><p className="text-2xl font-bold text-red-400" data-testid="text-overloaded">{members.filter(m => m.workloadScore === "red").length}</p></CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardContent className="pt-4"><p className="text-gray-400 text-sm">Healthy Workload</p><p className="text-2xl font-bold text-green-400" data-testid="text-healthy">{members.filter(m => m.workloadScore === "green").length}</p></CardContent></Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal-400" />Team Workload</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded bg-gray-800/50 animate-pulse" />)}</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center"><Users className="w-10 h-10 text-gray-600 mx-auto mb-2" /><p className="text-gray-400">No team members found for this workspace.</p></div>
          ) : (
            <div className="space-y-4">
              {members.map(m => {
                const wl = WORKLOAD_CONFIG[m.workloadScore] || WORKLOAD_CONFIG.green;
                return (
                  <div key={m.userId} className="bg-gray-800/50 rounded-lg p-4" data-testid={`card-member-${m.userId}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-600/20 flex items-center justify-center">
                          <span className="text-teal-400 font-medium text-sm">{m.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.activeTasks} active tasks</p>
                        </div>
                      </div>
                      <Badge className={wl.color} data-testid={`badge-workload-${m.userId}`}>{m.workloadScore === "red" ? <AlertTriangle className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}{wl.label}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Task Load</span><span>{m.activeTasks} tasks</span></div>
                        <Progress value={(m.activeTasks / maxTasks) * 100} className="h-1.5 bg-gray-700" />
                      </div>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>🎯 Focus: {m.focusMinutes}min</span>
                        <span>📅 Meetings: {m.meetingMinutes}min</span>
                        {m.overdueTasks > 0 && <span className="text-red-400">⚠️ {m.overdueTasks} overdue</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
