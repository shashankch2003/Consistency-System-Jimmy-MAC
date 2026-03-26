import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  useTaskBankItems, useCreateTaskBankItem, useUpdateTaskBankItem,
  useDeleteTaskBankItem, useAssignTaskBankItem, useParseVoice
} from "@/hooks/use-task-bank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, CalendarPlus, Mic, MicOff, X, Check, Flag,
  Clock, Calendar, Tag, AlignLeft, Loader2, ChevronRight,
  Zap, Edit2, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type BankItem = {
  id: number;
  title: string;
  description: string | null;
  priority: string | null;
  tags: string[] | null;
  status: string | null;
  dueDate: string | null;
  dueTime: string | null;
  workingOn: string | null;
  createdAt: Date | null;
};

type ParsedTask = {
  title: string;
  dueDate?: string;
  dueTime?: string;
  priority?: string;
  description?: string;
  duration?: string;
  tags?: string[];
};

const PRIORITIES = ["ASAP", "High", "Medium", "Low"] as const;
const STATUSES = ["Not started", "Working on", "Next Day Recap", "Sunday Recap", "1 Month", "Done"];

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    ASAP: "bg-red-500/20 text-red-400 border-red-500/30",
    High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Low: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", map[priority] || "bg-white/10 text-foreground/60 border-white/10")}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Not started": "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    "Working on": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Next Day Recap": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "Sunday Recap": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    "1 Month": "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "Done": "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", map[status] || "bg-white/10 text-foreground/60 border-white/10")}>
      {status}
    </span>
  );
}

