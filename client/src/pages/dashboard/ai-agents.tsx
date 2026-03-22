import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, Plus, Send, ChevronDown, ChevronRight, Zap, Search, BookOpen, CheckSquare, MessageSquare, Loader2, X, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CAPABILITIES = [
  { id: "read_tasks", label: "Read Tasks" },
  { id: "write_tasks", label: "Write Tasks" },
  { id: "search_workspace", label: "Search Workspace" },
  { id: "read_pages", label: "Read Pages/Notes" },
  { id: "send_messages", label: "Send Messages" },
  { id: "read_messages", label: "Read Messages" },
];

const TEMPLATES = [
  { id: "sprint_status", label: "Sprint Status Bot", icon: "📊", desc: "Daily sprint status reports" },
  { id: "qa_knowledge", label: "Q&A Knowledge Bot", icon: "🧠", desc: "Answer questions from workspace" },
  { id: "meeting_prep", label: "Meeting Prep Agent", icon: "📅", desc: "Context before meetings" },
  { id: "onboarding", label: "Onboarding Agent", icon: "👋", desc: "Guide new members" },
  { id: "task_triage", label: "Task Triage Agent", icon: "🎯", desc: "Auto-prioritize tasks" },
  { id: "weekly_digest", label: "Weekly Digest Agent", icon: "📰", desc: "Friday summary" },
];

