import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ClipboardList, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TimeReport } from "@/components/time/TimeReport";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface TeamTask {
  id: number;
  title: string;
  projectId: number;
}

interface TimeEntry {
  id: number;
  taskId: number;
  date: string;
  minutes: number;
}

interface Timesheet {
  id: number;
  weekStart: string;
  status: string;
  submittedAt?: string;
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getWeekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function parseTimeInput(val: string): number {
  if (!val) return 0;
  if (val.includes(":")) {
    const [h, m] = val.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  return Math.round(parseFloat(val) * 60);
}

function minutesToDisplay(minutes: number) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}:${String(m).padStart(2, "0")}` : `${h}:00`;
}

export default function TimesheetsPage() {
  const { workspaceId } = useWorkspace();
  const [weekDate, setWeekDate] = useState(new Date());
  const [editingCell, setEditingCell] = useState<{ taskId: number; date: string } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [activeTab, setActiveTab] = useState<"timesheet" | "report">("timesheet");
  const { toast } = useToast();

  const weekStart = getWeekStart(weekDate);
  const weekDates = getWeekDates(weekStart);

  const { data: tasks = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks-all-timesheets"],
    queryFn: () => fetch("/api/team-tasks?status=In Progress").then((r) => r.json()).then((d) => Array.isArray(d) ? d : []),
    enabled: !!workspaceId,
  });

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", weekStart],
    queryFn: () => fetch(`/api/time-entries?dateFrom=${weekDates[0]}&dateTo=${weekDates[6]}`).then((r) => r.json()),
  });

  const { data: timesheets = [] } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets", workspaceId],
    queryFn: () => fetch(`/api/timesheets?workspaceId=${workspaceId}`).then((r) => r.json()),
  });

  const currentTimesheet = timesheets.find((ts) => ts.weekStart === weekStart);
  const isSubmitted = currentTimesheet?.status === "submitted" || currentTimesheet?.status === "approved";

  const upsertEntry = useMutation({
    mutationFn: (data: { taskId: number; date: string; minutes: number }) => {
      const existing = timeEntries.find((e) => e.taskId === data.taskId && e.date === data.date);
      if (existing) {
        return apiRequest("PATCH", `/api/time-entries/${existing.id}`, { minutes: data.minutes });
      }
      return apiRequest("POST", "/api/time-entries", { ...data, source: "manual" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/time-entries", weekStart] }),
    onError: () => toast({ title: "Failed to save time", variant: "destructive" }),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (currentTimesheet) {
        return apiRequest("PATCH", `/api/timesheets/${currentTimesheet.id}`, { status: "submitted" });
      }
      const ts: Timesheet = await apiRequest("POST", "/api/timesheets", { workspaceId, weekStart });
      return apiRequest("PATCH", `/api/timesheets/${ts.id}`, { status: "submitted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets", workspaceId] });
      toast({ title: "Timesheet submitted" });
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  const getMinutes = (taskId: number, date: string) => {
    return timeEntries.find((e) => e.taskId === taskId && e.date === date)?.minutes ?? 0;
  };

  const taskRowTotal = (taskId: number) => weekDates.reduce((s, d) => s + getMinutes(taskId, d), 0);
  const dayTotal = (date: string) => tasks.reduce((s, t) => s + getMinutes(t.id, date), 0);
  const grandTotal = weekDates.reduce((s, d) => s + dayTotal(d), 0);

  const handleCellBlur = (taskId: number, date: string) => {
    const minutes = parseTimeInput(cellValue);
    if (minutes > 0) upsertEntry.mutate({ taskId, date, minutes });
    setEditingCell(null);
    setCellValue("");
  };

  const prevWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() - 7); setWeekDate(d); };
  const nextWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() + 7); setWeekDate(d); };

  const statusColor: Record<string, string> = {
    draft: "bg-gray-500/20 text-gray-400",
    submitted: "bg-blue-500/20 text-blue-400",
    approved: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="timesheets-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />Timesheets
          </h1>
          <p className="text-muted-foreground mt-0.5">Track and submit your weekly time</p>
        </div>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === "timesheet" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("timesheet")}
            data-testid="tab-timesheet"
          >
            Timesheet
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === "report" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("report")}
            data-testid="tab-report"
          >
            Report
          </button>
        </div>
      </div>

      {activeTab === "report" ? (
        <TimeReport workspaceId={workspaceId} />
      ) : (
        <>
          {/* Week selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={prevWeek} data-testid="button-prev-week"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {new Date(weekDates[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
                {new Date(weekDates[6]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <Button variant="ghost" size="icon" onClick={nextWeek} data-testid="button-next-week"><ChevronRight className="h-4 w-4" /></Button>
            </div>

            {currentTimesheet && (
              <Badge className={statusColor[currentTimesheet.status] ?? ""}>
                {currentTimesheet.status.toUpperCase()}
              </Badge>
            )}

            <Button
              size="sm"
              className="ml-auto gap-1"
              onClick={() => submitMutation.mutate()}
              disabled={isSubmitted || submitMutation.isPending}
              data-testid="button-submit-timesheet"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitted ? "Submitted" : "Submit Timesheet"}
            </Button>
          </div>

          {/* Grid */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-48">Task</th>
                    {weekDates.map((date, i) => (
                      <th key={date} className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground min-w-[80px]">
                        <div>{DAYS[i]}</div>
                        <div className="text-[10px] text-muted-foreground/60">
                          {new Date(date).getDate()}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-4 py-2 font-medium text-xs truncate max-w-[12rem]" data-testid={`task-name-${task.id}`}>
                        {task.title}
                      </td>
                      {weekDates.map((date) => {
                        const isEditing = editingCell?.taskId === task.id && editingCell?.date === date;
                        const mins = getMinutes(task.id, date);
                        return (
                          <td key={date} className="px-1 py-1 text-center">
                            {isEditing ? (
                              <Input
                                autoFocus
                                value={cellValue}
                                onChange={(e) => setCellValue(e.target.value)}
                                onBlur={() => handleCellBlur(task.id, date)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCellBlur(task.id, date);
                                  if (e.key === "Escape") { setEditingCell(null); setCellValue(""); }
                                }}
                                className="h-7 w-16 text-xs text-center px-1"
                                placeholder="1:30"
                                disabled={isSubmitted}
                                data-testid={`cell-${task.id}-${date}`}
                              />
                            ) : (
                              <div
                                className={`h-7 w-16 flex items-center justify-center text-xs rounded mx-auto cursor-pointer hover:bg-primary/10 transition-colors ${isSubmitted ? "cursor-not-allowed opacity-60" : ""} ${mins ? "text-primary font-medium" : "text-muted-foreground"}`}
                                onClick={() => {
                                  if (!isSubmitted) {
                                    setEditingCell({ taskId: task.id, date });
                                    setCellValue(minutesToDisplay(mins));
                                  }
                                }}
                                data-testid={`cell-display-${task.id}-${date}`}
                              >
                                {minutesToDisplay(mins) || "—"}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center text-xs font-medium">
                        {minutesToDisplay(taskRowTotal(task.id)) || "—"}
                      </td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        No In Progress tasks found. Start or assign tasks to log time.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20 font-medium">
                    <td className="px-4 py-2 text-xs text-muted-foreground">Daily Total</td>
                    {weekDates.map((date) => (
                      <td key={date} className="px-3 py-2 text-center text-xs">
                        {minutesToDisplay(dayTotal(date)) || "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-xs text-primary font-bold">
                      {minutesToDisplay(grandTotal) || "0:00"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Click any cell to edit. Format: <code>1:30</code> (hours:minutes) or <code>1.5</code> (decimal hours). Press Enter to save.
          </p>
        </>
      )}
    </div>
  );
}
