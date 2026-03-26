import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { cn } from "@/lib/utils";
import {
  X, MoreHorizontal, Flag, Clock, Calendar, User, Tag, AlignLeft,
  ChevronDown, Bell, RefreshCcw, Bookmark, Plus, Check, Pencil, Trash2,
  Copy, Play, Volume2, RotateCcw, ChevronRight, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Task = {
  id: number;
  title: string;
  description: string | null;
  date: string;
  completionPercentage: number | null;
  time: string | null;
  priority: string | null;
  status: string | null;
  duration: string | null;
  customDuration: string | null;
  schedule: any;
  notificationSettings: any;
  repeatSettings: any;
  flagged: boolean | null;
  reviewLater: boolean | null;
  assignedTo: string | null;
  executionScore: number | null;
  customFields: any;
};

type UserSchedule = {
  id: number;
  userId: string;
  name: string;
  emoji: string | null;
  startTime: string;
  endTime: string;
  preferredStartTime: string | null;
};

const PRIORITY_OPTS = [
  { label: "ASAP", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
  { label: "High", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  { label: "Low", color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
];

const DURATION_OPTS = ["15 min", "30 min", "1 hr", "2 hr", "3 hr", "4 hr", "6 hr", "8 hr", "10 hr", "12 hr", "14 hr", "16 hr", "Custom"];

const SCHEDULE_PRESETS = [
  { name: "Morning Focus", emoji: "☀️", startTime: "06:00", endTime: "10:00" },
  { name: "Office Hours", emoji: "💼", startTime: "09:00", endTime: "17:00" },
  { name: "Afternoon", emoji: "🌅", startTime: "12:00", endTime: "18:00" },
  { name: "Evening Wind-Down", emoji: "🌙", startTime: "18:00", endTime: "22:00" },
  { name: "Night Owl", emoji: "🦉", startTime: "21:00", endTime: "02:00" },
  { name: "All Day (24/7)", emoji: "🔄", startTime: "00:00", endTime: "23:59" },
];

const REMINDER_OPTS = [
  "At scheduled time", "5 min before", "15 min before",
  "30 min before", "1 hr before", "1 day before", "Custom"
];

const REPEAT_OPTS = [
  "No Repeat", "Every Day", "Once a Week", "Twice a Week",
  "Every 2 Weeks", "Once a Month", "Every 3 Months", "Custom Interval"
];

const SOUNDS = ["Gentle Chime", "Bell", "Digital Ping", "Soft Harp", "Alert Tone"];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const STATUS_OPTS = ["To Do", "In Progress", "Done"];

const QUICK_FIELDS = ["Priority", "Labels", "Summary", "Effort Score"];
const ALL_FIELD_TYPES = [
  { icon: "Aa", label: "Short Text" }, { icon: "¶", label: "Long Text" },
  { icon: "#", label: "Number" }, { icon: "◉", label: "Single Select" },
  { icon: "☑", label: "Multi Select" }, { icon: "▦", label: "Status Tracker" },
  { icon: "📅", label: "Date" }, { icon: "📅", label: "Date Range" },
  { icon: "👤", label: "Team Member" }, { icon: "📎", label: "Attachment" },
  { icon: "✓", label: "Toggle (Checkbox)" }, { icon: "🔗", label: "Link (URL)" },
  { icon: "@", label: "Email Address" }, { icon: "📞", label: "Phone Number" },
  { icon: "⭐", label: "Rating (1-5 stars)" }, { icon: "fx", label: "Calculated Field" },
  { icon: "🔁", label: "Linked Record" }, { icon: "🕐", label: "Auto Timestamp Created" },
  { icon: "🕐", label: "Auto Timestamp Updated" }, { icon: "👤", label: "Created By" },
  { icon: "👤", label: "Last Modified By" }, { icon: "📍", label: "Location" },
  { icon: "🆔", label: "Unique ID" }, { icon: "▶", label: "Action Button" },
];

function getPriorityStyle(p: string | null) {
  if (!p) return { label: "Click to set", color: "text-muted-foreground", bg: "hover:bg-white/5" };
  const opt = PRIORITY_OPTS.find(o => o.label === p);
  if (opt) return { label: p, color: opt.color, bg: opt.bg };
  return { label: p, color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" };
}

function PopoverWrap({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 z-[200] animate-in fade-in-0 slide-in-from-top-2 duration-200 min-w-[280px]">
      <div className="rounded-2xl border border-white/10 shadow-2xl" style={{ background: "rgba(30,32,40,0.98)", backdropFilter: "blur(20px)" }}>
        {children}
      </div>
    </div>
  );
}

function SchedulePopover({ value, onSave, onClose }: {
  value: any;
  onSave: (s: any) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: userSchedules = [] } = useQuery<UserSchedule[]>({
    queryKey: ["/api/user-schedules"],
  });
  const createScheduleMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/user-schedules", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user-schedules"] }),
  });

  const [selected, setSelected] = useState<string>(value?.preset || "");
  const [startTime, setStartTime] = useState(value?.startTime || "");
  const [endTime, setEndTime] = useState(value?.endTime || "");
  const [preferred, setPreferred] = useState(value?.preferredStartTime || "");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const allPresets = [
    ...SCHEDULE_PRESETS,
    ...userSchedules.map(s => ({ name: s.name, emoji: s.emoji || "⏰", startTime: s.startTime, endTime: s.endTime }))
  ];

  const selectPreset = (p: { name: string; emoji: string; startTime: string; endTime: string }) => {
    setSelected(p.name);
    setStartTime(p.startTime);
    setEndTime(p.endTime);
  };

  const handleSave = () => {
    onSave({ preset: selected, startTime, endTime, preferredStartTime: preferred });
    onClose();
  };

  return (
    <PopoverWrap onClose={onClose}>
      <div className="p-4 space-y-3 w-[360px]">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</p>
        <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
          {allPresets.map(p => (
            <button
              key={p.name}
              onClick={() => selectPreset(p)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left",
                selected === p.name
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "hover:bg-white/5 text-foreground"
              )}
            >
              <span className="text-base">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{p.startTime}–{p.endTime}</span>
              </div>
              {selected === p.name && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>

        {selected && (
          <div className="border-t border-white/10 pt-3 space-y-2">
            <p className="text-xs text-muted-foreground">Customize times</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Start</label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-8 text-xs bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">End</label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-8 text-xs bg-white/5 border-white/10" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Preferred start (optional)</label>
              <Input type="time" value={preferred} onChange={e => setPreferred(e.target.value)} className="h-8 text-xs bg-white/5 border-white/10" />
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-3">
          {creating ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Schedule name..."
                className="h-8 text-xs bg-white/5 border-white/10 flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter" && newName.trim() && startTime && endTime) {
                    createScheduleMut.mutate({ name: newName.trim(), emoji: "⏰", startTime, endTime });
                    setNewName(""); setCreating(false);
                  }
                }}
              />
              <Button size="sm" className="h-8" onClick={() => {
                if (newName.trim() && startTime && endTime) {
                  createScheduleMut.mutate({ name: newName.trim(), emoji: "⏰", startTime, endTime });
                  setNewName(""); setCreating(false);
                }
              }}>Save</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setCreating(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="w-3.5 h-3.5" /> Create Schedule
            </button>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} className="flex-1 h-8">Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => { onSave(null); onClose(); }} className="h-8 text-xs text-muted-foreground">Clear</Button>
        </div>
      </div>
    </PopoverWrap>
  );
}

function NotificationPopover({ value, onSave, onClose }: {
  value: any;
  onSave: (n: any) => void;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean>(value?.enabled ?? false);
  const [reminderTime, setReminderTime] = useState(value?.reminderTime || "15 min before");
  const [types, setTypes] = useState<string[]>(value?.types || ["Push Notification"]);
  const [sound, setSound] = useState(value?.sound || "Gentle Chime");
  const [repeatReminder, setRepeatReminder] = useState<boolean>(value?.repeatReminder ?? false);
  const [repeatInterval, setRepeatInterval] = useState(value?.repeatInterval || "5 min");

  const toggleType = (t: string) => setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = () => {
    onSave(enabled ? { enabled, reminderTime, types, sound: types.includes("Sound Alert") ? sound : undefined, repeatReminder, repeatInterval } : { enabled: false });
    onClose();
  };

  return (
    <PopoverWrap onClose={onClose}>
      <div className="p-4 space-y-3 w-[300px]">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notification</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Enable Reminder</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-3 border-t border-white/10 pt-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Reminder Time</label>
              <select value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none">
                {REMINDER_OPTS.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Notification Type</label>
              <div className="mt-1 space-y-1.5">
                {["Push Notification", "Sound Alert", "Email Reminder"].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)}
                      className="w-3.5 h-3.5 rounded accent-primary" />
                    <span className="text-sm">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {types.includes("Sound Alert") && (
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Sound</label>
                <div className="mt-1 space-y-1">
                  {SOUNDS.map(s => (
                    <button key={s} onClick={() => setSound(s)}
                      className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors",
                        sound === s ? "bg-primary/20 text-primary" : "hover:bg-white/5"
                      )}>
                      <span className="flex-1 text-left">{s}</span>
                      {sound === s && <Check className="w-3 h-3" />}
                      <Volume2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-sm">Repeat Reminder</span>
              <Switch checked={repeatReminder} onCheckedChange={setRepeatReminder} />
            </div>
            {repeatReminder && (
              <div className="flex gap-2 flex-wrap">
                {["5 min", "10 min", "15 min", "30 min"].map(i => (
                  <button key={i} onClick={() => setRepeatInterval(i)}
                    className={cn("px-2 py-1 rounded-lg text-xs border transition-colors",
                      repeatInterval === i ? "bg-primary/20 text-primary border-primary/40" : "border-white/10 hover:bg-white/5"
                    )}>{i}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <Button size="sm" onClick={handleSave} className="w-full h-8 mt-2">Save</Button>
      </div>
    </PopoverWrap>
  );
}

function RepeatPopover({ value, onSave, onClose }: {
  value: any;
  onSave: (r: any) => void;
  onClose: () => void;
}) {
  const [frequency, setFrequency] = useState(value?.frequency || "No Repeat");
  const [days, setDays] = useState<number[]>(value?.days || []);
  const [dayOfMonth, setDayOfMonth] = useState(value?.dayOfMonth || 1);
  const [endType, setEndType] = useState(value?.endType || "forever");
  const [endDate, setEndDate] = useState(value?.endDate || "");
  const [occurrences, setOccurrences] = useState(value?.occurrences || 10);

  const toggleDay = (i: number) => setDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);
  const showDays = ["Once a Week", "Twice a Week", "Every 2 Weeks"].includes(frequency);
  const showMonthDay = ["Once a Month", "Every 3 Months"].includes(frequency);

  const handleSave = () => {
    onSave({ frequency, days: showDays ? days : undefined, dayOfMonth: showMonthDay ? dayOfMonth : undefined, endType, endDate: endType === "date" ? endDate : undefined, occurrences: endType === "count" ? occurrences : undefined });
    onClose();
  };

  return (
    <PopoverWrap onClose={onClose}>
      <div className="p-4 space-y-3 w-[300px]">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repeat</p>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase">Frequency</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none">
            {REPEAT_OPTS.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
          </select>
        </div>

        {showDays && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-2">Repeat on</p>
            <div className="flex gap-2">
              {WEEKDAYS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={cn(
                    "w-9 h-9 rounded-full text-xs font-medium transition-all",
                    days.includes(i)
                      ? "bg-primary text-primary-foreground scale-105"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                  )}
                >{d}</button>
              ))}
            </div>
          </div>
        )}

        {showMonthDay && (
          <div>
            <label className="text-[10px] text-muted-foreground uppercase">Day of month</label>
            <select value={dayOfMonth} onChange={e => setDayOfMonth(parseInt(e.target.value))}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d} className="bg-zinc-900">Day {d}</option>
              ))}
            </select>
          </div>
        )}

        <div className="border-t border-white/10 pt-3">
          <p className="text-[10px] text-muted-foreground uppercase mb-2">End condition</p>
          <div className="space-y-2">
            {[["forever", "Repeat forever"], ["date", "Until a date"], ["count", "After occurrences"]].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={endType === v} onChange={() => setEndType(v)} className="accent-primary" />
                <span className="text-sm">{l}</span>
              </label>
            ))}
          </div>
          {endType === "date" && (
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="mt-2 h-8 text-xs bg-white/5 border-white/10" />
          )}
          {endType === "count" && (
            <div className="flex items-center gap-2 mt-2">
              <Input type="number" min={1} value={occurrences} onChange={e => setOccurrences(parseInt(e.target.value))}
                className="h-8 text-xs bg-white/5 border-white/10 w-20" />
              <span className="text-xs text-muted-foreground">times</span>
            </div>
          )}
        </div>

        <Button size="sm" onClick={handleSave} className="w-full h-8">Save</Button>
      </div>
    </PopoverWrap>
  );
}

function AddFieldPopover({ onAdd, onClose }: { onAdd: (fieldName: string, type: string) => void; onClose: () => void }) {
  const [namingType, setNamingType] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState("");

  return (
    <PopoverWrap onClose={onClose}>
      <div className="p-4 w-[320px] space-y-3">
        {namingType ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Name this field</p>
            <Input autoFocus value={fieldName} onChange={e => setFieldName(e.target.value)}
              placeholder={namingType}
              className="h-8 text-sm bg-white/5 border-white/10"
              onKeyDown={e => { if (e.key === "Enter" && fieldName.trim()) { onAdd(fieldName.trim(), namingType); onClose(); } }}
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8" onClick={() => { if (fieldName.trim()) { onAdd(fieldName.trim(), namingType); onClose(); } }}>Add Field</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setNamingType(null)}><X className="w-3 h-3" /></Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick add</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_FIELDS.map(f => (
                <button key={f} onClick={() => setNamingType(f)}
                  className="text-left px-3 py-2 rounded-lg text-sm hover:bg-white/8 transition-colors border border-white/8">
                  {f}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">All field types</p>
            <div className="max-h-[200px] overflow-y-auto space-y-0.5 pr-1">
              {ALL_FIELD_TYPES.map(f => (
                <button key={f.label} onClick={() => setNamingType(f.label)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 transition-colors text-left">
                  <span className="text-muted-foreground font-mono text-xs w-5 text-center">{f.icon}</span>
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </PopoverWrap>
  );
}

interface DailyTaskPanelProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export function DailyTaskPanel({ task, onClose, onUpdate, onDelete, onDuplicate }: DailyTaskPanelProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [notes, setNotes] = useState(task.description || "");
  const [body, setBody] = useState("");
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [customPriority, setCustomPriority] = useState("");
  const [addingCustomPriority, setAddingCustomPriority] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [customFields, setCustomFields] = useState<{ name: string; type: string; value: string }[]>(() => {
    const cf = task.customFields as any;
    if (Array.isArray(cf)) return cf;
    return [];
  });
  const [durationCustom, setDurationCustom] = useState(task.customDuration || "");
  const [showDurationInput, setShowDurationInput] = useState(task.duration === "Custom");

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  const saveTitle = () => {
    if (title.trim() && title.trim() !== task.title) {
      onUpdate({ title: title.trim() });
    }
    setEditingTitle(false);
  };

  const [savedCustomPriorities, setSavedCustomPriorities] = useState<string[]>([]);

  const priorityStyle = getPriorityStyle(task.priority);

  const scheduleLabel = () => {
    const s = task.schedule as any;
    if (!s) return "Click to set";
    if (s.preset) return `${s.preset} (${s.startTime}–${s.endTime})`;
    return `${s.startTime}–${s.endTime}`;
  };

  const notifLabel = () => {
    const n = task.notificationSettings as any;
    if (!n?.enabled) return "Off";
    return `🔔 ${n.reminderTime}`;
  };

  const repeatLabel = () => {
    const r = task.repeatSettings as any;
    if (!r || r.frequency === "No Repeat") return "None";
    if (r.frequency === "Once a Week" && r.days?.length) {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `📅 ${r.days.map((d: number) => dayNames[d]).join(", ")}`;
    }
    return `📅 ${r.frequency}`;
  };

  const durationLabel = () => {
    if (!task.duration) return "Click to set";
    if (task.duration === "Custom") return task.customDuration || "Custom";
    return task.duration;
  };

  const handleAddCustomField = (fieldName: string, type: string) => {
    const updated = [...customFields, { name: fieldName, type, value: "" }];
    setCustomFields(updated);
    onUpdate({ customFields: updated });
  };

  const priorityBg = task.priority === "ASAP" ? "bg-red-500/15 border-red-500/30 text-red-400"
    : task.priority === "High" ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
    : task.priority === "Medium" ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400"
    : task.priority === "Low" ? "bg-green-500/15 border-green-500/30 text-green-400"
    : task.priority ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
    : "";

  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full z-[100] flex flex-col shadow-2xl"
        style={{
          width: "min(520px, 100vw)",
          background: "linear-gradient(160deg, rgba(18,18,24,0.99) 0%, rgba(22,24,32,0.99) 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          animation: "slideInRight 0.25s ease-out",
        }}
      >
        <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/7 shrink-0">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitle(task.title); setEditingTitle(false); } }}
                className="w-full text-lg font-bold bg-transparent border-b border-primary outline-none py-0.5"
              />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="text-lg font-bold text-left w-full hover:text-primary transition-colors line-clamp-1">
                {task.title}
              </button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
              <DropdownMenuItem onClick={() => onDuplicate?.()} className="gap-2"><Copy className="w-3.5 h-3.5" />Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-400 focus:text-red-400"><Trash2 className="w-3.5 h-3.5" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Properties */}
          <div className="px-5 py-4 space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">Properties</p>

            {/* Priority / Category */}
            <div className="relative">
              <PropertyRow
                label="Priority"
                icon={<Tag className="w-3.5 h-3.5" />}
                onClick={() => setOpenPopover(openPopover === "priority" ? null : "priority")}
              >
                {task.priority ? (
                  <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium border", priorityBg)}>
                    {task.priority}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">Click to set</span>
                )}
              </PropertyRow>
              {openPopover === "priority" && (
                <PopoverWrap onClose={() => setOpenPopover(null)}>
                  <div className="p-4 w-[240px] space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</p>
                    {PRIORITY_OPTS.map(o => (
                      <button key={o.label} onClick={() => { onUpdate({ priority: o.label }); setOpenPopover(null); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all",
                          task.priority === o.label ? `${o.bg} border` : "hover:bg-white/5"
                        )}>
                        <span className={cn("font-semibold", o.color)}>{o.label}</span>
                        {task.priority === o.label && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                    {savedCustomPriorities.map(p => (
                      <button key={p} onClick={() => { onUpdate({ priority: p }); setOpenPopover(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-white/5">
                        <span className="text-purple-400 font-semibold">{p}</span>
                        {task.priority === p && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                    {addingCustomPriority ? (
                      <div className="flex gap-1">
                        <Input autoFocus value={customPriority} onChange={e => setCustomPriority(e.target.value)}
                          placeholder="Label name..." className="h-7 text-xs bg-white/5 border-white/10 flex-1"
                          onKeyDown={e => {
                            if (e.key === "Enter" && customPriority.trim()) {
                              setSavedCustomPriorities(p => [...p, customPriority.trim()]);
                              onUpdate({ priority: customPriority.trim() });
                              setCustomPriority(""); setAddingCustomPriority(false); setOpenPopover(null);
                            }
                          }}
                        />
                        <Button size="sm" className="h-7 px-2" onClick={() => {
                          if (customPriority.trim()) {
                            setSavedCustomPriorities(p => [...p, customPriority.trim()]);
                            onUpdate({ priority: customPriority.trim() });
                            setCustomPriority(""); setAddingCustomPriority(false); setOpenPopover(null);
                          }
                        }}>Ok</Button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingCustomPriority(true)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3">
                        <Plus className="w-3 h-3" /> Custom...
                      </button>
                    )}
                  </div>
                </PopoverWrap>
              )}
            </div>

            {/* Due Date */}
            <PropertyRow label="Due Date" icon={<Calendar className="w-3.5 h-3.5" />}>
              <input
                type="date"
                value={task.date}
                onChange={e => onUpdate({ date: e.target.value })}
                className="bg-transparent text-xs text-foreground outline-none cursor-pointer hover:text-primary transition-colors"
              />
            </PropertyRow>

            {/* Assigned To */}
            <PropertyRow label="Assigned To" icon={<User className="w-3.5 h-3.5" />}>
              <input
                type="text"
                value={task.assignedTo || ""}
                onChange={e => onUpdate({ assignedTo: e.target.value })}
                placeholder="Click to set"
                className="bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50 hover:text-primary transition-colors text-right"
              />
            </PropertyRow>

            {/* Progress / Status */}
            <div className="relative">
              <PropertyRow label="Progress" icon={<ChevronRight className="w-3.5 h-3.5" />}
                onClick={() => setOpenPopover(openPopover === "status" ? null : "status")}>
                <span className={cn("text-xs font-medium", task.status === "Done" ? "text-green-400" : task.status === "In Progress" ? "text-blue-400" : "text-muted-foreground")}>
                  {task.status || "To Do"}
                </span>
              </PropertyRow>
              {openPopover === "status" && (
                <PopoverWrap onClose={() => setOpenPopover(null)}>
                  <div className="p-3 w-[200px] space-y-1">
                    {STATUS_OPTS.map(s => (
                      <button key={s} onClick={() => { onUpdate({ status: s }); setOpenPopover(null); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors",
                          task.status === s ? "bg-primary/20 text-primary" : "hover:bg-white/5"
                        )}>
                        {s}
                        {task.status === s && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </PopoverWrap>
              )}
            </div>

            {/* Duration */}
            <div className="relative">
              <PropertyRow label="Duration" icon={<Clock className="w-3.5 h-3.5" />}
                onClick={() => setOpenPopover(openPopover === "duration" ? null : "duration")}>
                <span className="text-xs text-foreground">{durationLabel()}</span>
              </PropertyRow>
              {openPopover === "duration" && (
                <PopoverWrap onClose={() => setOpenPopover(null)}>
                  <div className="p-3 w-[220px] space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Duration</p>
                    <div className="max-h-[220px] overflow-y-auto space-y-0.5">
                      {DURATION_OPTS.map(d => (
                        <button key={d} onClick={() => {
                          onUpdate({ duration: d });
                          setShowDurationInput(d === "Custom");
                          if (d !== "Custom") setOpenPopover(null);
                        }}
                          className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors",
                            task.duration === d ? "bg-primary/20 text-primary" : "hover:bg-white/5"
                          )}>
                          {d}
                          {task.duration === d && <Check className="w-3 h-3 ml-auto" />}
                        </button>
                      ))}
                    </div>
                    {(showDurationInput || task.duration === "Custom") && (
                      <div className="pt-2 border-t border-white/10">
                        <Input value={durationCustom} onChange={e => setDurationCustom(e.target.value)}
                          placeholder="e.g. 45 min" className="h-8 text-xs bg-white/5 border-white/10"
                          onBlur={() => { onUpdate({ customDuration: durationCustom }); setOpenPopover(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { onUpdate({ customDuration: durationCustom }); setOpenPopover(null); } }}
                        />
                      </div>
                    )}
                  </div>
                </PopoverWrap>
              )}
            </div>

            {/* Schedule */}
            <div className="relative">
              <PropertyRow label="Schedule" icon={<Calendar className="w-3.5 h-3.5" />}
                onClick={() => setOpenPopover(openPopover === "schedule" ? null : "schedule")}>
                <span className="text-xs text-foreground truncate max-w-[180px]">{scheduleLabel()}</span>
              </PropertyRow>
              {openPopover === "schedule" && (
                <SchedulePopover
                  value={task.schedule}
                  onSave={s => onUpdate({ schedule: s })}
                  onClose={() => setOpenPopover(null)}
                />
              )}
            </div>

            {/* Notification */}
            <div className="relative">
              <PropertyRow label="Notification" icon={<Bell className="w-3.5 h-3.5" />}
                onClick={() => setOpenPopover(openPopover === "notification" ? null : "notification")}>
                <span className="text-xs text-foreground">{notifLabel()}</span>
              </PropertyRow>
              {openPopover === "notification" && (
                <NotificationPopover
                  value={task.notificationSettings}
                  onSave={n => onUpdate({ notificationSettings: n })}
                  onClose={() => setOpenPopover(null)}
                />
              )}
            </div>

            {/* Repeat */}
            <div className="relative">
              <PropertyRow label="Repeat" icon={<RefreshCcw className="w-3.5 h-3.5" />}
                onClick={() => setOpenPopover(openPopover === "repeat" ? null : "repeat")}>
                <span className="text-xs text-foreground">{repeatLabel()}</span>
              </PropertyRow>
              {openPopover === "repeat" && (
                <RepeatPopover
                  value={task.repeatSettings}
                  onSave={r => onUpdate({ repeatSettings: r })}
                  onClose={() => setOpenPopover(null)}
                />
              )}
            </div>

            {/* Flagged */}
            <PropertyRow label="Flagged" icon={<Flag className="w-3.5 h-3.5" />}>
              <button onClick={() => onUpdate({ flagged: !task.flagged })}
                className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  task.flagged ? "bg-red-500 border-red-500" : "border-white/20 hover:border-white/40"
                )}>
                {task.flagged && <Check className="w-3 h-3 text-white" />}
              </button>
            </PropertyRow>

            {/* Review Later */}
            <PropertyRow label="Review Later" icon={<Bookmark className="w-3.5 h-3.5" />}>
              <button onClick={() => onUpdate({ reviewLater: !task.reviewLater })}
                className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  task.reviewLater ? "bg-primary border-primary" : "border-white/20 hover:border-white/40"
                )}>
                {task.reviewLater && <Check className="w-3 h-3 text-white" />}
              </button>
            </PropertyRow>

            {/* Execution Score */}
            <div className="py-2 px-3 rounded-xl hover:bg-white/3 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Star className="w-3.5 h-3.5" />
                  <span className="text-xs">Execution Score</span>
                </div>
                <span className="text-xs font-bold text-primary">{task.executionScore ?? 0}/10</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <button key={i} onClick={() => onUpdate({ executionScore: i })}
                    className={cn(
                      "flex-1 h-6 rounded text-[10px] font-medium transition-all",
                      (task.executionScore ?? 0) === i
                        ? "bg-primary text-primary-foreground scale-105"
                        : "bg-white/8 hover:bg-white/15 text-muted-foreground"
                    )}
                  >{i}</button>
                ))}
              </div>
            </div>

            {/* Custom fields */}
            {customFields.map((f, idx) => (
              <PropertyRow key={idx} label={f.name} icon={<AlignLeft className="w-3.5 h-3.5" />}>
                <input
                  type="text"
                  value={f.value}
                  onChange={e => {
                    const updated = customFields.map((cf, i) => i === idx ? { ...cf, value: e.target.value } : cf);
                    setCustomFields(updated);
                    onUpdate({ customFields: updated });
                  }}
                  placeholder="Empty"
                  className="bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50 text-right"
                />
              </PropertyRow>
            ))}

            {/* Add field button */}
            <div className="relative pt-2">
              <button onClick={() => setShowAddField(!showAddField)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                <Plus className="w-3.5 h-3.5" /> Add a field
              </button>
              {showAddField && (
                <AddFieldPopover onAdd={handleAddCustomField} onClose={() => setShowAddField(false)} />
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/7 mx-5" />

          {/* Notes */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">Notes</p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => { if (notes !== (task.description || "")) onUpdate({ description: notes }); }}
              placeholder="Write a note or leave a comment..."
              className="bg-white/3 border-white/8 text-sm resize-none min-h-[80px] rounded-xl"
            />
          </div>

          {/* Body / Description */}
          <div className="px-5 pb-8">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">Details</p>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Start writing..."
              className="bg-transparent border-none text-sm resize-none min-h-[120px] placeholder:text-muted-foreground/30 focus-visible:ring-0 p-0"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function PropertyRow({ label, icon, children, onClick }: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group", onClick ? "cursor-pointer hover:bg-white/5" : "hover:bg-white/3")}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 text-muted-foreground/70 w-[130px] shrink-0">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex-1 flex items-center justify-end">
        {children}
      </div>
    </div>
  );
}
