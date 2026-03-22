import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Command, Target, Bell, Clock, Sparkles, CheckCircle, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CommandCenterPage() {
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const { data: dashboard, isLoading } = useQuery<any>({
    queryKey: ["/api/command-center/dashboard"],
  });

  const getSuggestion = async () => {
    setLoadingSuggestion(true);
    try {
      const res = await apiRequest("POST", "/api/command-center/ai-suggestion", {});
      const data = await res.json();
      setSuggestion(data.suggestion || "");
    } catch { toast({ title: "Failed to get suggestion", variant: "destructive" }); }
    finally { setLoadingSuggestion(false); }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-800/50 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-gray-800/50 animate-pulse" />)}</div>
      </div>
    );
  }

  const d = dashboard || {};
  const urgentNotifs = d.notifications?.urgentCount || 0;
  const importantNotifs = d.notifications?.importantCount || 0;
  const habits = d.habits || [];
  const completedHabits = habits.filter((h: any) => h.completedToday).length;
  const goals = d.goals || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Command className="w-7 h-7 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Command Center</h1>
            <p className="text-sm text-gray-400">Your AI-powered personal dashboard</p>
          </div>
        </div>
        <Button onClick={getSuggestion} disabled={loadingSuggestion} className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-get-suggestion">
          <Sparkles className="w-4 h-4 mr-2" />{loadingSuggestion ? "Thinking..." : "AI Next Action"}
        </Button>
      </div>

      {suggestion && (
        <Card className="bg-indigo-900/20 border-indigo-700/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-indigo-400 font-medium mb-1">AI Suggestion</p>
                <p className="text-sm text-gray-200" data-testid="text-suggestion">{suggestion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2"><Bell className="w-4 h-4 text-yellow-400" /><span className="text-gray-400 text-sm">Notifications</span></div>
            <div className="flex gap-2">
              {urgentNotifs > 0 && <Badge className="bg-red-500/20 text-red-400" data-testid="badge-urgent-count">{urgentNotifs} urgent</Badge>}
              {importantNotifs > 0 && <Badge className="bg-yellow-500/20 text-yellow-400" data-testid="badge-important-count">{importantNotifs} important</Badge>}
              {urgentNotifs === 0 && importantNotifs === 0 && <span className="text-green-400 text-sm">All clear</span>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-gray-400 text-sm">Today's Habits</span></div>
            <p className="text-2xl font-bold text-white" data-testid="text-habits">{completedHabits}/{habits.length}</p>
            <Progress value={habits.length > 0 ? (completedHabits / habits.length) * 100 : 0} className="mt-2 h-1.5 bg-gray-700" />
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-purple-400" /><span className="text-gray-400 text-sm">Active Goals</span></div>
            <p className="text-2xl font-bold text-white" data-testid="text-goals">{goals.length}</p>
            <p className="text-xs text-gray-400 mt-1">{goals.filter((g: any) => g.status === "on_track").length} on track</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-blue-400" /><span className="text-gray-400 text-sm">Today's Score</span></div>
            <p className="text-2xl font-bold text-white" data-testid="text-score">{d.productivityScore?.overallScore ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-1">Productivity rating</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {d.dailyPlan && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" />Today's Plan</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Blocks completed</span>
                <span className="text-white" data-testid="text-blocks">{d.dailyPlan.completedCount}/{d.dailyPlan.blocksCount}</span>
              </div>
              <Progress value={d.dailyPlan.blocksCount > 0 ? (d.dailyPlan.completedCount / d.dailyPlan.blocksCount) * 100 : 0} className="h-2 bg-gray-700" />
              {d.dailyPlan.nextBlock && (
                <div className="bg-blue-900/20 rounded p-2 mt-2">
                  <p className="text-xs text-blue-400">Next: {d.dailyPlan.nextBlock.title} at {d.dailyPlan.nextBlock.startTime}</p>
                </div>
              )}
              {d.dailyPlan.summary && <p className="text-xs text-gray-400 mt-2">{d.dailyPlan.summary}</p>}
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />Habit Tracker</CardTitle></CardHeader>
          <CardContent>
            {habits.length === 0 ? <p className="text-gray-500 text-sm">No habits set up.</p> : (
              <div className="space-y-2">
                {habits.map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between" data-testid={`row-habit-${h.id}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{h.icon || "📌"}</span>
                      <span className="text-sm text-white">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">🔥 {h.streak}</span>
                      {h.completedToday ? <CheckCircle className="w-4 h-4 text-green-400" /> : <div className="w-4 h-4 rounded-full border border-gray-600" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Target className="w-4 h-4 text-purple-400" />Active Goals</CardTitle></CardHeader>
        <CardContent>
          {goals.length === 0 ? <p className="text-gray-500 text-sm">No goals yet.</p> : (
            <div className="space-y-3">
              {goals.map((g: any) => (
                <div key={g.id} data-testid={`row-goal-${g.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">{g.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{Math.round(g.progress || 0)}%</span>
                      <Badge className={g.status === "on_track" ? "bg-green-500/20 text-green-400" : g.status === "at_risk" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}>{g.status?.replace("_", " ")}</Badge>
                    </div>
                  </div>
                  <Progress value={g.progress || 0} className="h-1.5 bg-gray-700" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
