import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Database, Search, Sparkles, Loader2, Code2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DatabaseAiPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [queryAnswer, setQueryAnswer] = useState("");
  const [autoFillTaskId, setAutoFillTaskId] = useState("");
  const [autoFillPrompt, setAutoFillPrompt] = useState("");
  const [autoFillFields, setAutoFillFields] = useState(["title", "description"]);
  const [autoFillResult, setAutoFillResult] = useState("");
  const [dbDesc, setDbDesc] = useState("");
  const [dbResult, setDbResult] = useState<any>(null);
  const [formulaDesc, setFormulaDesc] = useState("");
  const [formulaProps, setFormulaProps] = useState([{ name: "priority", type: "select" }, { name: "completionPercentage", type: "number" }]);
  const [formulaResult, setFormulaResult] = useState("");
  const [newPropName, setNewPropName] = useState("");
  const [newPropType, setNewPropType] = useState("text");

  const queryMutation = useMutation({
    mutationFn: (q: string) => apiRequest("POST", "/api/database-ai/query", { query: q }),
    onSuccess: (data: any) => setQueryAnswer(data.answer),
    onError: () => toast({ title: "Query failed", variant: "destructive" }),
  });

  const autoFillMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/database-ai/auto-fill", data),
    onSuccess: (data: any) => setAutoFillResult(data.value),
    onError: () => toast({ title: "Auto-fill failed", variant: "destructive" }),
  });

  const createDbMutation = useMutation({
    mutationFn: (desc: string) => apiRequest("POST", "/api/database-ai/create-from-description", { description: desc }),
    onSuccess: (data: any) => setDbResult(data),
    onError: () => toast({ title: "Creation failed", variant: "destructive" }),
  });

  const formulaMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/database-ai/generate-formula", data),
    onSuccess: (data: any) => setFormulaResult(data.formula),
    onError: () => toast({ title: "Formula generation failed", variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Database className="w-6 h-6 text-violet-400" />AI Database Intelligence</h1>
        <p className="text-gray-400 mt-1">Query, auto-fill, create, and generate formulas with natural language</p>
      </div>

      <Tabs defaultValue="query">
        <TabsList className="bg-gray-800 border-gray-700 mb-6">
          <TabsTrigger value="query" data-testid="tab-db-query">Natural Language Query</TabsTrigger>
          <TabsTrigger value="autofill" data-testid="tab-autofill">AI Auto-Fill</TabsTrigger>
          <TabsTrigger value="create" data-testid="tab-create-db">Create Database</TabsTrigger>
          <TabsTrigger value="formula" data-testid="tab-formula">Formula Generator</TabsTrigger>
        </TabsList>

        {/* QUERY */}
        <TabsContent value="query">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Ask Your Database</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder='e.g. "How many high priority tasks do I have?" or "Which tasks are unfinished?"' className="bg-gray-800 border-gray-700 flex-1" onKeyDown={e => e.key === "Enter" && query && queryMutation.mutate(query)} data-testid="input-db-query" />
                <Button onClick={() => queryMutation.mutate(query)} disabled={!query || queryMutation.isPending} data-testid="button-db-query">
                  {queryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {queryAnswer && (
                <div className="bg-gray-800 rounded-lg p-4" data-testid="db-query-answer">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Answer</p>
                  <p className="text-gray-100 text-sm leading-relaxed">{queryAnswer}</p>
                </div>
              )}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Example questions:</p>
                {["How many tasks are incomplete?", "What are my highest priority tasks?", "Which tasks have no priority set?"].map(ex => (
                  <button key={ex} className="block text-xs text-violet-400 hover:text-violet-300 mb-1" onClick={() => { setQuery(ex); queryMutation.mutate(ex); }} data-testid={`example-query-${ex.substring(0, 10)}`}>{ex}</button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTO-FILL */}
        <TabsContent value="autofill">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">AI Auto-Fill Column</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Task ID</Label>
                  <Input value={autoFillTaskId} onChange={e => setAutoFillTaskId(e.target.value)} placeholder="Task ID to fill" type="number" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-autofill-task-id" />
                </div>
                <div>
                  <Label className="text-gray-300">AI Prompt</Label>
                  <Input value={autoFillPrompt} onChange={e => setAutoFillPrompt(e.target.value)} placeholder='e.g. "Generate a short summary of this task"' className="bg-gray-800 border-gray-700 mt-1" data-testid="input-autofill-prompt" />
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Input Fields (fields AI can read)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {autoFillFields.map(f => (
                      <Badge key={f} variant="outline" className="border-gray-600 text-gray-300 flex items-center gap-1" data-testid={`field-badge-${f}`}>
                        {f}
                        <button onClick={() => setAutoFillFields(prev => prev.filter(x => x !== f))}><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {["title", "description", "priority", "date"].filter(f => !autoFillFields.includes(f)).map(f => (
                      <button key={f} className="text-xs text-violet-400 hover:text-violet-300 border border-violet-700 rounded px-2 py-1" onClick={() => setAutoFillFields(prev => [...prev, f])} data-testid={`add-field-${f}`}>+ {f}</button>
                    ))}
                  </div>
                </div>
                <Button onClick={() => autoFillMutation.mutate({ taskId: parseInt(autoFillTaskId), aiPrompt: autoFillPrompt, inputFields: autoFillFields })} disabled={!autoFillTaskId || !autoFillPrompt || autoFillMutation.isPending} data-testid="button-autofill">
                  {autoFillMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}AI Auto-Fill
                </Button>
                {autoFillResult && (
                  <div className="bg-gray-800 rounded-lg p-4" data-testid="autofill-result">
                    <p className="text-xs text-gray-400 mb-1">Generated value:</p>
                    <p className="text-gray-100 text-sm">{autoFillResult}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREATE */}
        <TabsContent value="create">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Create Database from Description</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Input value={dbDesc} onChange={e => setDbDesc(e.target.value)} placeholder='e.g. "A CRM database to track leads and deals"' className="bg-gray-800 border-gray-700 flex-1" data-testid="input-db-desc" />
                <Button onClick={() => createDbMutation.mutate(dbDesc)} disabled={!dbDesc || createDbMutation.isPending} data-testid="button-create-db">
                  {createDbMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}Create
                </Button>
              </div>
              {dbResult && (
                <div className="space-y-4" data-testid="db-result">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm font-bold text-white mb-3">{dbResult.name}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Properties</p>
                        <div className="space-y-1">
                          {(dbResult.properties || []).map((p: any, i: number) => (
                            <div key={i} className="flex items-center gap-2" data-testid={`prop-${i}`}>
                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">{p.type}</Badge>
                              <span className="text-sm text-gray-200">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Views</p>
                        <div className="space-y-1">
                          {(dbResult.views || []).map((v: any, i: number) => (
                            <div key={i} className="flex items-center gap-2" data-testid={`view-${i}`}>
                              <Badge variant="outline" className="text-xs border-gray-600 text-violet-300">{v.type}</Badge>
                              <span className="text-sm text-gray-200">{v.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {dbResult.sampleRows && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-2">Sample Rows</p>
                      <div className="space-y-2">
                        {dbResult.sampleRows.map((row: any, i: number) => (
                          <div key={i} className="text-xs text-gray-300 bg-gray-700 rounded p-2 font-mono" data-testid={`sample-row-${i}`}>{JSON.stringify(row)}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FORMULA */}
        <TabsContent value="formula">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Formula Generator</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Formula Description</Label>
                  <Input value={formulaDesc} onChange={e => setFormulaDesc(e.target.value)} placeholder='e.g. "Calculate completion rate as percentage"' className="bg-gray-800 border-gray-700 mt-1" data-testid="input-formula-desc" />
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Available Properties</Label>
                  <div className="space-y-2">
                    {formulaProps.map((p, i) => (
                      <div key={i} className="flex items-center gap-2" data-testid={`formula-prop-${i}`}>
                        <Input value={p.name} onChange={e => setFormulaProps(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="bg-gray-800 border-gray-700 flex-1" placeholder="Property name" />
                        <Input value={p.type} onChange={e => setFormulaProps(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} className="bg-gray-800 border-gray-700 w-28" placeholder="type" />
                        <button onClick={() => setFormulaProps(prev => prev.filter((_, j) => j !== i))} className="text-red-400"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input value={newPropName} onChange={e => setNewPropName(e.target.value)} placeholder="New property name" className="bg-gray-800 border-gray-700 flex-1" data-testid="input-new-prop-name" />
                      <Input value={newPropType} onChange={e => setNewPropType(e.target.value)} placeholder="type" className="bg-gray-800 border-gray-700 w-28" data-testid="input-new-prop-type" />
                      <Button size="sm" variant="outline" className="border-gray-700" onClick={() => { if (newPropName) { setFormulaProps(prev => [...prev, { name: newPropName, type: newPropType }]); setNewPropName(""); } }} data-testid="button-add-prop"><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
                <Button onClick={() => formulaMutation.mutate({ description: formulaDesc, properties: formulaProps })} disabled={!formulaDesc || formulaMutation.isPending} data-testid="button-generate-formula">
                  {formulaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Code2 className="w-4 h-4 mr-2" />}Generate Formula
                </Button>
                {formulaResult && (
                  <div className="bg-gray-800 rounded-lg p-4" data-testid="formula-result">
                    <p className="text-xs text-gray-400 mb-1">Generated Formula:</p>
                    <code className="text-violet-300 text-sm font-mono">{formulaResult}</code>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
