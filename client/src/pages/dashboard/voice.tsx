import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, CheckSquare, FileText, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type VoiceNote = { id: number; audioUrl: string; transcript?: string; aiSummary?: string; status: string; durationSecs: number; convertedTo?: string; convertedId?: number; createdAt: string };

const STATUS_COLORS: Record<string, string> = { completed: "bg-green-500/20 text-green-400", transcribing: "bg-yellow-500/20 text-yellow-400", failed: "bg-red-500/20 text-red-400" };

export default function VoicePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [processing, setProcessing] = useState(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);

  const { data: notes = [], isLoading } = useQuery<VoiceNote[]>({
    queryKey: ["/api/voice/notes"],
  });

  const convertToTask = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/voice/${id}/convert-to-task`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/voice/notes"] }); toast({ title: "Task created from voice note!" }); setConvertingId(null); }
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        setProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          const res = await apiRequest("POST", "/api/voice/transcribe", { audioUrl: url });
          await res.json();
          qc.invalidateQueries({ queryKey: ["/api/voice/notes"] });
          toast({ title: "Voice note saved!" });
        } catch { toast({ title: "Failed to save voice note", variant: "destructive" }); }
        finally { setProcessing(false); stream.getTracks().forEach(t => t.stop()); }
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setMediaRecorder(null); }
    setRecording(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Mic className="w-7 h-7 text-pink-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Voice Notes & Commands</h1>
          <p className="text-sm text-gray-400">Record, transcribe and convert voice to tasks with AI</p>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-8 flex flex-col items-center gap-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${recording ? "bg-red-500/20 border-2 border-red-500 animate-pulse" : "bg-pink-500/10 border-2 border-pink-500/30"}`}>
            {recording ? <MicOff className="w-10 h-10 text-red-400" /> : <Mic className="w-10 h-10 text-pink-400" />}
          </div>
          <div className="text-center">
            <p className="text-white font-medium">{recording ? "Recording... Click to stop" : "Click to start recording"}</p>
            <p className="text-sm text-gray-400 mt-1">{processing ? "Processing your voice note..." : "Your voice will be transcribed and analyzed by AI"}</p>
          </div>
          <Button
            onClick={recording ? stopRecording : startRecording}
            disabled={processing}
            className={recording ? "bg-red-600 hover:bg-red-700" : "bg-pink-600 hover:bg-pink-700"}
            size="lg"
            data-testid="button-record"
          >
            {processing ? "Processing..." : recording ? <><MicOff className="w-4 h-4 mr-2" />Stop Recording</> : <><Mic className="w-4 h-4 mr-2" />Start Recording</>}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><FileText className="w-4 h-4 text-pink-400" />Voice Notes ({notes.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-gray-800/50 animate-pulse" />)}</div>
          ) : notes.length === 0 ? (
            <div className="py-8 text-center"><Mic className="w-10 h-10 text-gray-600 mx-auto mb-2" /><p className="text-gray-400">No voice notes yet. Record your first one above.</p></div>
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <div key={note.id} className="bg-gray-800/50 rounded-lg p-4 space-y-2" data-testid={`card-voice-note-${note.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[note.status] || "bg-gray-700 text-gray-300"} data-testid={`badge-status-${note.id}`}>{note.status}</Badge>
                        {note.convertedTo && <Badge className="bg-blue-500/20 text-blue-400">→ {note.convertedTo}</Badge>}
                        <span className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      {note.transcript && <p className="text-sm text-gray-300 mt-2"><span className="text-gray-500">Transcript: </span>{note.transcript}</p>}
                      {note.aiSummary && (
                        <div className="mt-2 bg-pink-900/20 rounded p-2">
                          <p className="text-xs text-pink-400 flex items-center gap-1 mb-1"><Sparkles className="w-3 h-3" />AI Summary</p>
                          <p className="text-sm text-gray-300">{note.aiSummary}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-3">
                      {note.status === "completed" && !note.convertedTo && (
                        <Button size="sm" variant="ghost" onClick={() => { setConvertingId(note.id); convertToTask.mutate(note.id); }} disabled={convertingId === note.id} className="text-xs text-blue-400 hover:bg-blue-900/20" data-testid={`button-convert-${note.id}`}><CheckSquare className="w-3 h-3 mr-1" />{convertingId === note.id ? "..." : "→ Task"}</Button>
                      )}
                      {note.audioUrl && note.audioUrl.startsWith("blob:") && (
                        <Button size="sm" variant="ghost" className="text-xs text-gray-400" data-testid={`button-play-${note.id}`}><Play className="w-3 h-3 mr-1" />Play</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
