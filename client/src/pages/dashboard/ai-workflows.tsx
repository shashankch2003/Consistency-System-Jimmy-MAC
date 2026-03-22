import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Workflow, Play, Plus, Trash2, CircleDot, Square, CheckCircle, XCircle, Loader2, History, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACTION_TYPES = [
  { value: "create_task", label: "Create Task" },
  { value: "update_task", label: "Update Task" },
  { value: "create_page", label: "Create Note/Page" },
  { value: "send_message", label: "Send Message" },
];

export default function AiWorkflowsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showRecorder, setShowRecorder] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedSteps, setRecordedSteps] = useState<any[]>([]);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDesc, setWorkflowDesc] = useState("");
  const [selectedAction, setSelectedAction] = useState("create_task");
  const [actionData, setActionData] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showExecute, setShowExecute] = useState(false);
  const [runResults, setRunResults] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const { data: workflows = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/ai-workflows"] });

  const saveRecording = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ai-workflows/save-recording", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-workflows"] });
      setShowRecorder(false);
      setRecordedSteps([]);
      setWorkflowName("");
      toast({ title: "Workflow saved with detected variables" });
    },
    onError: () => toast({ title: "Failed to save workflow", variant: "destructive" }),
  });

  const executeWorkflow = useMutation({
    mutationFn: ({ id, vars }: { id: number; vars: any }) => apiRequest("POST", `/api/ai-workflows/${id}/execute`, { variableValues: vars }),
    onSuccess: (data: any) => {
      setRunResults(data.steps || []);
      toast({ title: `Workflow executed — ${data.steps?.filter((s: any) => s.status === "success").length || 0} steps succeeded` });
    },
    onError: () => toast({ title: "Execution failed", variant: "destructive" }),
  });

  const deleteWorkflow = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ai-workflows/${id}`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ai-workflows"] }); setSelectedWorkflow(null); toast({ title: "Workflow deleted" }); },
  });

  const { data: runHistory = [] } = useQuery<any[]>({
    queryKey: [`/api/ai-workflows/${selectedWorkflow?.id}/runs`],
    enabled: !!selectedWorkflow && showHistory,
  });

  function addStep() {
    if (!actionData.trim()) return;
    try {
      const parsed = JSON.parse(actionData);
      setRecordedSteps(prev => [...prev, { stepNumber: prev.length + 1, actionType: selectedAction, rawData: parsed }]);
      setActionData("");
    } catch {
      toast({ title: "Invalid JSON data", variant: "destructive" });
    }
  }

  function startExecute(wf: any) {
    setSelectedWorkflow(wf);
    const vars = (wf.variables || []).reduce((acc: any, v: any) => { acc[v.name] = v.defaultValue || ""; return acc; }, {});
    setVariableValues(vars);
    setRunResults([]);
    setShowExecute(true);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Workflow className="w-6 h-6 text-violet-400" />AI Workflow Recorder</h1>
          <p className="text-gray-400 mt-1">Record, save, and replay automated workflows with variable substitution</p>
        </div>
        <Button onClick={() => { setShowRecorder(true); setRecordedSteps([]); setWorkflowName(""); }} data-testid="button-new-workflow">
          <Plus className="w-4 h-4 mr-2" />Record Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
      ) : (workflows as any[]).length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Workflow className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p>No workflows yet. Record your first workflow to automate repetitive tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(workflows as any[]).map((wf: any) => (
            <Card key={wf.id} className="bg-gray-900 border-gray-800" data-testid={`card-workflow-${wf.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-white text-base">{wf.name}</CardTitle>
                  <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">{(wf.recordedSteps || []).length} steps</Badge>
                </div>
                {wf.description && <p className="text-xs text-gray-400">{wf.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  {(wf.variables || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(wf.variables || []).map((v: any, i: number) => (
                        <Badge key={i} className="text-xs bg-violet-900/30 text-violet-300 border-violet-700">{`{{${v.name}}}`}</Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Run count: {wf.runCount || 0}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => startExecute(wf)} data-testid={`button-execute-${wf.id}`}>
                    <Play className="w-3 h-3 mr-1" />Execute
                  </Button>
                  <Button size="sm" variant="outline" className="border-gray-700" onClick={() => { setSelectedWorkflow(wf); setShowHistory(true); }} data-testid={`button-history-${wf.id}`}>
                    <History className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => deleteWorkflow.mutate(wf.id)} data-testid={`button-delete-wf-${wf.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recorder Dialog */}
      <Dialog open={showRecorder} onOpenChange={setShowRecorder}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {recording ? <><CircleDot className="w-4 h-4 text-red-500 animate-pulse" />Recording...</> : "Record New Workflow"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Workflow Name *</Label>
                <Input value={workflowName} onChange={e => setWorkflowName(e.target.value)} placeholder="e.g. Weekly Task Setup" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-workflow-name" />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Input value={workflowDesc} onChange={e => setWorkflowDesc(e.target.value)} placeholder="What does this do?" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-workflow-desc" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-3 font-medium">Add Step</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-gray-400 text-xs">Action Type</Label>
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 mt-1" data-testid="select-action-type"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Data (JSON, use {"{{var}}"} for variables)</Label>
                  <Input value={actionData} onChange={e => setActionData(e.target.value)} placeholder={`{"title": "{{task_name}}"}`} className="bg-gray-700 border-gray-600 mt-1 font-mono text-sm" data-testid="input-step-data" />
                </div>
              </div>
              <Button size="sm" onClick={addStep} disabled={!actionData.trim()} data-testid="button-add-step">
                <Plus className="w-3 h-3 mr-1" />Add Step
              </Button>
            </div>

            {recordedSteps.length > 0 && (
              <div>
                <Label className="text-gray-300 mb-2 block">Recorded Steps ({recordedSteps.length})</Label>
                <div className="space-y-2">
                  {recordedSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-800 rounded p-2" data-testid={`step-recorded-${i}`}>
                      <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                      <Badge variant="outline" className="text-xs border-gray-600">{step.actionType.replace("_", " ")}</Badge>
                      <code className="text-xs text-gray-400 flex-1 truncate">{JSON.stringify(step.rawData)}</code>
                      <button onClick={() => setRecordedSteps(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRecorder(false)} className="border-gray-700" data-testid="button-cancel-record">Cancel</Button>
              <Button onClick={() => saveRecording.mutate({ name: workflowName, description: workflowDesc, recordedSteps })} disabled={!workflowName || recordedSteps.length === 0 || saveRecording.isPending} data-testid="button-save-workflow">
                {saveRecording.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Workflow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execute Dialog */}
      <Dialog open={showExecute} onOpenChange={setShowExecute}>
        <DialogContent className="max-w-xl bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Execute: {selectedWorkflow?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {Object.keys(variableValues).length > 0 ? (
              <div>
                <p className="text-sm text-gray-400 mb-3">Fill in variables to run this workflow:</p>
                {Object.keys(variableValues).map(key => (
                  <div key={key} className="mb-3">
                    <Label className="text-gray-300 text-sm">{`{{${key}}}`}</Label>
                    <Input value={variableValues[key]} onChange={e => setVariableValues(v => ({ ...v, [key]: e.target.value }))} placeholder={`Value for ${key}`} className="bg-gray-800 border-gray-700 mt-1" data-testid={`input-var-${key}`} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No variables detected. Click execute to run.</p>
            )}

            {runResults.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Execution Results:</p>
                <div className="space-y-2">
                  {runResults.map((step, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded ${step.status === "success" ? "bg-green-900/20" : "bg-red-900/20"}`} data-testid={`result-step-${i}`}>
                      {step.status === "success" ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                      <span className="text-xs text-gray-300">Step {step.stepNumber}: {step.status === "success" ? "Completed" : step.error || "Failed"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowExecute(false)} className="border-gray-700" data-testid="button-close-execute">Close</Button>
              <Button onClick={() => executeWorkflow.mutate({ id: selectedWorkflow.id, vars: variableValues })} disabled={executeWorkflow.isPending || Object.values(variableValues).some(v => !v.trim())} data-testid="button-run-workflow">
                {executeWorkflow.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}Execute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Run History: {selectedWorkflow?.name}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-96">
            {(runHistory as any[]).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No runs yet</p>
            ) : (
              <div className="space-y-3">
                {(runHistory as any[]).map((run: any) => (
                  <div key={run.id} className="bg-gray-800 rounded-lg p-3" data-testid={`run-history-${run.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={run.status === "completed" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}>{run.status}</Badge>
                      <span className="text-xs text-gray-500">{new Date(run.startedAt).toLocaleString()}</span>
                    </div>
                    {(run.steps || []).map((step: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-400" data-testid={`history-step-${run.id}-${i}`}>
                        {step.status === "success" ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                        Step {step.stepNumber}: {step.status}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
