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
import { Mail, Loader2, Copy, Sparkles, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
];

export default function EmailPage() {
  const { toast } = useToast();
  const [composeAction, setComposeAction] = useState<"compose" | "reply" | "follow_up">("compose");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeInstructions, setComposeInstructions] = useState("");
  const [composeThread, setComposeThread] = useState("");
  const [composeTone, setComposeTone] = useState("professional");
  const [composeResult, setComposeResult] = useState("");
  const [summarizeSubject, setSummarizeSubject] = useState("");
  const [summarizeContent, setSummarizeContent] = useState("");
  const [summarizeResult, setSummarizeResult] = useState("");
  const [triageResult, setTriageResult] = useState<any>(null);

  const composeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/email/compose", {
      action: composeAction, to: composeTo, subject: composeSubject,
      instructions: composeInstructions, threadContext: composeThread, tone: composeTone,
    }),
    onSuccess: (data: any) => setComposeResult(data.text),
    onError: () => toast({ title: "Failed to compose email", variant: "destructive" }),
  });

  const summarizeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/email/1/summarize", { subject: summarizeSubject, content: summarizeContent }),
    onSuccess: (data: any) => setSummarizeResult(data.summary),
    onError: () => toast({ title: "Failed to summarize", variant: "destructive" }),
  });

  const triageMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/email/triage", {}),
    onSuccess: (data: any) => setTriageResult(data),
    onError: () => toast({ title: "Triage failed", variant: "destructive" }),
  });

  function copy(text: string) { navigator.clipboard.writeText(text); toast({ title: "Copied to clipboard" }); }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Mail className="w-6 h-6 text-violet-400" />AI Email Assistant</h1>
        <p className="text-gray-400 mt-1">Compose emails, summarize threads, and triage your inbox with AI</p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList className="bg-gray-800 border-gray-700 mb-6">
          <TabsTrigger value="compose" data-testid="tab-email-compose">Compose</TabsTrigger>
          <TabsTrigger value="summarize" data-testid="tab-email-summarize">Summarize Thread</TabsTrigger>
          <TabsTrigger value="triage" data-testid="tab-email-triage">Inbox Triage</TabsTrigger>
        </TabsList>

        {/* COMPOSE */}
        <TabsContent value="compose">
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-white">Email Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300">Action</Label>
                  <Select value={composeAction} onValueChange={(v: any) => setComposeAction(v)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 mt-1" data-testid="select-email-action"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="compose">Compose New</SelectItem>
                      <SelectItem value="reply">Write Reply</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {composeAction === "compose" && (
                  <>
                    <div>
                      <Label className="text-gray-300">To</Label>
                      <Input value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="recipient@example.com" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-email-to" />
                    </div>
                    <div>
                      <Label className="text-gray-300">Subject</Label>
                      <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Email subject" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-email-subject" />
                    </div>
                  </>
                )}

                {(composeAction === "reply" || composeAction === "follow_up") && (
                  <div>
                    <Label className="text-gray-300">Original Thread / Context</Label>
                    <Textarea value={composeThread} onChange={e => setComposeThread(e.target.value)} placeholder="Paste the original email or thread..." rows={4} className="bg-gray-800 border-gray-700 mt-1" data-testid="input-email-thread" />
                  </div>
                )}

                <div>
                  <Label className="text-gray-300">Instructions</Label>
                  <Input value={composeInstructions} onChange={e => setComposeInstructions(e.target.value)} placeholder='e.g. "Schedule a meeting for next week"' className="bg-gray-800 border-gray-700 mt-1" data-testid="input-email-instructions" />
                </div>

                <div>
                  <Label className="text-gray-300">Tone</Label>
                  <Select value={composeTone} onValueChange={setComposeTone}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 mt-1" data-testid="select-email-tone"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={() => composeMutation.mutate()} disabled={composeMutation.isPending} data-testid="button-generate-email">
                  {composeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}Generate Email
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Generated Email</CardTitle>
                  {composeResult && <Button size="sm" variant="ghost" onClick={() => copy(composeResult)} className="text-gray-400" data-testid="button-copy-email"><Copy className="w-4 h-4" /></Button>}
                </div>
              </CardHeader>
              <CardContent>
                {composeResult ? (
                  <div className="bg-gray-800 rounded-lg p-4 min-h-[300px]" data-testid="generated-email">
                    <pre className="text-gray-100 text-sm whitespace-pre-wrap font-sans leading-relaxed">{composeResult}</pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[300px] text-gray-600">
                    <div className="text-center">
                      <Mail className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                      <p className="text-sm">Your generated email will appear here</p>
                      {composeMutation.isPending && <div className="mt-3 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-violet-400" /><span className="text-violet-400 text-sm">Writing...</span></div>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SUMMARIZE */}
        <TabsContent value="summarize">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white">Email Thread Summarizer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Email Subject</Label>
                <Input value={summarizeSubject} onChange={e => setSummarizeSubject(e.target.value)} placeholder="Email subject line" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-summarize-subject" />
              </div>
              <div>
                <Label className="text-gray-300">Email Thread Content</Label>
                <Textarea value={summarizeContent} onChange={e => setSummarizeContent(e.target.value)} placeholder="Paste the full email thread here..." rows={8} className="bg-gray-800 border-gray-700 mt-1" data-testid="input-summarize-content" />
              </div>
              <Button onClick={() => summarizeMutation.mutate()} disabled={!summarizeSubject || !summarizeContent || summarizeMutation.isPending} data-testid="button-summarize-email">
                {summarizeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}Summarize Thread
              </Button>
              {summarizeResult && (
                <div className="bg-gray-800 rounded-lg p-4 flex items-start gap-3" data-testid="email-summary">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Summary</p>
                    <p className="text-gray-100 text-sm leading-relaxed">{summarizeResult}</p>
                    <button onClick={() => copy(summarizeResult)} className="text-xs text-gray-500 hover:text-gray-300 mt-2 flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRIAGE */}
        <TabsContent value="triage">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Inbox Triage</CardTitle>
                <Button onClick={() => triageMutation.mutate()} disabled={triageMutation.isPending} data-testid="button-triage">
                  {triageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Inbox className="w-4 h-4 mr-2" />}Triage Inbox
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {triageResult ? (
                <div className="text-center py-8" data-testid="triage-result">
                  <div className="text-5xl font-bold text-violet-400 mb-2">{triageResult.triaged}</div>
                  <p className="text-gray-300">emails triaged and categorized</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["urgent", "important", "fyi", "low"].map(p => (
                      <Badge key={p} variant="outline" className="text-xs capitalize border-gray-600 text-gray-300">{p}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-4">Email threads have been labeled with AI priority levels. Connect an email account to see your actual inbox.</p>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <Inbox className="w-16 h-16 mx-auto mb-3 text-gray-700" />
                  <p className="text-lg font-medium mb-2">Inbox Triage</p>
                  <p className="text-sm max-w-sm mx-auto">AI analyzes your email threads and categorizes them as Urgent, Important, FYI, or Low priority. Connect an email account for full functionality.</p>
                  {triageMutation.isPending && <div className="mt-4 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /><span className="text-violet-400">Triaging inbox...</span></div>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