function TaskDetailPanel({
  item, onClose, onUpdate, onDelete, onAssign
}: {
  item: BankItem;
  onClose: () => void;
  onUpdate: (updates: Partial<BankItem>) => void;
  onDelete: () => void;
  onAssign: (date: string) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [priority, setPriority] = useState(item.priority || "");
  const [status, setStatus] = useState(item.status || "Not started");
  const [dueDate, setDueDate] = useState(item.dueDate || "");
  const [dueTime, setDueTime] = useState(item.dueTime || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [workingOn, setWorkingOn] = useState(item.workingOn || "");
  const [assignDate, setAssignDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showAssign, setShowAssign] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const save = (field: string, value: any) => onUpdate({ [field]: value } as any);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    save("tags", next);
  };

  const removeTag = (t: string) => {
    const next = tags.filter(x => x !== t);
    setTags(next);
    save("tags", next);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" />
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-white/10 z-50 flex flex-col shadow-2xl"
        data-testid="task-bank-detail-panel"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Task Details</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid="button-panel-delete">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7" data-testid="button-panel-close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title.trim() !== item.title) save("title", title.trim()); }}
            className="w-full bg-transparent text-xl font-semibold outline-none border-b border-transparent focus:border-white/20 pb-1 transition-colors"
            data-testid="input-panel-title"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Flag className="w-3 h-3" /> Priority</label>
              <select
                value={priority}
                onChange={e => { setPriority(e.target.value); save("priority", e.target.value); }}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none"
                data-testid="select-panel-priority"
              >
                <option value="">No priority</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Zap className="w-3 h-3" /> Status</label>
              <select
                value={status}
                onChange={e => { setStatus(e.target.value); save("status", e.target.value); }}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none"
                data-testid="select-panel-status"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => { setDueDate(e.target.value); save("dueDate", e.target.value); }}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none"
                data-testid="input-panel-due-date"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Due Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={e => { setDueTime(e.target.value); save("dueTime", e.target.value); }}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none"
                data-testid="input-panel-due-time"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Tag className="w-3 h-3" /> Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                  {t}
                  <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-foreground" data-testid={`button-remove-tag-${t}`}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add tag..."
                className="flex-1 h-8 text-xs bg-zinc-900 border-white/10"
                data-testid="input-panel-tag"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addTag} data-testid="button-add-tag">Add</Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5"><AlignLeft className="w-3 h-3" /> Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => save("description", description)}
              placeholder="Add notes, context, or details..."
              rows={4}
              className="bg-zinc-900 border-white/10 text-sm resize-none"
              data-testid="textarea-panel-description"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Working on</label>
            <Input
              value={workingOn}
              onChange={e => setWorkingOn(e.target.value)}
              onBlur={() => save("workingOn", workingOn)}
              placeholder="e.g. Next sunday, 1 Month..."
              className="h-8 text-xs bg-zinc-900 border-white/10"
              data-testid="input-panel-working-on"
            />
          </div>

          <div className="border-t border-white/8 pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Assign to Daily Tasks</p>
            {!showAssign ? (
              <Button
                variant="outline"
                className="w-full gap-2 text-sm"
                onClick={() => setShowAssign(true)}
                data-testid="button-show-assign"
              >
                <CalendarPlus className="w-4 h-4" />
                Move to a Day
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={assignDate}
                  onChange={e => setAssignDate(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none"
                  data-testid="input-panel-assign-date"
                />
                <Button size="sm" onClick={() => { onAssign(assignDate); }} data-testid="button-panel-confirm-assign">Move</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAssign(false)} data-testid="button-panel-cancel-assign">Cancel</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function VoiceCapturePanel({
  onClose, onAddTasks
}: {
  onClose: () => void;
  onAddTasks: (tasks: ParsedTask[]) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [phase, setPhase] = useState<"idle" | "recording" | "parsing" | "review">("idle");
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const recognitionRef = useRef<any>(null);
  const parseVoice = useParseVoice();
  const { toast } = useToast();

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const startRecording = () => {
    if (!SpeechRecognition) {
      toast({ title: "Not supported", description: "Your browser doesn't support voice recognition. Try Chrome." });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    let finalTranscript = "";
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim = event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
      if (finalTranscript.toLowerCase().includes("that's all") || finalTranscript.toLowerCase().includes("thats all")) {
        recognition.stop();
      }
    };
    recognition.onerror = () => {
      setIsRecording(false);
      setPhase("idle");
    };
    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        setTranscript(finalTranscript.trim());
        setPhase("parsing");
        parseVoice.mutate(finalTranscript.trim(), {
          onSuccess: (data) => {
            setParsedTasks(data.tasks.map(t => ({ ...t })));
            setPhase("review");
          },
          onError: () => {
            toast({ title: "Parse failed", description: "Could not extract tasks. Try again." });
            setPhase("idle");
          }
        });
      } else {
        setPhase("idle");
      }
    };
    recognition.start();
    setIsRecording(true);
    setPhase("recording");
    setTranscript("");
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const parseManual = () => {
    if (!transcript.trim()) return;
    setPhase("parsing");
    parseVoice.mutate(transcript.trim(), {
      onSuccess: (data) => {
        setParsedTasks(data.tasks);
        setPhase("review");
      },
      onError: () => {
        toast({ title: "Parse failed", description: "Could not extract tasks." });
        setPhase("idle");
      }
    });
  };

  const updateTask = (i: number, updates: Partial<ParsedTask>) => {
    setParsedTasks(prev => prev.map((t, idx) => idx === i ? { ...t, ...updates } : t));
  };

  const removeTask = (i: number) => {
    setParsedTasks(prev => prev.filter((_, idx) => idx !== i));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-zinc-950 border border-white/10 rounded-t-2xl z-50 shadow-2xl" data-testid="voice-capture-panel">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Voice Capture</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} data-testid="button-voice-close"><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-5 space-y-4">
          {(phase === "idle" || phase === "recording") && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                {phase === "idle"
                  ? 'Speak naturally about your tasks. Say "That\'s all" to finish.'
                  : 'Listening... speak naturally about your tasks'}
              </p>

              {phase === "recording" && (
                <div className="flex items-center justify-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="text-xs text-red-400 font-medium">Recording</span>
                </div>
              )}

              {transcript && (
                <div className="bg-white/5 rounded-xl p-3 min-h-[80px] text-sm text-foreground/80 leading-relaxed border border-white/8" data-testid="text-live-transcript">
                  {transcript}
                  {phase === "recording" && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />}
                </div>
              )}

              <Textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Or type your tasks here..."
                rows={3}
                className="bg-zinc-900 border-white/10 text-sm resize-none"
                data-testid="textarea-voice-input"
              />

              <div className="flex gap-2">
                {phase === "idle" ? (
                  <Button onClick={startRecording} className="flex-1 gap-2" data-testid="button-start-recording">
                    <Mic className="w-4 h-4" /> Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive" className="flex-1 gap-2" data-testid="button-stop-recording">
                    <MicOff className="w-4 h-4" /> Stop Recording
                  </Button>
                )}
                {transcript.trim() && phase === "idle" && (
                  <Button onClick={parseManual} variant="outline" className="gap-2" data-testid="button-parse-manual">
                    <Zap className="w-4 h-4" /> Parse
                  </Button>
                )}
              </div>
            </>
          )}

          {phase === "parsing" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is extracting your tasks...</p>
            </div>
          )}

          {phase === "review" && (
            <>
              <p className="text-sm font-medium">{parsedTasks.length} task{parsedTasks.length !== 1 ? "s" : ""} detected — review before adding</p>
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {parsedTasks.map((task, i) => (
                  <div key={i} className="bg-zinc-900 rounded-xl p-3 border border-white/8 space-y-2" data-testid={`parsed-task-${i}`}>
                    <div className="flex items-start gap-2">
                      <Input
                        value={task.title}
                        onChange={e => updateTask(i, { title: e.target.value })}
                        className="flex-1 h-8 text-sm bg-zinc-800 border-white/10"
                        data-testid={`input-parsed-title-${i}`}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-400 hover:text-red-300" onClick={() => removeTask(i)} data-testid={`button-remove-parsed-${i}`}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <select
                        value={task.priority || ""}
                        onChange={e => updateTask(i, { priority: e.target.value || undefined })}
                        className="col-span-1 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none"
                        data-testid={`select-parsed-priority-${i}`}
                      >
                        <option value="">Priority</option>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input
                        type="date"
                        value={task.dueDate || ""}
                        onChange={e => updateTask(i, { dueDate: e.target.value || undefined })}
                        className="col-span-1 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none"
                        data-testid={`input-parsed-date-${i}`}
                      />
                      <input
                        type="time"
                        value={task.dueTime || ""}
                        onChange={e => updateTask(i, { dueTime: e.target.value || undefined })}
                        className="col-span-1 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none"
                        data-testid={`input-parsed-time-${i}`}
                      />
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    )}
                    {task.duration && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {task.duration}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 gap-2"
                  disabled={parsedTasks.length === 0}
                  onClick={() => { onAddTasks(parsedTasks); onClose(); }}
                  data-testid="button-add-parsed-tasks"
                >
                  <Check className="w-4 h-4" /> Add {parsedTasks.length} Task{parsedTasks.length !== 1 ? "s" : ""}
                </Button>
                <Button variant="outline" onClick={() => setPhase("idle")} data-testid="button-voice-back">
                  Back
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function TaskBankPage() {
  const [newTitle, setNewTitle] = useState("");
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BankItem | null>(null);
  const [showVoice, setShowVoice] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignDate, setAssignDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading } = useTaskBankItems();
  const createItem = useCreateTaskBankItem();
  const updateItem = useUpdateTaskBankItem();
  const deleteItem = useDeleteTaskBankItem();
  const assignItem = useAssignTaskBankItem();
  const { toast } = useToast();

  useEffect(() => {
    if (isAddingInline) inlineInputRef.current?.focus();
  }, [isAddingInline]);

  const handleAdd = () => {
    if (!newTitle.trim()) { setIsAddingInline(false); return; }
    createItem.mutate({ title: newTitle.trim() }, {
      onSuccess: () => {
        setNewTitle("");
        setIsAddingInline(false);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") { setNewTitle(""); setIsAddingInline(false); }
  };

  const handleAssign = (id: number, date: string) => {
    assignItem.mutate({ id, date }, {
      onSuccess: () => {
        setAssigningId(null);
        if (selectedItem?.id === id) setSelectedItem(null);
        toast({ title: "Task moved", description: `Added to ${format(new Date(date + "T00:00:00"), "MMMM d, yyyy")}` });
      },
    });
  };

  const handleUpdate = (id: number, updates: Partial<BankItem>) => {
    updateItem.mutate({ id, ...updates as any }, {
      onSuccess: (updated) => {
        if (selectedItem?.id === id) setSelectedItem(updated as any);
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteItem.mutate(id, {
      onSuccess: () => {
        if (selectedItem?.id === id) setSelectedItem(null);
      }
    });
  };

  const handleVoiceAdd = (parsedTasks: ParsedTask[]) => {
    parsedTasks.forEach(task => {
      createItem.mutate({
        title: task.title,
        priority: task.priority,
        description: task.description,
        tags: task.tags,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
      });
    });
    toast({ title: `${parsedTasks.length} task${parsedTasks.length !== 1 ? "s" : ""} added`, description: "Tasks captured from your voice" });
  };

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-6 sm:space-y-8 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-task-bank-title">Add Task</h1>
          <p className="text-muted-foreground mt-1 text-sm">Capture ideas instantly. Assign them to a day when ready.</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-white/15 h-9"
            onClick={() => setShowVoice(true)}
            data-testid="button-open-voice"
          >
            <Mic className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Voice Capture</span>
          </Button>
          <Button
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setIsAddingInline(true)}
            data-testid="button-add-task-bank"
            title="Add task"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isAddingInline && (
        <div className="bg-card/60 border border-primary/40 rounded-xl p-3 flex items-center gap-3 animate-in slide-in-from-top-2 duration-150" data-testid="inline-add-row">
          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <input
            ref={inlineInputRef}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Task title... (Enter to save, Esc to cancel)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            data-testid="input-inline-task-title"
          />
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={handleAdd}
              disabled={!newTitle.trim() || createItem.isPending}
              data-testid="button-inline-save"
            >
              {createItem.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setNewTitle(""); setIsAddingInline(false); }} data-testid="button-inline-cancel">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/60 gap-4" data-testid="text-task-bank-empty">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <Plus className="w-8 h-8 opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-foreground/60">No tasks yet</p>
            <p className="text-sm mt-1">Click + or use Voice Capture to add tasks</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5" data-testid="task-bank-list">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group flex items-start gap-3 rounded-xl px-4 py-3 border transition-all cursor-pointer",
                "bg-card/40 border-border/50 hover:border-border hover:bg-card/70",
                selectedItem?.id === item.id && "border-primary/40 bg-primary/5"
              )}
              onClick={() => setSelectedItem(item as BankItem)}
              data-testid={`row-task-bank-${item.id}`}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium leading-snug" data-testid={`text-task-bank-title-${item.id}`}>{item.title}</p>
                  {item.priority && <PriorityBadge priority={item.priority} />}
                  {item.status && item.status !== "Not started" && <StatusBadge status={item.status} />}
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                    <AlignLeft className="w-3 h-3 shrink-0" />
                    {item.description}
                  </p>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  {item.dueDate && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {format(new Date(item.dueDate + "T00:00:00"), "MMM d")}
                      {item.dueTime && ` at ${item.dueTime}`}
                    </span>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {item.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] bg-white/8 px-1.5 py-0.5 rounded-full text-muted-foreground">{t}</span>
                      ))}
                      {item.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => { setAssigningId(item.id); setAssignDate(format(new Date(), "yyyy-MM-dd")); }}
                  title="Assign to a day"
                  data-testid={`button-assign-${item.id}`}
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-400"
                  onClick={() => handleDelete(item.id)}
                  title="Delete"
                  data-testid={`button-delete-task-bank-${item.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
            </div>
          ))}
        </div>
      )}

      {assigningId !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setAssigningId(null)} />
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-950 border border-white/15 rounded-2xl p-5 z-50 shadow-2xl space-y-4" data-testid="assign-dialog">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Move to Daily Tasks</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAssigningId(null)} data-testid="button-close-assign"><X className="w-4 h-4" /></Button>
            </div>
            <input
              type="date"
              value={assignDate}
              onChange={e => setAssignDate(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
              data-testid="input-assign-date"
            />
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => handleAssign(assigningId, assignDate)}
                disabled={assignItem.isPending}
                data-testid="button-confirm-assign"
              >
                {assignItem.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                Move to {format(new Date(assignDate + "T00:00:00"), "MMM d")}
              </Button>
              <Button variant="outline" onClick={() => setAssigningId(null)} data-testid="button-cancel-assign">Cancel</Button>
            </div>
          </div>
        </>
      )}

      {selectedItem && (
        <TaskDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={(updates) => handleUpdate(selectedItem.id, updates)}
          onDelete={() => handleDelete(selectedItem.id)}
          onAssign={(date) => handleAssign(selectedItem.id, date)}
        />
      )}

      {showVoice && (
        <VoiceCapturePanel
          onClose={() => setShowVoice(false)}
          onAddTasks={handleVoiceAdd}
        />
      )}

      {items && items.length > 0 && (
        <p className="text-xs text-muted-foreground/40 text-center pb-4">
          {items.length} task{items.length !== 1 ? "s" : ""} in your task bank
        </p>
      )}
    </div>
  );
}
