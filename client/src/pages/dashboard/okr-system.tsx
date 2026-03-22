import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, ChevronDown, ChevronRight, Sparkles, AlertTriangle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type KeyResult = { id: number; title: string; metricType: string; targetValue: number; currentValue: number; progressPercent: number; unit?: string };
type Goal = { id: number; title: string; description?: string; level: string; progressPercent: number; status: string; aiRiskAssessment?: string; keyResults: KeyResult[]; parentGoalId?: number };

const STATUS_COLORS: Record<string, string> = { on_track: "bg-green-500/20 text-green-400", at_risk: "bg-yellow-500/20 text-yellow-400", behind: "bg-red-500/20 text-red-400", completed: "bg-blue-500/20 text-blue-400" };
const LEVEL_COLORS: Record<string, string> = { company: "bg-purple-500/20 text-purple-400", team: "bg-blue-500/20 text-blue-400", individual: "bg-cyan-500/20 text-cyan-400" };

export default function OkrSystemPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [addKRGoalId, setAddKRGoalId] = useState<number | null>(null);
  const [filterLevel, setFilterLevel] = useState("all");
  const [aiSuggestions, setAiSuggestions] = useState<{ goalId: number; suggestions: any[] } | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<{ goalId: number; text: string } | null>(null);
  const [goalForm, setGoalForm] = useState({ title: "", description: "", level: "individual", startDate: new Date().toISOString().split("T")[0], targetDate: "" });
  const [krForm, setKrForm] = useState({ title: "", metricType: "number", targetValue: "", unit: "" });

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    queryFn: () => fetch(`/api/goals${filterLevel !== "all" ? `?level=${filterLevel}` : ""}`).then(r => r.json())
  });

  const createGoal = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/goals", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/goals"] }); setAddGoalOpen(false); toast({ title: "Goal created" }); } });
  const createKR = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/goals/key-results", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/goals"] }); setAddKRGoalId(null); toast({ title: "Key result added" }); } });
  const updateProgress = useMutation({ mutationFn: ({ id, currentValue }: any) => apiRequest("PATCH", `/api/goals/key-results/${id}/progress`, { currentValue }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/goals"] }) });

  const suggestKRs = async (goal: Goal) => {
    try {
      const res = await apiRequest("POST", "/api/goals/suggest-key-results", { goalTitle: goal.title, goalDescription: goal.description });
      const data = await res.json();
      setAiSuggestions({ goalId: goal.id, suggestions: data.keyResults || [] });
    } catch { toast({ title: "Failed to get suggestions", variant: "destructive" }); }
  };

  const assessRisk = async (goalId: number) => {
    try {
      const res = await apiRequest("POST", `/api/goals/${goalId}/assess-risk`, {});
      const data = await res.json();
      setRiskAssessment({ goalId, text: data.assessment });
    } catch { toast({ title: "Failed to assess risk", variant: "destructive" }); }
  };

  const toggleExpand = (id: number) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const topGoals = goals.filter(g => !g.parentGoalId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-7 h-7 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">OKR System</h1>
            <p className="text-sm text-gray-400">Objectives & Key Results with AI insights</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Select value={filterLevel} onValueChange={v => { setFilterLevel(v); qc.invalidateQueries({ queryKey: ["/api/goals"] }); }}>
            <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-white" data-testid="select-level-filter"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-add-goal"><Plus className="w-4 h-4 mr-2" />Add Goal</Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader><DialogTitle>Create New Goal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Goal title" value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-goal-title" />
                <Textarea placeholder="Description (optional)" value={goalForm.description} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} className="bg-gray-800 border-gray-700" />
                <Select value={goalForm.level} onValueChange={v => setGoalForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-goal-level"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-400 mb-1 block">Start Date</label><Input type="date" value={goalForm.startDate} onChange={e => setGoalForm(f => ({ ...f, startDate: e.target.value }))} className="bg-gray-800 border-gray-700" /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">Target Date</label><Input type="date" value={goalForm.targetDate} onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))} className="bg-gray-800 border-gray-700" /></div>
                </div>
                <Button onClick={() => createGoal.mutate(goalForm)} disabled={!goalForm.title || !goalForm.targetDate || createGoal.isPending} className="w-full bg-purple-600 hover:bg-purple-700" data-testid="button-submit-goal">{createGoal.isPending ? "Creating..." : "Create Goal"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-gray-800/50 animate-pulse" />)}</div>
      ) : topGoals.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800"><CardContent className="py-12 text-center"><Target className="w-12 h-12 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">No OKRs yet. Create your first goal to get started.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {topGoals.map(goal => (
            <Card key={goal.id} className="bg-gray-900 border-gray-800" data-testid={`card-goal-${goal.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <button onClick={() => toggleExpand(goal.id)} className="mt-1 text-gray-400 hover:text-white" data-testid={`button-expand-${goal.id}`}>
                      {expanded.has(goal.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-white text-base">{goal.title}</CardTitle>
                        <Badge className={LEVEL_COLORS[goal.level] || "bg-gray-700 text-gray-300"}>{goal.level}</Badge>
                        <Badge className={STATUS_COLORS[goal.status] || "bg-gray-700 text-gray-300"}>{goal.status?.replace("_", " ")}</Badge>
                      </div>
                      {goal.description && <p className="text-sm text-gray-400 mt-1">{goal.description}</p>}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs text-gray-400"><span>Progress</span><span data-testid={`text-progress-${goal.id}`}>{Math.round(goal.progressPercent || 0)}%</span></div>
                        <Progress value={goal.progressPercent || 0} className="h-2 bg-gray-700" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <Button size="sm" variant="ghost" onClick={() => suggestKRs(goal)} className="text-purple-400 hover:bg-purple-900/20 text-xs" data-testid={`button-suggest-${goal.id}`}><Sparkles className="w-3 h-3 mr-1" />Suggest KRs</Button>
                    <Button size="sm" variant="ghost" onClick={() => assessRisk(goal.id)} className="text-yellow-400 hover:bg-yellow-900/20 text-xs" data-testid={`button-risk-${goal.id}`}><AlertTriangle className="w-3 h-3 mr-1" />Risk</Button>
                  </div>
                </div>
              </CardHeader>
              {expanded.has(goal.id) && (
                <CardContent className="pt-0 space-y-3">
                  {goal.keyResults.map(kr => (
                    <div key={kr.id} className="ml-7 bg-gray-800/50 rounded-lg p-3" data-testid={`card-kr-${kr.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">{kr.title}</span>
                        <span className="text-xs text-gray-400">{kr.currentValue} / {kr.targetValue}{kr.unit ? ` ${kr.unit}` : ""}</span>
                      </div>
                      <Progress value={kr.progressPercent || 0} className="h-1.5 bg-gray-700 mb-2" />
                      <div className="flex gap-2 items-center">
                        <Input type="number" placeholder="New value" className="h-7 text-xs bg-gray-700 border-gray-600 flex-1" data-testid={`input-kr-value-${kr.id}`}
                          onKeyDown={e => { if (e.key === "Enter") { const v = parseFloat((e.target as HTMLInputElement).value); if (!isNaN(v)) updateProgress.mutate({ id: kr.id, currentValue: v }); } }} />
                        <span className="text-xs text-gray-500">Enter to update</span>
                      </div>
                    </div>
                  ))}
                  {addKRGoalId === goal.id ? (
                    <div className="ml-7 bg-gray-800 rounded-lg p-3 space-y-3">
                      <Input placeholder="Key result title" value={krForm.title} onChange={e => setKrForm(f => ({ ...f, title: e.target.value }))} className="bg-gray-700 border-gray-600 text-sm" data-testid="input-kr-title" />
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={krForm.metricType} onValueChange={v => setKrForm(f => ({ ...f, metricType: v }))}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700"><SelectItem value="number">Number</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="currency">Currency</SelectItem><SelectItem value="boolean">Boolean</SelectItem></SelectContent>
                        </Select>
                        <Input placeholder="Target" type="number" value={krForm.targetValue} onChange={e => setKrForm(f => ({ ...f, targetValue: e.target.value }))} className="bg-gray-700 border-gray-600 text-sm" data-testid="input-kr-target" />
                        <Input placeholder="Unit" value={krForm.unit} onChange={e => setKrForm(f => ({ ...f, unit: e.target.value }))} className="bg-gray-700 border-gray-600 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => createKR.mutate({ goalId: goal.id, title: krForm.title, metricType: krForm.metricType, targetValue: parseFloat(krForm.targetValue) || 0, unit: krForm.unit || undefined })} disabled={!krForm.title || createKR.isPending} className="bg-purple-600 hover:bg-purple-700" data-testid="button-save-kr">{createKR.isPending ? "Saving..." : "Save"}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddKRGoalId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setAddKRGoalId(goal.id)} className="ml-7 text-purple-400 hover:bg-purple-900/20 text-xs" data-testid={`button-add-kr-${goal.id}`}><Plus className="w-3 h-3 mr-1" />Add Key Result</Button>
                  )}
                  {aiSuggestions?.goalId === goal.id && (
                    <div className="ml-7 bg-purple-900/20 border border-purple-700/30 rounded-lg p-3">
                      <p className="text-xs text-purple-400 font-medium mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" />AI Suggested Key Results</p>
                      {aiSuggestions.suggestions.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1">
                          <span className="text-gray-300">{s.title}</span>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500">Target: {s.targetValue} {s.unit}</span>
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-purple-400" onClick={() => createKR.mutate({ goalId: goal.id, title: s.title, metricType: s.metricType, targetValue: s.targetValue, unit: s.unit })}>Add</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {riskAssessment?.goalId === goal.id && (
                    <div className="ml-7 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
                      <p className="text-xs text-yellow-400 font-medium mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Risk Assessment</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{riskAssessment.text}</p>
                    </div>
                  )}
                  {goals.filter(g => g.parentGoalId === goal.id).map(child => (
                    <div key={child.id} className="ml-7 border-l-2 border-gray-700 pl-4 py-1 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-cyan-400" />
                      <span className="text-sm text-white">{child.title}</span>
                      <Badge className={LEVEL_COLORS[child.level]}>{child.level}</Badge>
                      <span className="text-xs text-gray-400">{Math.round(child.progressPercent || 0)}%</span>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
