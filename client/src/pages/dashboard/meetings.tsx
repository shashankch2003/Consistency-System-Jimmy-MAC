import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Plus, FileText, CheckSquare, Loader2, AlertCircle, CheckCircle, Clock, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-700 text-gray-300",
  transcribing: "bg-blue-900/40 text-blue-300",
  summarizing: "bg-yellow-900/40 text-yellow-300",
  completed: "bg-green-900/40 text-green-300",
  failed: "bg-red-900/40 text-red-300",
};

export default function MeetingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [selectedActions, setSelectedActions] = useState<number[]>([]);

  const { data: meetings = [], isLoading, refetch } = useQuery<any[]>({ queryKey: ["/api/meetings"] });

  const createMeeting = useMutation({
    mutationFn: (title: string) => apiRequest("POST", "/api/meetings", { title }),
    onSuccess: (data: any) => { qc.invalidateQueries({ queryKey: ["/api/meetings"] }); setSelected(data); setShowNew(false); setNewTitle(""); toast({ title: "Meeting created" }); },
  });

  const processText = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/meetings/process-text", data),
    onSuccess: (data: any) => {
      setSelected(data);
      qc.invalidateQueries({ queryKey: ["/api/meetings"] });
      setShowProcess(false);
      setTranscript("");
      toast({ title: "Meeting processed successfully" });
    },
    onError: () => toast({ title: "Processing failed", variant: "destructive" }),
  });

  const prepBrief = useMutation({
    mutationFn: (meetingId: string) => apiRequest("POST", `/api/meetings/${meetingId}/prep-brief`, {}),
    onSuccess: (data: any) => { if (selected) setSelected({ ...selected, prepBrief: data.prepBrief }); toast({ title: "Prep brief generated" }); },
    onError: () => toast({ title: "Failed to generate brief", variant: "destructive" }),
  });

  const createTasks = useMutation({
    mutationFn: ({ meetingId, indices }: { meetingId: string; indices: number[] }) => apiRequest("POST", `/api/meetings/${meetingId}/create-tasks`, { actionItemIndices: indices }),
    onSuccess: (data: any) => {
      toast({ title: `${data.created} task(s) created` });
      refetch();
      if (selected) {
        const actionItems = [...(selected.actionItems || [])];
        selectedActions.forEach(i => { if (actionItems[i]) actionItems[i].taskCreated = true; });
        setSelected({ ...selected, actionItems });
      }
      setSelectedActions([]);
    },
    onError: () => toast({ title: "Task creation failed", variant: "destructive" }),
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: meeting list */}
      <div className="w-72 border-r border-gray-800 flex flex-col bg-gray-950">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2"><Video className="w-4 h-4 text-violet-400" />Meetings</h2>
          <Button size="sm" onClick={() => setShowNew(true)} data-testid="button-new-meeting"><Plus className="w-3 h-3" /></Button>
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
          ) : (meetings as any[]).length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No meetings yet. Create one to start.</div>
          ) : (
            <div className="p-2 space-y-1">
              {(meetings as any[]).map((m: any) => (
                <button key={m.id} className={`w-full text-left p-3 rounded-lg transition-colors ${selected?.id === m.id ? "bg-violet-900/40 border border-violet-700" : "hover:bg-gray-800"}`} onClick={() => setSelected(m)} data-testid={`meeting-item-${m.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[m.processingStatus] || STATUS_COLORS.pending}`}>{m.processingStatus}</span>
                    <span className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-200 truncate">{m.aiSummary || "Untitled Meeting"}</p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: meeting detail */}
      <div className="flex-1 overflow-y-auto bg-gray-900 p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Video className="w-16 h-16 mb-3 text-gray-700" />
            <p>Select a meeting to view its intelligence</p>
            <Button className="mt-4" onClick={() => setShowNew(true)} variant="outline" data-testid="button-create-meeting-empty">New Meeting</Button>
          </div>
        ) : (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.aiSummary?.substring(0, 80) || "Meeting"}</h2>
                <Badge className={`mt-1 text-xs ${STATUS_COLORS[selected.processingStatus] || STATUS_COLORS.pending}`}>{selected.processingStatus}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-gray-700" onClick={() => prepBrief.mutate(selected.meetingId)} disabled={prepBrief.isPending} data-testid="button-prep-brief">
                  {prepBrief.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}Prep Brief
                </Button>
                <Button size="sm" onClick={() => setShowProcess(true)} data-testid="button-process-meeting">
                  <Video className="w-3 h-3 mr-1" />Process Transcript
                </Button>
              </div>
            </div>

            {/* Prep Brief */}
            {selected.prepBrief && (
              <Card className="bg-gray-800 border-gray-700 mb-4">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-violet-300">Meeting Prep Brief</CardTitle></CardHeader>
                <CardContent><pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed" data-testid="prep-brief-text">{selected.prepBrief}</pre></CardContent>
              </Card>
            )}

            {selected.processingStatus === "completed" ? (
              <div className="space-y-4">
                {/* Summary */}
                {selected.aiSummary && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-300">Summary</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-gray-100 leading-relaxed" data-testid="meeting-summary">{selected.aiSummary}</p></CardContent>
                  </Card>
                )}

                {/* Key Points */}
                {selected.keyPoints && (selected.keyPoints as string[]).length > 0 && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-300">Key Points</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-1" data-testid="key-points">
                        {(selected.keyPoints as string[]).map((p: string, i: number) => <li key={i} className="text-sm text-gray-100 flex items-start gap-2"><span className="text-violet-400 mt-0.5">•</span>{p}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Decisions */}
                {selected.decisions && (selected.decisions as any[]).length > 0 && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-300">Decisions</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2" data-testid="decisions">
                        {(selected.decisions as any[]).map((d: any, i: number) => (
                          <div key={i} className="border-l-2 border-green-600 pl-3">
                            <p className="text-sm text-gray-100 font-medium">{d.decision}</p>
                            {d.context && <p className="text-xs text-gray-400 mt-0.5">{d.context}</p>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Items */}
                {selected.actionItems && (selected.actionItems as any[]).length > 0 && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-gray-300">Action Items</CardTitle>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="text-xs text-gray-400" onClick={() => setSelectedActions((selected.actionItems as any[]).map((_: any, i: number) => i).filter((i: number) => !(selected.actionItems as any[])[i].taskCreated))} data-testid="button-select-all-actions">Select All</Button>
                          {selectedActions.length > 0 && (
                            <Button size="sm" onClick={() => createTasks.mutate({ meetingId: selected.meetingId, indices: selectedActions })} disabled={createTasks.isPending} data-testid="button-create-tasks">
                              {createTasks.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckSquare className="w-3 h-3 mr-1" />}Create {selectedActions.length} Task{selectedActions.length !== 1 ? "s" : ""}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2" data-testid="action-items">
                        {(selected.actionItems as any[]).map((item: any, i: number) => (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${item.taskCreated ? "bg-green-900/20" : "bg-gray-700/50"}`} data-testid={`action-item-${i}`}>
                            {!item.taskCreated && (
                              <input type="checkbox" className="mt-0.5" checked={selectedActions.includes(i)} onChange={e => setSelectedActions(prev => e.target.checked ? [...prev, i] : prev.filter(x => x !== i))} />
                            )}
                            {item.taskCreated && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                            <div className="flex-1">
                              <p className="text-sm text-gray-100">{item.title}</p>
                              {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                              {item.suggestedOwner && <p className="text-xs text-violet-400 mt-0.5">→ {item.suggestedOwner}</p>}
                              {item.taskCreated && <Badge className="mt-1 text-xs bg-green-900/30 text-green-300">Task created</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Open Questions */}
                {selected.openQuestions && (selected.openQuestions as string[]).length > 0 && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-300">Open Questions</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-1" data-testid="open-questions">
                        {(selected.openQuestions as string[]).map((q: string, i: number) => <li key={i} className="text-sm text-gray-100 flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />{q}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : selected.processingStatus === "pending" ? (
              <div className="text-center py-16 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                <p>Click "Process Transcript" to analyze this meeting.</p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                <span className="ml-3 text-gray-400">{selected.processingStatus}...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Meeting Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white">New Meeting</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Meeting Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Q1 Planning Meeting" className="bg-gray-800 border-gray-700 mt-1" data-testid="input-meeting-title" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNew(false)} className="border-gray-700" data-testid="button-cancel-meeting">Cancel</Button>
              <Button onClick={() => createMeeting.mutate(newTitle)} disabled={!newTitle || createMeeting.isPending} data-testid="button-confirm-new-meeting">
                {createMeeting.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Meeting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={showProcess} onOpenChange={setShowProcess}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Process Meeting Transcript</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Paste transcript or meeting notes</Label>
              <Textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste the full meeting transcript here. The AI will extract summary, key points, decisions, and action items..." rows={10} className="bg-gray-800 border-gray-700 mt-1 font-mono text-sm" data-testid="input-transcript" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowProcess(false)} className="border-gray-700" data-testid="button-cancel-process">Cancel</Button>
              <Button onClick={() => processText.mutate({ meetingId: selected?.meetingId, transcript, title: selected?.aiSummary })} disabled={!transcript.trim() || processText.isPending} data-testid="button-process-transcript">
                {processText.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Video className="w-4 h-4 mr-2" />}Process Transcript
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
