import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ImagePlus,
  X,
  Plus,
  Search,
  Trash2,
  ScanText,
  Loader2,
  ClipboardPaste,
  Grid3X3,
  List,
  CalendarDays,
} from "lucide-react";

type DayType = {
  name: string;
  emoji: string;
  category: string;
  isCustom: boolean;
  id?: number;
  usageCount: number;
};

type JournalEntry = {
  id: number;
  userId: string;
  date: string;
  dayTypeId: number | null;
  customDayName: string | null;
  emoji: string | null;
  journalText: string | null;
  imageUrls: string[] | null;
  extractedText: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ViewMode = "daily" | "weekly" | "monthly" | "yearly";

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
function formatMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function DayTypeSelector({
  dayTypes,
  selectedName,
  onSelect,
  onCreateCustom,
  onDeleteCustom,
  onEditCustom,
  onEditBuiltinEmoji,
}: {
  dayTypes: DayType[];
  selectedName: string | null;
  onSelect: (dt: DayType) => void;
  onCreateCustom: (name: string, emoji: string) => void;
  onDeleteCustom: (id: number) => void;
  onEditCustom: (id: number, emoji: string) => void;
  onEditBuiltinEmoji: (dayTypeName: string, emoji: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📝");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editEmoji, setEditEmoji] = useState("");

  const grouped = useMemo(() => {
    const filtered = search
      ? dayTypes.filter(dt => dt.name.toLowerCase().includes(search.toLowerCase()))
      : dayTypes;
    const frequentlyUsed = filtered.filter(dt => dt.usageCount > 0).slice(0, 8);
    const byCategory = new Map<string, DayType[]>();
    filtered.forEach(dt => {
      const cat = dt.category || "Other";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(dt);
    });
    return { frequentlyUsed, byCategory };
  }, [dayTypes, search]);

  return (
    <div className="space-y-3" data-testid="day-type-selector">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search day types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white/5 border-white/10"
          data-testid="input-search-day-types"
        />
      </div>

      {grouped.frequentlyUsed.length > 0 && !search && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Frequently Used</p>
          <div className="flex flex-wrap gap-1.5">
            {grouped.frequentlyUsed.map(dt => (
              <button
                key={dt.name}
                onClick={() => onSelect(dt)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all border",
                  selectedName === dt.name
                    ? "bg-primary/20 border-primary/50 text-primary-foreground"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
                data-testid={`button-daytype-freq-${dt.name.replace(/\s+/g, "-")}`}
              >
                <span>{dt.emoji}</span>
                <span>{dt.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {Array.from(grouped.byCategory.entries()).map(([category, types]) => (
        <div key={category}>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">{category}</p>
          <div className="flex flex-wrap gap-1.5">
            {types.map(dt => (
              <button
                key={dt.name}
                onClick={() => onSelect(dt)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all border group relative",
                  selectedName === dt.name
                    ? "bg-primary/20 border-primary/50 text-primary-foreground"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
                data-testid={`button-daytype-${dt.name.replace(/\s+/g, "-")}`}
              >
                {editingKey === dt.name ? (
                  <span onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                      className="w-10 h-6 text-center p-0 bg-white/10 border-white/20 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (dt.isCustom && dt.id) onEditCustom(dt.id, editEmoji);
                          else onEditBuiltinEmoji(dt.name, editEmoji);
                          setEditingKey(null);
                        }
                      }}
                      onBlur={() => {
                        if (dt.isCustom && dt.id) onEditCustom(dt.id, editEmoji);
                        else onEditBuiltinEmoji(dt.name, editEmoji);
                        setEditingKey(null);
                      }}
                      autoFocus
                      data-testid={`input-edit-emoji-${dt.name.replace(/\s+/g, "-")}`}
                    />
                  </span>
                ) : (
                  <span
                    onClick={(e) => { e.stopPropagation(); setEditingKey(dt.name); setEditEmoji(dt.emoji); }}
                    className="cursor-pointer hover:scale-125 transition-transform"
                    title="Click to change emoji"
                  >{dt.emoji}</span>
                )}
                <span>{dt.name}</span>
                {dt.isCustom && dt.id && (
                  <span
                    onClick={(e) => { e.stopPropagation(); onDeleteCustom(dt.id!); }}
                    className="hidden group-hover:flex ml-1 w-4 h-4 items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/40"
                  >
                    <X className="w-2.5 h-2.5 text-red-400" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {showCreate ? (
        <div className="flex gap-2 items-end bg-white/5 rounded-lg p-3 border border-white/10">
          <Input
            placeholder="Emoji"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            className="w-16 bg-white/5 border-white/10"
            data-testid="input-custom-emoji"
          />
          <Input
            placeholder="Custom day type name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-white/5 border-white/10"
            data-testid="input-custom-daytype-name"
          />
          <Button
            size="sm"
            onClick={() => { if (newName.trim()) { onCreateCustom(newName.trim(), newEmoji); setNewName(""); setNewEmoji("📝"); setShowCreate(false); } }}
            data-testid="button-save-custom-daytype"
          >
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)} data-testid="button-cancel-custom-daytype">
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowCreate(true)} data-testid="button-create-custom-daytype">
          <Plus className="w-4 h-4 mr-1" /> Create Custom Day Type
        </Button>
      )}
    </div>
  );
}

function DailyEditor({
  selectedDate,
  entry,
  dayTypes,
  onSave,
  onCreateCustomDayType,
  onDeleteCustomDayType,
  onEditCustomDayType,
  onEditBuiltinEmoji,
  isSaving,
}: {
  selectedDate: Date;
  entry: JournalEntry | null;
  dayTypes: DayType[];
  onSave: (data: any) => void;
  onCreateCustomDayType: (name: string, emoji: string) => void;
  onDeleteCustomDayType: (id: number) => void;
  onEditCustomDayType: (id: number, emoji: string) => void;
  onEditBuiltinEmoji: (dayTypeName: string, emoji: string) => void;
  isSaving: boolean;
}) {
  const [journalText, setJournalText] = useState(entry?.journalText || "");
  const [selectedDayType, setSelectedDayType] = useState<string | null>(entry?.customDayName || null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(entry?.emoji || null);
  const [imageUrls, setImageUrls] = useState<string[]>(entry?.imageUrls || []);
  const [extractedText, setExtractedText] = useState(entry?.extractedText || "");
  const [showDayTypes, setShowDayTypes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOcring, setIsOcring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const dateStr = formatDate(selectedDate);
  const isToday = formatDate(new Date()) === dateStr;

  const handleImageUpload = useCallback(async (file: File) => {
    if (imageUrls.length >= 10) {
      toast({ title: "Maximum 10 images allowed", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setImageUrls(prev => [...prev, url]);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [toast, imageUrls.length]);

  const handleOcr = useCallback(async (imageUrl: string) => {
    setIsOcring(true);
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const formData = new FormData();
      formData.append("image", blob, "image.png");
      const res = await fetch("/api/ocr", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("OCR failed");
      const { text } = await res.json();
      if (text) {
        setExtractedText(prev => (prev ? prev + "\n\n" : "") + text);
        toast({ title: "Text extracted successfully" });
      } else {
        toast({ title: "No text found in image", variant: "destructive" });
      }
    } catch {
      toast({ title: "OCR failed", variant: "destructive" });
    } finally {
      setIsOcring(false);
    }
  }, [toast]);

  const handleSave = () => {
    onSave({
      date: dateStr,
      dayTypeName: selectedDayType,
      customDayName: selectedDayType,
      emoji: selectedEmoji,
      journalText,
      imageUrls,
      extractedText: extractedText || null,
    });
  };

  const handleSelectDayType = (dt: DayType) => {
    setSelectedDayType(dt.name);
    setSelectedEmoji(dt.emoji);
  };

  return (
    <div className="flex flex-col gap-6 h-full flex-1" data-testid="daily-editor">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold" data-testid="text-journal-date">
            {isToday ? "Today" : selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h3>
          {selectedDayType && (
            <p className="text-base text-muted-foreground mt-1" data-testid="text-selected-daytype">
              {selectedEmoji} {selectedDayType}
            </p>
          )}
        </div>
        <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-journal">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Entry
        </Button>
      </div>

      <div>
        <button
          onClick={() => setShowDayTypes(v => !v)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left",
            selectedDayType
              ? "bg-primary/10 border-primary/30"
              : "bg-white/5 border-white/10 hover:bg-white/8"
          )}
          data-testid="button-toggle-daytype"
        >
          <div className="flex items-center gap-2">
            {selectedDayType ? (
              <>
                <span className="text-lg">{selectedEmoji}</span>
                <span className="text-sm font-medium">{selectedDayType}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">How was your day? Tap to select...</span>
            )}
          </div>
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showDayTypes && "rotate-90")} />
        </button>
        {showDayTypes && (
          <div className="mt-3 p-4 rounded-lg border border-white/10 bg-white/[0.02]">
            <DayTypeSelector
              dayTypes={dayTypes}
              selectedName={selectedDayType}
              onSelect={(dt) => { handleSelectDayType(dt); setShowDayTypes(false); }}
              onCreateCustom={onCreateCustomDayType}
              onDeleteCustom={onDeleteCustomDayType}
              onEditCustom={onEditCustomDayType}
              onEditBuiltinEmoji={onEditBuiltinEmoji}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <p className="text-sm font-medium mb-2 text-muted-foreground">Journal Entry</p>
        <Textarea
          placeholder="Write about your day..."
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
          className="flex-1 min-h-[300px] bg-white/5 border-white/10 resize-y"
          data-testid="textarea-journal"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">Images ({imageUrls.length}/10, max 5MB each)</p>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
              data-testid="input-image-upload"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading || imageUrls.length >= 10} data-testid="button-upload-image">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ImagePlus className="w-4 h-4 mr-1" />}
              Add Image
            </Button>
          </div>
        </div>
        {imageUrls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
                <img src={url} alt="" className="w-full h-32 object-cover" />
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOcr(url)}
                    className="p-1.5 rounded-md bg-black/70 hover:bg-black/90 text-white"
                    title="Extract text (AI Vision)"
                    disabled={isOcring}
                    data-testid={`button-ocr-${i}`}
                  >
                    {isOcring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanText className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                    className="p-1.5 rounded-md bg-black/70 hover:bg-red-500/70 text-white"
                    data-testid={`button-remove-image-${i}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {extractedText && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Extracted Text (AI Vision)</p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setJournalText(prev => (prev ? prev + "\n\n" : "") + extractedText);
                  toast({ title: "Text pasted into journal" });
                }}
                data-testid="button-paste-ocr"
              >
                <ClipboardPaste className="w-3.5 h-3.5 mr-1" />
                Paste into Journal
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setExtractedText("")} data-testid="button-clear-ocr">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm whitespace-pre-wrap" data-testid="text-extracted-ocr">
            {extractedText}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyCalendar({
  currentMonth,
  entries,
  selectedDate,
  onSelectDate,
}: {
  currentMonth: Date;
  entries: JournalEntry[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const entryMap = new Map(entries.map(e => [e.date, e]));
  const todayStr = formatDate(new Date());
  const selectedStr = formatDate(selectedDate);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const entry = entryMap.get(dateStr);
    const isSelected = dateStr === selectedStr;
    const isToday = dateStr === todayStr;
    cells.push(
      <button
        key={d}
        onClick={() => onSelectDate(new Date(year, month, d))}
        className={cn(
          "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative border",
          isSelected ? "bg-primary/20 border-primary/50 ring-1 ring-primary/30" : "border-transparent hover:bg-white/5",
          isToday && !isSelected && "border-white/20",
        )}
        data-testid={`button-calendar-day-${d}`}
      >
        <span className={cn("text-xs", isToday ? "font-bold text-primary" : "")}>{d}</span>
        {entry?.emoji && <span className="text-xs mt-0.5">{entry.emoji}</span>}
      </button>
    );
  }

  return (
    <div data-testid="monthly-calendar">
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells}
      </div>
    </div>
  );
}

function MonthlyListView({ entries, onSelectDate }: { entries: JournalEntry[]; onSelectDate: (d: Date) => void }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No entries this month</p>;
  return (
    <div className="space-y-2" data-testid="monthly-list-view">
      {entries.map(entry => {
        const d = parseDate(entry.date);
        return (
          <button
            key={entry.id}
            onClick={() => onSelectDate(d)}
            className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            data-testid={`button-entry-${entry.date}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{entry.emoji || "📝"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                <p className="text-xs text-muted-foreground">{entry.customDayName || "No day type"}</p>
              </div>
              {entry.journalText && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.journalText}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function YearlyGrid({ entries, year, onSelectDate }: { entries: JournalEntry[]; year: number; onSelectDate: (d: Date) => void }) {
  const entryMap = new Map(entries.map(e => [e.date, e]));
  return (
    <div className="space-y-4" data-testid="yearly-grid">
      {Array.from({ length: 12 }, (_, monthIdx) => {
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        return (
          <div key={monthIdx}>
            <p className="text-xs text-muted-foreground mb-1 font-medium">{MONTH_NAMES[monthIdx]}</p>
            <div className="flex flex-wrap gap-0.5">
              {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                const dateStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(dayIdx + 1).padStart(2, "0")}`;
                const entry = entryMap.get(dateStr);
                return (
                  <button
                    key={dayIdx}
                    onClick={() => onSelectDate(new Date(year, monthIdx, dayIdx + 1))}
                    className={cn(
                      "w-5 h-5 rounded-sm flex items-center justify-center text-[9px] transition-all",
                      entry ? "bg-primary/20 hover:bg-primary/30" : "bg-white/5 hover:bg-white/10"
                    )}
                    title={`${MONTH_NAMES[monthIdx]} ${dayIdx + 1}: ${entry?.customDayName || "No entry"}`}
                    data-testid={`button-year-day-${dateStr}`}
                  >
                    {entry?.emoji || ""}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeeklyStrip({
  selectedDate,
  entries,
  onSelectDate,
}: {
  selectedDate: Date;
  entries: JournalEntry[];
  onSelectDate: (d: Date) => void;
}) {
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const entryMap = new Map(entries.map(e => [e.date, e]));
  const todayStr = formatDate(new Date());
  const selectedStr = formatDate(selectedDate);

  return (
    <div className="flex gap-1" data-testid="weekly-strip">
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        const dateStr = formatDate(d);
        const entry = entryMap.get(dateStr);
        const isSelected = dateStr === selectedStr;
        const isToday = dateStr === todayStr;
        return (
          <button
            key={i}
            onClick={() => onSelectDate(d)}
            className={cn(
              "flex-1 flex flex-col items-center py-2 rounded-lg border transition-all",
              isSelected ? "bg-primary/20 border-primary/50" : "border-transparent hover:bg-white/5",
              isToday && !isSelected && "border-white/20",
            )}
            data-testid={`button-week-day-${i}`}
          >
            <span className="text-[10px] text-muted-foreground">{DAY_NAMES_SHORT[i]}</span>
            <span className={cn("text-sm", isToday ? "font-bold text-primary" : "")}>{d.getDate()}</span>
            {entry?.emoji && <span className="text-sm mt-0.5">{entry.emoji}</span>}
            {entry?.customDayName && <span className="text-[8px] text-muted-foreground mt-0.5 leading-tight text-center line-clamp-2 max-w-full px-0.5">{entry.customDayName}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const { toast } = useToast();

  const monthKey = formatMonthKey(selectedDate);
  const yearNum = selectedDate.getFullYear();
  const dateStr = formatDate(selectedDate);

  const { data: dayTypes = [] } = useQuery<DayType[]>({ queryKey: ["/api/day-types"] });
  const { data: currentEntry } = useQuery<JournalEntry | null>({ queryKey: [`/api/journal?date=${dateStr}`] });
  const { data: monthEntries = [] } = useQuery<JournalEntry[]>({ queryKey: [`/api/journal?month=${monthKey}`] });
  const { data: yearEntries = [] } = useQuery<JournalEntry[]>({
    queryKey: [`/api/journal?year=${yearNum}`],
    enabled: viewMode === "yearly",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/journal", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => typeof query.queryKey[0] === "string" && (query.queryKey[0] as string).startsWith("/api/journal") });
      queryClient.invalidateQueries({ queryKey: ["/api/day-types"] });
      toast({ title: "Journal entry saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const createCustomDayType = useMutation({
    mutationFn: async ({ name, emoji }: { name: string; emoji: string }) => {
      const res = await apiRequest("POST", "/api/day-types/custom", { name, emoji });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/day-types"] });
      toast({ title: "Custom day type created" });
    },
  });

  const deleteCustomDayType = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/day-types/custom/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/day-types"] });
    },
  });

  const editCustomDayType = useMutation({
    mutationFn: async ({ id, emoji }: { id: number; emoji: string }) => {
      if (!emoji.trim()) throw new Error("Emoji cannot be empty");
      const res = await apiRequest("PATCH", `/api/day-types/custom/${id}`, { emoji: emoji.trim() });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/day-types"] });
      toast({ title: "Day type updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const editBuiltinEmoji = useMutation({
    mutationFn: async ({ dayTypeName, emoji }: { dayTypeName: string; emoji: string }) => {
      if (!emoji.trim()) throw new Error("Emoji cannot be empty");
      const res = await apiRequest("PATCH", "/api/day-types/emoji-override", { dayTypeName, emoji: emoji.trim() });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/day-types"] });
      toast({ title: "Emoji updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update emoji", description: err.message, variant: "destructive" });
    },
  });

  const navigateMonth = (dir: number) => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };
  const navigateDay = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };
  const goToday = () => setSelectedDate(new Date());

  return (
    <div className="p-4 md:p-6 space-y-6 w-full" data-testid="journal-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-journal-title">Journal</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your daily experiences and feelings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg border border-white/10 p-0.5">
            {(
              [
                { mode: "daily" as ViewMode, icon: CalendarIcon, label: "Day" },
                { mode: "weekly" as ViewMode, icon: CalendarDays, label: "Week" },
                { mode: "monthly" as ViewMode, icon: List, label: "Month" },
                { mode: "yearly" as ViewMode, icon: Grid3X3, label: "Year" },
              ] as const
            ).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                  viewMode === mode ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
                )}
                data-testid={`button-view-${mode}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => viewMode === "yearly" ? setSelectedDate(new Date(yearNum - 1, 0, 1)) : viewMode === "daily" || viewMode === "weekly" ? navigateDay(-1) : navigateMonth(-1)} data-testid="button-prev">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[150px] text-center" data-testid="text-current-period">
            {viewMode === "yearly"
              ? yearNum
              : viewMode === "monthly"
              ? `${MONTH_NAMES[selectedDate.getMonth()]} ${yearNum}`
              : selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => viewMode === "yearly" ? setSelectedDate(new Date(yearNum + 1, 0, 1)) : viewMode === "daily" || viewMode === "weekly" ? navigateDay(1) : navigateMonth(1)} data-testid="button-next">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday} data-testid="button-today">
          Today
        </Button>
      </div>

      {viewMode === "daily" && (
        <div className="bg-card rounded-xl border border-white/10 p-6 min-h-[calc(100vh-280px)] flex flex-col">
          <DailyEditor
            key={dateStr}
            selectedDate={selectedDate}
            entry={currentEntry || null}
            dayTypes={dayTypes}
            onSave={(data) => saveMutation.mutate(data)}
            onCreateCustomDayType={(name, emoji) => createCustomDayType.mutate({ name, emoji })}
            onDeleteCustomDayType={(id) => deleteCustomDayType.mutate(id)}
            onEditCustomDayType={(id, emoji) => editCustomDayType.mutate({ id, emoji })}
            onEditBuiltinEmoji={(dayTypeName, emoji) => editBuiltinEmoji.mutate({ dayTypeName, emoji })}
            isSaving={saveMutation.isPending}
          />
        </div>
      )}

      {viewMode === "weekly" && (
        <div className="space-y-4">
          <WeeklyStrip selectedDate={selectedDate} entries={monthEntries} onSelectDate={(d) => setSelectedDate(d)} />
          <div className="bg-card rounded-xl border border-white/10 p-6 min-h-[calc(100vh-360px)] flex flex-col">
            <DailyEditor
              key={dateStr}
              selectedDate={selectedDate}
              entry={currentEntry || null}
              dayTypes={dayTypes}
              onSave={(data) => saveMutation.mutate(data)}
              onCreateCustomDayType={(name, emoji) => createCustomDayType.mutate({ name, emoji })}
              onDeleteCustomDayType={(id) => deleteCustomDayType.mutate(id)}
              onEditCustomDayType={(id, emoji) => editCustomDayType.mutate({ id, emoji })}
              onEditBuiltinEmoji={(dayTypeName, emoji) => editBuiltinEmoji.mutate({ dayTypeName, emoji })}
              isSaving={saveMutation.isPending}
            />
          </div>
        </div>
      )}

      {viewMode === "monthly" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="bg-card rounded-xl border border-white/10 p-4">
            <MonthlyCalendar
              currentMonth={selectedDate}
              entries={monthEntries}
              selectedDate={selectedDate}
              onSelectDate={(d) => { setSelectedDate(d); setViewMode("daily"); }}
            />
          </div>
          <div className="bg-card rounded-xl border border-white/10 p-4">
            <MonthlyListView entries={monthEntries} onSelectDate={(d) => { setSelectedDate(d); setViewMode("daily"); }} />
          </div>
        </div>
      )}

      {viewMode === "yearly" && (
        <div className="bg-card rounded-xl border border-white/10 p-6">
          <YearlyGrid entries={yearEntries} year={yearNum} onSelectDate={(d) => { setSelectedDate(d); setViewMode("daily"); }} />
        </div>
      )}
    </div>
  );
}
