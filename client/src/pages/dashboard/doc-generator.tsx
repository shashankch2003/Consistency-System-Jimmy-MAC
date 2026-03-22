import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TEMPLATES = [
  { value: "weekly_status", label: "Weekly Status Report", icon: "📊", desc: "Complete weekly summary with tasks and risks" },
  { value: "meeting_agenda", label: "Meeting Agenda", icon: "📋", desc: "Agenda from open tasks and action items" },
  { value: "project_brief", label: "Project Brief", icon: "📁", desc: "Full project overview and requirements" },
  { value: "sprint_retro", label: "Sprint Retrospective", icon: "🔄", desc: "What went well, improvements, action items" },
  { value: "handoff_doc", label: "Handoff Document", icon: "🤝", desc: "Project state for team transitions" },
  { value: "client_update", label: "Client Update", icon: "💼", desc: "Professional client-facing progress update" },
  { value: "onboarding_guide", label: "Onboarding Guide", icon: "👋", desc: "New team member welcome and setup guide" },
];

export default function DocGeneratorPage() {
  const { toast } = useToast();
  const [template, setTemplate] = useState("weekly_status");
  const [projectName, setProjectName] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/doc-generator/generate", {
      templateType: template,
      config: { dateRangeStart: dateStart, dateRangeEnd: dateEnd, projectName },
    }),
    onSuccess: (data: any) => { setGeneratedContent(data.content); setIsEditing(false); },
    onError: () => toast({ title: "Generation failed", variant: "destructive" }),
  });

  function copyToClipboard() {
    navigator.clipboard.writeText(generatedContent);
    toast({ title: "Copied to clipboard" });
  }

  const selectedTemplate = TEMPLATES.find(t => t.value === template);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FileText className="w-6 h-6 text-violet-400" />AI Document Generator</h1>
        <p className="text-gray-400 mt-1">Generate professional documents from your real workspace data</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="col-span-1 space-y-4">
          <div>
            <Label className="text-gray-300 mb-2 block">Document Type</Label>
            <div className="space-y-2">
              {TEMPLATES.map(t => (
                <button key={t.value} className={`w-full text-left p-3 rounded-lg border transition-colors ${template === t.value ? "border-violet-600 bg-violet-900/20" : "border-gray-700 bg-gray-800 hover:border-gray-600"}`} onClick={() => setTemplate(t.value)} data-testid={`template-${t.value}`}>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${template === t.value ? "text-violet-300" : "text-gray-200"}`}>{t.label}</p>
                      <p className="text-xs text-gray-500">{t.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-300">Configuration</p>
            {template === "project_brief" && (
              <div>
                <Label className="text-gray-400 text-xs">Project Name</Label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name" className="bg-gray-800 border-gray-700 mt-1 text-sm" data-testid="input-project-name" />
              </div>
            )}
            <div>
              <Label className="text-gray-400 text-xs">Date Range Start</Label>
              <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-gray-800 border-gray-700 mt-1 text-sm" data-testid="input-date-start" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Date Range End</Label>
              <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-gray-800 border-gray-700 mt-1 text-sm" data-testid="input-date-end" />
            </div>
            <Button className="w-full" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} data-testid="button-generate-doc">
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}Generate {selectedTemplate?.label}
            </Button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="col-span-2">
          {generatedContent ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 h-full flex flex-col">
              <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{selectedTemplate?.icon}</span>
                  <span className="text-sm font-medium text-gray-300">{selectedTemplate?.label}</span>
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">Generated from real data</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(!isEditing)} className="text-gray-400 text-xs" data-testid="button-toggle-edit">{isEditing ? "Preview" : "Edit"}</Button>
                  <Button size="sm" variant="ghost" onClick={copyToClipboard} className="text-gray-400" data-testid="button-copy-doc"><Copy className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              {isEditing ? (
                <Textarea value={generatedContent} onChange={e => setGeneratedContent(e.target.value)} className="flex-1 bg-transparent border-none resize-none text-gray-100 text-sm font-mono p-4 min-h-[500px]" data-testid="textarea-doc-edit" />
              ) : (
                <div className="flex-1 p-4 overflow-y-auto">
                  <pre className="text-gray-100 text-sm whitespace-pre-wrap font-sans leading-relaxed" data-testid="doc-preview">{generatedContent}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-3 text-gray-700" />
                <p className="text-lg font-medium mb-1">No document generated yet</p>
                <p className="text-sm">Select a template and click Generate to create your document</p>
                {generateMutation.isPending && <div className="mt-4 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /><span className="text-violet-400">Generating...</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
