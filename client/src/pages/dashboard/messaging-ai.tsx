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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Loader2, Sparkles, Copy, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MessagingAiPage() {
  const { toast } = useToast();
  const [threadParentId, setThreadParentId] = useState("");
  const [threadSummary, setThreadSummary] = useState("");
  const [catchUpChannelId, setCatchUpChannelId] = useState("");
  const [catchUpSince, setCatchUpSince] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [catchUpResult, setCatchUpResult] = useState<any>(null);
  const [replyMessageId, setReplyMessageId] = useState("");
  const [replySuggestions, setReplySuggestions] = useState<string[]>([]);
  const [composeAction, setComposeAction] = useState<"draft_reply" | "make_professional" | "translate">("make_professional");
  const [composeInput, setComposeInput] = useState("");
  const [composeThread, setComposeThread] = useState("");
  const [composeLang, setComposeLang] = useState("Spanish");
  const [composeResult, setComposeResult] = useState("");
  const [decisionChannelId, setDecisionChannelId] = useState("");
  const [decisionStart, setDecisionStart] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [decisionEnd, setDecisionEnd] = useState(new Date().toISOString().split("T")[0]);
  const [decisions, setDecisions] = useState<any[]>([]);

  const threadSummarizeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", "/api/messaging-ai/summarize-thread", { threadParentId: id }),
    onSuccess: (data: any) => setThreadSummary(data.summary),
    onError: () => toast({ title: "Summarization failed", variant: "destructive" }),
  });

  const catchUpMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/messaging-ai/catch-up", data),
    onSuccess: (data: any) => setCatchUpResult(data),
    onError: () => toast({ title: "Catch-up failed", variant: "destructive" }),
  });

  const suggestRepliesMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", "/api/messaging-ai/suggest-replies", { messageId: id }),
    onSuccess: (data: any) => setReplySuggestions(data.replies || []),
    onError: () => toast({ title: "Failed to suggest replies", variant: "destructive" }),
  });

  const composeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/messaging-ai/compose", data),
    onSuccess: (data: any) => setComposeResult(data.text),
    onError: () => toast({ title: "Compose failed", variant: "destructive" }),
  });

  const decisionsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/messaging-ai/extract-decisions", data),
    onSuccess: (data: any) => setDecisions(data.decisions || []),
    onError: () => toast({ title: "Extraction failed", variant: "destructive" }),
  });

  function copy(text: string) { navigator.clipboard.writeText(text); toast({ title: "Copied" }); }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MessageSquare className="w-6 h-6 text-violet-400" />AI Messaging Intelligence</h1>
        <p className="text-gray-400 mt-1">Summarize threads, catch up, compose, and extract decisions from messages</p>
      </div>

      <Tabs defaultValue="summarize">
        <TabsList className="bg-gray-800 border-gray-700 mb-6">
          <TabsTrigger value="summarize" data-testid="tab-summarize">Summarize Thread</TabsTrigger>
          <TabsTrigger value="catchup" data-testid="tab-catchup">Catch Up</TabsTrigger>
          <TabsTrigger value="replies" data-testid="tab-replies">Reply Suggestions</TabsTrigger>
          <TabsTrigger value="compose" data-testid="tab-compose">AI Compose</TabsTrigger>
          <TabsTrigger value="decisions" data-testid="tab-decisions">Extract Decisions</TabsTrigger>
        </TabsList>

        {/* SUMMARIZE THREAD */}
        <TabsContent value="summarize">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Thread Summarizer</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Input value={threadParentId} onChange={e => setThreadParentId(e.target.value)} placeholder="Thread parent message ID" type="number" className="bg-gray-800 border-gray-700 w-64" data-testid="input-thread-id" />
                <Button onClick={() => threadSummarizeMutation.mutate(parseInt(threadParentId))} disabled={!threadParentId || threadSummarizeMutation.isPending} data-testid="button-summarize-thread">
                  {threadSummarizeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}Summarize
                </Button>
              </div>
              {threadSummary && (
                <div className="bg-gray-800 rounded-lg p-4 flex items-start gap-3" data-testid="thread-summary">
                  <MessageCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-100 text-sm leading-relaxed">{threadSummary}</p>
                    <button onClick={() => copy(threadSummary)} className="text-xs text-gray-500 hover:text-gray-300 mt-2 flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATCH UP */}
        <TabsContent value="catchup">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Channel Catch-Up</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <Label className="text-gray-400 text-xs">Channel ID</Label>
                  <Input value={catchUpChannelId} onChange={e => setCatchUpChannelId(e.target.value)} placeholder="Channel ID" type="number" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-catchup-channel" />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Since Date</Label>
                  <Input type="date" value={catchUpSince} onChange={e => setCatchUpSince(e.target.value)} className="bg-gray-800 border-gray-700 mt-1" data-testid="input-catchup-since" />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={() => catchUpMutation.mutate({ channelId: parseInt(catchUpChannelId), since: new Date(catchUpSince).toISOString() })} disabled={!catchUpChannelId || catchUpMutation.isPending} data-testid="button-catch-up">
                    {catchUpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Catch Me Up
                  </Button>
                </div>
              </div>
              {catchUpResult && (
                <div className="bg-gray-800 rounded-lg p-4" data-testid="catchup-result">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">{catchUpResult.messageCount} messages</Badge>
                    <button onClick={() => copy(catchUpResult.summary)} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
                  </div>
                  <p className="text-gray-100 text-sm leading-relaxed">{catchUpResult.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPLY SUGGESTIONS */}
        <TabsContent value="replies">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Smart Reply Suggestions</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Input value={replyMessageId} onChange={e => setReplyMessageId(e.target.value)} placeholder="Message ID to reply to" type="number" className="bg-gray-800 border-gray-700 w-64" data-testid="input-reply-message-id" />
                <Button onClick={() => suggestRepliesMutation.mutate(parseInt(replyMessageId))} disabled={!replyMessageId || suggestRepliesMutation.isPending} data-testid="button-suggest-replies">
                  {suggestRepliesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}Suggest Replies
                </Button>
              </div>
              {replySuggestions.length > 0 && (
                <div className="space-y-2" data-testid="reply-suggestions">
                  {replySuggestions.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3 group" data-testid={`reply-suggestion-${i}`}>
                      <span className="w-6 h-6 rounded-full bg-violet-900/40 text-violet-300 text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <p className="text-sm text-gray-200 flex-1">{r}</p>
                      <button onClick={() => copy(r)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPOSE */}
        <TabsContent value="compose">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">AI Message Composer</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Action</Label>
                  <Select value={composeAction} onValueChange={(v: any) => setComposeAction(v)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 mt-1" data-testid="select-compose-action"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="make_professional">Make Professional</SelectItem>
                      <SelectItem value="draft_reply">Draft Reply</SelectItem>
                      <SelectItem value="translate">Translate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {composeAction === "draft_reply" ? (
                  <div>
                    <Label className="text-gray-300">Thread Context</Label>
                    <Textarea value={composeThread} onChange={e => setComposeThread(e.target.value)} placeholder="Paste the message or thread to reply to..." rows={4} className="bg-gray-800 border-gray-700 mt-1" data-testid="input-compose-thread" />
                  </div>
                ) : (
                  <div>
                    <Label className="text-gray-300">{composeAction === "translate" ? "Text to translate" : "Text to improve"}</Label>
                    <Textarea value={composeInput} onChange={e => setComposeInput(e.target.value)} placeholder="Type your message here..." rows={4} className="bg-gray-800 border-gray-700 mt-1" data-testid="input-compose-text" />
                  </div>
                )}
                {composeAction === "translate" && (
                  <div>
                    <Label className="text-gray-300">Target Language</Label>
                    <Input value={composeLang} onChange={e => setComposeLang(e.target.value)} placeholder="Spanish" className="bg-gray-800 border-gray-700 mt-1 w-48" data-testid="input-compose-lang" />
                  </div>
                )}
                <Button onClick={() => composeMutation.mutate({ action: composeAction, inputText: composeInput, threadContext: composeThread, language: composeLang })} disabled={(!composeInput && !composeThread) || composeMutation.isPending} data-testid="button-compose">
                  {composeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}Generate
                </Button>
                {composeResult && (
                  <div className="bg-gray-800 rounded-lg p-4 flex items-start gap-3" data-testid="compose-result">
                    <div className="flex-1">
                      <p className="text-gray-100 text-sm leading-relaxed">{composeResult}</p>
                      <button onClick={() => copy(composeResult)} className="text-xs text-gray-500 hover:text-gray-300 mt-2 flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DECISIONS */}
        <TabsContent value="decisions">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Decision Extractor</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <Label className="text-gray-400 text-xs">Channel ID</Label>
                  <Input value={decisionChannelId} onChange={e => setDecisionChannelId(e.target.value)} placeholder="Channel ID" type="number" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-decision-channel" />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">From Date</Label>
                  <Input type="date" value={decisionStart} onChange={e => setDecisionStart(e.target.value)} className="bg-gray-800 border-gray-700 mt-1" data-testid="input-decision-start" />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">To Date</Label>
                  <Input type="date" value={decisionEnd} onChange={e => setDecisionEnd(e.target.value)} className="bg-gray-800 border-gray-700 mt-1" data-testid="input-decision-end" />
                </div>
              </div>
              <Button onClick={() => decisionsMutation.mutate({ channelId: parseInt(decisionChannelId), dateRange: { start: new Date(decisionStart).toISOString(), end: new Date(decisionEnd).toISOString() } })} disabled={!decisionChannelId || decisionsMutation.isPending} className="mb-4" data-testid="button-extract-decisions">
                {decisionsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}Extract Decisions
              </Button>
              {decisions.length > 0 ? (
                <div className="space-y-3" data-testid="decisions-list">
                  {decisions.map((d: any, i: number) => (
                    <div key={i} className="border-l-2 border-violet-600 pl-4 py-2" data-testid={`decision-${i}`}>
                      <p className="text-sm text-gray-100 font-medium">{d.decision}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-violet-400">{d.decidedBy}</span>
                        <span className="text-xs text-gray-500">{d.date ? new Date(d.date).toLocaleDateString() : ""}</span>
                      </div>
                      {d.context && <p className="text-xs text-gray-400 mt-1">{d.context}</p>}
                    </div>
                  ))}
                </div>
              ) : decisionsMutation.isSuccess ? (
                <p className="text-gray-500 text-sm text-center py-4">No decisions found in this date range.</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