export default function AiAgentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [builderForm, setBuilderForm] = useState({ name: "", description: "", icon: "🤖", systemPrompt: "", model: "gpt-4o", temperature: 0.7, capabilities: [] as string[], triggerType: "manual", visibility: "workspace" });
  const [generatingInstructions, setGeneratingInstructions] = useState(false);

  const { data: agents = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/agents"] });

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => apiRequest("POST", `/api/agents/${selectedAgent.id}/chat`, { message: msg, conversationId }),
    onSuccess: (data: any) => {
      setConversationId(data.conversationId);
      setMessages(prev => [...prev, { role: "agent", content: data.response, steps: data.steps }]);
    },
    onError: () => toast({ title: "Chat failed", variant: "destructive" }),
  });

  const createFromTemplate = useMutation({
    mutationFn: (templateId: string) => apiRequest("POST", "/api/agents/from-template", { templateId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agents"] }); toast({ title: "Agent created from template" }); },
    onError: () => toast({ title: "Failed to create agent", variant: "destructive" }),
  });

  const createAgent = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/agents", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agents"] }); setShowBuilder(false); toast({ title: "Agent created" }); },
    onError: () => toast({ title: "Failed to create agent", variant: "destructive" }),
  });

  const deleteAgent = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/agents/${id}`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agents"] }); setSelectedAgent(null); toast({ title: "Agent deactivated" }); },
  });

  async function generateInstructions() {
    if (!builderForm.description) return;
    setGeneratingInstructions(true);
    try {
      const data: any = await apiRequest("POST", "/api/agents/generate-instructions", { description: builderForm.description });
      setBuilderForm(f => ({ ...f, systemPrompt: data.instructions }));
    } finally { setGeneratingInstructions(false); }
  }

  function selectAgent(agent: any) {
    setSelectedAgent(agent);
    setMessages([]);
    setConversationId(null);
  }

  function sendMessage() {
    if (!chatInput.trim() || !selectedAgent) return;
    const msg = chatInput.trim();
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setChatInput("");
    chatMutation.mutate(msg);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left panel: agent list */}
      <div className="w-72 border-r border-gray-800 flex flex-col bg-gray-950">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2"><Bot className="w-4 h-4 text-violet-400" />AI Agents</h2>
          <Button size="sm" onClick={() => setShowBuilder(true)} data-testid="button-new-agent"><Plus className="w-3 h-3" /></Button>
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
          ) : agents.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-4">No agents yet. Start from a template:</p>
              <div className="space-y-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} className="w-full text-left p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm" onClick={() => createFromTemplate.mutate(t.id)} data-testid={`button-template-${t.id}`}>
                    <span className="mr-2">{t.icon}</span><span className="text-white">{t.label}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {(agents as any[]).map((agent: any) => (
                <button key={agent.id} className={`w-full text-left p-3 rounded-lg transition-colors ${selectedAgent?.id === agent.id ? "bg-violet-900/40 border border-violet-700" : "hover:bg-gray-800"}`} onClick={() => selectAgent(agent)} data-testid={`button-agent-${agent.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{agent.icon || "🤖"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                      <p className="text-xs text-gray-400 truncate">{agent.description || agent.triggerType}</p>
                    </div>
                    {agent.isActive && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                  </div>
                </button>
              ))}
              <div className="pt-2 border-t border-gray-800 mt-2">
                <p className="text-xs text-gray-500 px-1 mb-2">Add from template</p>
                {TEMPLATES.map(t => (
                  <button key={t.id} className="w-full text-left p-2 rounded hover:bg-gray-800 text-sm text-gray-400 hover:text-white flex items-center gap-2" onClick={() => createFromTemplate.mutate(t.id)} data-testid={`button-tmpl-${t.id}`}>
                    <span>{t.icon}</span><span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right panel: chat */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {!selectedAgent ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <Bot className="w-16 h-16 text-gray-700" />
            <p className="text-gray-500">Select an agent to start chatting</p>
            <Button onClick={() => setShowBuilder(true)} variant="outline" data-testid="button-create-agent-empty">
              <Plus className="w-4 h-4 mr-2" />Create New Agent
            </Button>
          </div>
        ) : (
          <>
            {/* Agent header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedAgent.icon || "🤖"}</span>
                <div>
                  <h3 className="font-semibold text-white">{selectedAgent.name}</h3>
                  <p className="text-xs text-gray-400">{(selectedAgent.capabilities || []).join(", ") || "No capabilities"}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => deleteAgent.mutate(selectedAgent.id)} data-testid="button-deactivate-agent">Deactivate</Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-violet-500" />
                    <p>Start a conversation with {selectedAgent.name}</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-100"}`} data-testid={`msg-${msg.role}-${i}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.steps && msg.steps.length > 0 && (
                        <Collapsible className="mt-2">
                          <CollapsibleTrigger className="text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1" onClick={() => setExpandedSteps(s => ({ ...s, [i]: !s[i] }))}>
                            {expandedSteps[i] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            {msg.steps.length} tool step{msg.steps.length !== 1 ? "s" : ""}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 space-y-1 border-t border-gray-700 pt-2">
                              {msg.steps.map((step: any, si: number) => (
                                <div key={si} className="text-xs bg-gray-900 rounded p-2" data-testid={`step-${i}-${si}`}>
                                  <span className="text-violet-400">{step.action}</span>
                                  <pre className="text-gray-400 mt-1 overflow-auto text-xs">{JSON.stringify(step.output, null, 2).substring(0, 200)}</pre>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span className="text-sm text-gray-400">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="max-w-3xl mx-auto flex gap-2">
                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={`Message ${selectedAgent.name}...`} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()} className="bg-gray-800 border-gray-700" data-testid="input-chat-message" />
                <Button onClick={sendMessage} disabled={chatMutation.isPending || !chatInput.trim()} data-testid="button-send-chat">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Agent Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Create New Agent</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Name</Label>
                <Input value={builderForm.name} onChange={e => setBuilderForm(f => ({ ...f, name: e.target.value }))} placeholder="Agent name" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-agent-name" />
              </div>
              <div>
                <Label className="text-gray-300">Icon</Label>
                <Input value={builderForm.icon} onChange={e => setBuilderForm(f => ({ ...f, icon: e.target.value }))} placeholder="🤖" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-agent-icon" />
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Input value={builderForm.description} onChange={e => setBuilderForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this agent do?" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-agent-description" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-gray-300">Instructions (System Prompt)</Label>
                <Button variant="ghost" size="sm" onClick={generateInstructions} disabled={!builderForm.description || generatingInstructions} className="text-violet-400 text-xs" data-testid="button-generate-instructions">
                  {generatingInstructions ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}Generate from description
                </Button>
              </div>
              <Textarea value={builderForm.systemPrompt} onChange={e => setBuilderForm(f => ({ ...f, systemPrompt: e.target.value }))} placeholder="You are an AI agent that..." rows={5} className="bg-gray-800 border-gray-700" data-testid="input-agent-prompt" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Model</Label>
                <Select value={builderForm.model} onValueChange={v => setBuilderForm(f => ({ ...f, model: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 mt-1" data-testid="select-agent-model"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Trigger</Label>
                <Select value={builderForm.triggerType} onValueChange={v => setBuilderForm(f => ({ ...f, triggerType: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 mt-1" data-testid="select-agent-trigger"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="message_in_channel">Message in Channel</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-gray-300 mb-2 block">Capabilities</Label>
              <div className="grid grid-cols-2 gap-2">
                {CAPABILITIES.map(cap => (
                  <div key={cap.id} className="flex items-center gap-2">
                    <Checkbox id={cap.id} checked={builderForm.capabilities.includes(cap.id)} onCheckedChange={checked => setBuilderForm(f => ({ ...f, capabilities: checked ? [...f.capabilities, cap.id] : f.capabilities.filter(c => c !== cap.id) }))} data-testid={`checkbox-cap-${cap.id}`} />
                    <Label htmlFor={cap.id} className="text-gray-300 text-sm cursor-pointer">{cap.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Visibility</Label>
              <Select value={builderForm.visibility} onValueChange={v => setBuilderForm(f => ({ ...f, visibility: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 mt-1" data-testid="select-agent-visibility"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="workspace">Workspace</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="specific_members">Specific Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowBuilder(false)} className="border-gray-700" data-testid="button-cancel-agent">Cancel</Button>
              <Button onClick={() => createAgent.mutate(builderForm)} disabled={!builderForm.name || !builderForm.systemPrompt || createAgent.isPending} data-testid="button-create-agent">
                {createAgent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Agent
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
