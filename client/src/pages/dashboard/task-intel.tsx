import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Brain, ChevronRight, ChevronDown, Loader2, Zap, Clock, Users, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-900/40 text-red-300 border-red-700",
  high: "bg-orange-900/40 text-orange-300 border-orange-700",
  medium: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  low: "bg-blue-900/40 text-blue-300 border-blue-700",
};

export default function TaskIntelPage() {
  const { toast } = useToast();
  const [breakdownTitle, setBreakdownTitle] = useState("");
  const [breakdownDesc, setBreakdownDesc] = useState("");
  const [complexity, setComplexity] = useState("medium");
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [nlText, setNlText] = useState("");
  const [parsedTask, setParsedTask] = useState<any>(null);
  const [priorityResult, setPriorityResult] = useState<any[]>([]);
  const [estimateTaskId, setEstimateTaskId] = useState("");
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [assigneeTaskId, setAssigneeTaskId] = useState("");
  const [assigneeSuggestions, setAssigneeSuggestions] = useState<any[]>([]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<number, boolean>>({});

  const breakdownMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/task-intelligence/breakdown", data),
    onSuccess: (data: any) => { setSubtasks(data.subtasks || []); },
    onError: () => toast({ title: "Breakdown failed", variant: "destructive" }),
  });

  const nlMutation = useMutation({
    mutationFn: (text: string) => apiRequest("POST", "/api/task-intelligence/parse-natural-language", { text }),
    onSuccess: (data: any) => setParsedTask(data),
    onError: () => toast({ title: "Parse failed", variant: "destructive" }),
  });

  const prioritizeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/task-intelligence/prioritize", {}),
    onSuccess: (data: any) => setPriorityResult(data.ranked || []),
    onError: () => toast({ title: "Prioritization failed", variant: "destructive" }),
  });

  const estimateMutation = useMutation({
    mutationFn: (taskId: number) => apiRequest("POST", "/api/task-intelligence/estimate-duration", { taskId }),
    onSuccess: (data: any) => setEstimateResult(data),
    onError: () => toast({ title: "Estimation failed", variant: "destructive" }),
  });

  const assigneeMutation = useMutation({
    mutationFn: (taskId: number) => apiRequest("POST", "/api/task-intelligence/suggest-assignee", { taskId }),
    onSuccess: (data: any) => setAssigneeSuggestions(data.suggestions || []),
    onError: () => toast({ title: "Suggestion failed", variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Brain className="w-6 h-6 text-violet-400" />AI Task Intelligence</h1>
        <p className="text-gray-400 mt-1">Break down, prioritize, estimate, and assign tasks with AI</p>
      </div>

      <Tabs defaultValue="breakdown">
        <TabsList className="bg-gray-800 border-gray-700 mb-6">
          <TabsTrigger value="breakdown" data-testid="tab-breakdown">Break Down</TabsTrigger>
          <TabsTrigger value="nl" data-testid="tab-nl">Natural Language</TabsTrigger>
          <TabsTrigger value="prioritize" data-testid="tab-prioritize">AI Prioritize</TabsTrigger>
          <TabsTrigger value="estimate" data-testid="tab-estimate">Estimate Duration</TabsTrigger>
          <TabsTrigger value="assignee" data-testid="tab-assignee">Suggest Assignee</TabsTrigger>
        </TabsList>

        {/* BREAK DOWN */}
        <TabsContent value="breakdown">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">AI Task Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-gray-300">Task Title *</Label>
                  <Input value={breakdownTitle} onChange={e => setBreakdownTitle(e.target.value)} placeholder="e.g. Build authentication system" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-breakdown-title" />
                </div>
                <div>
                  <Label className="text-gray-300">Complexity</Label>
                  <Select value={complexity} onValueChange={setComplexity}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 mt-1" data-testid="select-complexity"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="simple">Simple (3-5 steps)</SelectItem>
                      <SelectItem value="medium">Medium (5-8 steps)</SelectItem>
                      <SelectItem value="detailed">Detailed (8-12 steps)</SelectItem>
                      <SelectItem value="very_detailed">Very Detailed (12-20 steps)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mb-4">
                <Label className="text-gray-300">Description (optional)</Label>
                <Input value={breakdownDesc} onChange={e => setBreakdownDesc(e.target.value)} placeholder="More details about the task..." className="bg-gray-800 border-gray-700 mt-1" data-testid="input-breakdown-desc" />
              </div>
              <Button onClick={() => breakdownMutation.mutate({ taskTitle: breakdownTitle, taskDescription: breakdownDesc, complexity })} disabled={!breakdownTitle || breakdownMutation.isPending} data-testid="button-breakdown">
                {breakdownMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}Break Down Task
              </Button>

              {subtasks.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-300 mb-3">Generated Subtasks ({subtasks.length})</p>
                  <div className="space-y-2">
                    {subtasks.map((st, i) => (
                      <div key={i} data-testid={`subtask-${i}`}>
                        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3 cursor-pointer" onClick={() => st.subtasks?.length && setExpandedSubtasks(s => ({ ...s, [i]: !s[i] }))}>
                          <span className="w-6 h-6 rounded-full bg-violet-900/40 text-violet-300 text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <span className="text-sm text-gray-200 flex-1">{st.title}</span>
                          {st.subtasks?.length > 0 && (expandedSubtasks[i] ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />)}
                        </div>
                        {expandedSubtasks[i] && st.subtasks && (
                          <div className="ml-6 mt-1 space-y-1">
                            {st.subtasks.map((sub: any, j: number) => (
                              <div key={j} className="flex items-center gap-2 bg-gray-800/50 rounded p-2" data-testid={`subtask-${i}-${j}`}>
                                <span className="text-xs text-gray-500">→</span>
                                <span className="text-sm text-gray-300">{sub.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NATURAL LANGUAGE */}
        <TabsContent value="nl">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Natural Language Task Parser</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Input value={nlText} onChange={e => setNlText(e.target.value)} placeholder='Try: "Review PR tomorrow high priority" or "Write quarterly report by Friday"' className="bg-gray-800 border-gray-700 flex-1" onKeyDown={e => e.key === "Enter" && nlText && nlMutation.mutate(nlText)} data-testid="input-nl-text" />
                <Button onClick={() => nlMutation.mutate(nlText)} disabled={!nlText || nlMutation.isPending} data-testid="button-parse-nl">
                  {nlMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
              </div>
              {parsedTask && (
                <div className="bg-gray-800 rounded-lg p-4" data-testid="parsed-task-result">
                  <p className="text-sm font-medium text-gray-300 mb-3">Parsed Task:</p>
                  <div className="space-y-2">
                    {Object.entries(parsedTask).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24 capitalize">{key}:</span>
                        <span className="text-sm text-white" data-testid={`parsed-${key}`}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRIORITIZE */}
        <TabsContent value="prioritize">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">AI Task Prioritization</CardTitle>
                <Button onClick={() => prioritizeMutation.mutate()} disabled={prioritizeMutation.isPending} data-testid="button-prioritize">
                  {prioritizeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}AI Prioritize All Tasks
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {priorityResult.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>Click "AI Prioritize" to rank all your active tasks by urgency and impact.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {priorityResult.map((item: any, i: number) => (
                    <div key={i} className={`flex items-start gap-3 border rounded-lg p-3 ${PRIORITY_COLORS[item.suggestedPriority] || PRIORITY_COLORS.medium}`} data-testid={`priority-item-${i}`}>
                      <span className="text-lg font-bold w-6">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="text-xs capitalize" variant="outline">{item.suggestedPriority}</Badge>
                          <span className="text-xs text-gray-400">Task #{item.taskId}</span>
                        </div>
                        <p className="text-sm">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESTIMATE */}
        <TabsContent value="estimate">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Duration Estimator</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-6">
                <Input value={estimateTaskId} onChange={e => setEstimateTaskId(e.target.value)} placeholder="Task ID" type="number" className="bg-gray-800 border-gray-700 w-40" data-testid="input-estimate-task-id" />
                <Button onClick={() => estimateMutation.mutate(parseInt(estimateTaskId))} disabled={!estimateTaskId || estimateMutation.isPending} data-testid="button-estimate">
                  {estimateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}Estimate Duration
                </Button>
              </div>
              {estimateResult && (
                <div className="grid grid-cols-3 gap-4" data-testid="estimate-result">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-violet-400">{estimateResult.estimatedMinutes}</p>
                    <p className="text-xs text-gray-400 mt-1">minutes</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{Math.round(estimateResult.confidence * 100)}%</p>
                    <p className="text-xs text-gray-400 mt-1">confidence</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 col-span-1">
                    <p className="text-xs text-gray-400">Reasoning:</p>
                    <p className="text-sm text-gray-200 mt-1">{estimateResult.reasoning}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSIGNEE */}
        <TabsContent value="assignee">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Assignee Suggester</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-6">
                <Input value={assigneeTaskId} onChange={e => setAssigneeTaskId(e.target.value)} placeholder="Task ID" type="number" className="bg-gray-800 border-gray-700 w-40" data-testid="input-assignee-task-id" />
                <Button onClick={() => assigneeMutation.mutate(parseInt(assigneeTaskId))} disabled={!assigneeTaskId || assigneeMutation.isPending} data-testid="button-suggest-assignee">
                  {assigneeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}Suggest Assignee
                </Button>
              </div>
              {assigneeSuggestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-300">Top 3 Recommendations:</p>
                  {assigneeSuggestions.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 bg-gray-800 rounded-lg p-4" data-testid={`assignee-suggestion-${i}`}>
                      <div className="w-10 h-10 rounded-full bg-violet-900/40 flex items-center justify-center text-violet-300 font-bold flex-shrink-0">
                        {(s.name || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{s.name || "Unknown"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">{s.score}</p>
                        <p className="text-xs text-gray-400">score</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
