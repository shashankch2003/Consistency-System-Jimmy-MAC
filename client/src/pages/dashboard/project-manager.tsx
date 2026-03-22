import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, AlertTriangle, FileText, Zap, Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-900/40 text-red-300 border-red-700",
  high: "bg-orange-900/40 text-orange-300 border-orange-700",
  medium: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  low: "bg-blue-900/40 text-blue-300 border-blue-700",
};

export default function ProjectManagerPage() {
  const { toast } = useToast();
  const [standup, setStandup] = useState<any>(null);
  const [statusReport, setStatusReport] = useState<string>("");
  const [automationDesc, setAutomationDesc] = useState("");
  const [automationResult, setAutomationResult] = useState<any>(null);
  const [expandedRisk, setExpandedRisk] = useState<number | null>(null);

  const { data: risks = [], refetch: refetchRisks, isLoading: risksLoading } = useQuery<any[]>({ queryKey: ["/api/project-manager/risks"] });
  const { data: automations = [] } = useQuery<any[]>({ queryKey: ["/api/project-manager/automations"] });

  const generateStandup = useMutation({
    mutationFn: () => apiRequest("POST", "/api/project-manager/standup", {}),
    onSuccess: (data: any) => setStandup(data),
    onError: () => toast({ title: "Failed to generate standup", variant: "destructive" }),
  });

  const detectRisks = useMutation({
    mutationFn: () => apiRequest("POST", "/api/project-manager/detect-risks", {}),
    onSuccess: () => { refetchRisks(); toast({ title: "Risk analysis complete" }); },
    onError: () => toast({ title: "Failed to detect risks", variant: "destructive" }),
  });

  const generateStatus = useMutation({
    mutationFn: () => apiRequest("POST", "/api/project-manager/status-report", {}),
    onSuccess: (data: any) => setStatusReport(data.report),
    onError: () => toast({ title: "Failed to generate report", variant: "destructive" }),
  });

  const createAutomation = useMutation({
    mutationFn: (desc: string) => apiRequest("POST", "/api/project-manager/create-automation", { description: desc }),
    onSuccess: (data: any) => { setAutomationResult(data); toast({ title: "Automation created" }); },
    onError: () => toast({ title: "Failed to create automation", variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-violet-400" />AI Project Manager</h1>
        <p className="text-gray-400 mt-1">AI-powered reports, risk detection, and automation from your real task data</p>
      </div>

      <Tabs defaultValue="standup">
        <TabsList className="bg-gray-800 border-gray-700 mb-6">
          <TabsTrigger value="standup" data-testid="tab-standup">Standup</TabsTrigger>
          <TabsTrigger value="risks" data-testid="tab-risks">Risk Alerts</TabsTrigger>
          <TabsTrigger value="status" data-testid="tab-status">Status Report</TabsTrigger>
          <TabsTrigger value="automations" data-testid="tab-automations">Automations</TabsTrigger>
        </TabsList>

        {/* STANDUP */}
        <TabsContent value="standup">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Daily Standup Report</CardTitle>
                <Button onClick={() => generateStandup.mutate()} disabled={generateStandup.isPending} data-testid="button-generate-standup">
                  {generateStandup.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}Generate Standup
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {standup ? (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: "Total", value: standup.stats.total, color: "text-white" },
                      { label: "Done", value: standup.stats.done, color: "text-green-400" },
                      { label: "In Progress", value: standup.stats.inProgress, color: "text-yellow-400" },
                      { label: "Progress", value: `${standup.stats.progressPercent}%`, color: "text-violet-400" },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-800 rounded-lg p-3 text-center" data-testid={`stat-${s.label.toLowerCase().replace(" ", "-")}`}>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <pre className="text-gray-200 text-sm whitespace-pre-wrap font-sans leading-relaxed" data-testid="text-standup-report">{standup.summary}</pre>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>Click "Generate Standup" to create your daily report from real task data.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RISKS */}
        <TabsContent value="risks">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Risk Detection</CardTitle>
                <Button onClick={() => detectRisks.mutate()} disabled={detectRisks.isPending} data-testid="button-detect-risks">
                  {detectRisks.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}Detect Risks
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {risksLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
              ) : (risks as any[]).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>No active risks detected. Click "Detect Risks" to analyze your tasks.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(risks as any[]).map((risk: any, i: number) => (
                    <div key={risk.id || i} className={`border rounded-lg p-4 ${SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.medium}`} data-testid={`risk-card-${i}`}>
                      <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedRisk(expandedRisk === i ? null : i)}>
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{risk.title}</p>
                            <Badge className="mt-1 text-xs capitalize" variant="outline">{risk.severity}</Badge>
                          </div>
                        </div>
                        {expandedRisk === i ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      {expandedRisk === i && (
                        <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-2">
                          <p className="text-sm">{risk.description}</p>
                          {risk.suggestedAction && <div className="bg-black/20 rounded p-2"><p className="text-xs font-medium">Suggested Action:</p><p className="text-sm">{risk.suggestedAction}</p></div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATUS REPORT */}
        <TabsContent value="status">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Executive Status Report</CardTitle>
                <Button onClick={() => generateStatus.mutate()} disabled={generateStatus.isPending} data-testid="button-generate-status">
                  {generateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}Generate Status Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {statusReport ? (
                <div className="bg-gray-800 rounded-lg p-4">
                  <pre className="text-gray-200 text-sm whitespace-pre-wrap font-sans leading-relaxed" data-testid="text-status-report">{statusReport}</pre>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p>Generate an executive summary from your real task data for stakeholders.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTOMATIONS */}
        <TabsContent value="automations">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">AI Automation Builder</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-6">
                <Input
                  value={automationDesc}
                  onChange={e => setAutomationDesc(e.target.value)}
                  placeholder='e.g. "When a high priority task is created, send a message to #urgent channel"'
                  className="bg-gray-800 border-gray-700 flex-1"
                  data-testid="input-automation-desc"
                  onKeyDown={e => e.key === "Enter" && automationDesc && createAutomation.mutate(automationDesc)}
                />
                <Button onClick={() => createAutomation.mutate(automationDesc)} disabled={!automationDesc || createAutomation.isPending} data-testid="button-create-automation">
                  {createAutomation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}Create
                </Button>
              </div>

              {automationResult && (
                <div className="bg-gray-800 rounded-lg p-4 mb-6" data-testid="automation-preview">
                  <p className="text-sm font-medium text-white mb-3">{automationResult.name}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Trigger", value: automationResult.trigger?.type || "—" },
                      { label: "Conditions", value: `${(automationResult.conditions || []).length} condition(s)` },
                      { label: "Actions", value: `${(automationResult.actions || []).length} action(s)` },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-700 rounded p-2">
                        <p className="text-xs text-gray-400">{item.label}</p>
                        <p className="text-sm text-white mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(automations as any[]).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-3">Saved Automations</p>
                  <div className="space-y-2">
                    {(automations as any[]).map((auto: any) => (
                      <div key={auto.id} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3" data-testid={`automation-${auto.id}`}>
                        <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-white">{auto.name}</p>
                          {auto.createdFromPrompt && <p className="text-xs text-gray-400 truncate mt-0.5">{auto.createdFromPrompt}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">{auto.runCount || 0} runs</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
