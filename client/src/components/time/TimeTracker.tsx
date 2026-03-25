import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Timer, Play, Pause, Square, ChevronUp, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/context/WorkspaceContext";

interface TeamTask {
  id: number;
  title: string;
  status: string;
  projectId: number;
}

interface TimeEntry {
  id: number;
  minutes: number;
  date: string;
}

export function TimeTracker() {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();

  const today = new Date().toISOString().split("T")[0];

  const { data: allTasks = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks-all"],
    queryFn: () => fetch(`/api/team-tasks?status=In Progress`).then((r) => r.json()).then((d) => Array.isArray(d) ? d : []),
    enabled: expanded,
  });

  const { data: todayEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", today],
    queryFn: () => fetch(`/api/time-entries?dateFrom=${today}&dateTo=${today}`).then((r) => r.json()),
    enabled: expanded,
  });

  const createEntry = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/time-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({ title: "Time logged successfully" });
    },
    onError: () => toast({ title: "Failed to log time", variant: "destructive" }),
  });

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handlePlay = () => {
    if (paused) {
      setPaused(false);
    } else {
      setRunning(true);
      setElapsed(0);
    }
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const handlePause = () => {
    setPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    if (selectedTaskId && elapsed >= 60) {
      createEntry.mutate({
        taskId: parseInt(selectedTaskId),
        date: today,
        minutes,
        source: "timer",
      });
    }
    setRunning(false);
    setPaused(false);
    setElapsed(0);
  };

  const format = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const todayMinutes = todayEntries.reduce((sum, e) => sum + e.minutes, 0);
  const todayH = Math.floor(todayMinutes / 60);
  const todayM = todayMinutes % 60;

  const inProgressTasks = allTasks.filter((t) => t.status === "In Progress");

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      data-testid="time-tracker-widget"
    >
      {!expanded ? (
        <button
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          onClick={() => setExpanded(true)}
          data-testid="button-expand-tracker"
        >
          <Timer className="h-5 w-5" />
        </button>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-xl w-72 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Time Tracker</span>
            </div>
            <button onClick={() => setExpanded(false)} data-testid="button-collapse-tracker">
              <ChevronUp className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Task selector */}
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={running && !paused}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-task-timer">
                <SelectValue placeholder="Select task..." />
              </SelectTrigger>
              <SelectContent>
                {inProgressTasks.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)} className="text-xs">{t.title}</SelectItem>
                ))}
                {inProgressTasks.length === 0 && (
                  <SelectItem value="none" disabled className="text-xs text-muted-foreground">No In Progress tasks</SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Timer display */}
            <div className="text-center">
              <span
                className="font-mono text-3xl font-bold tracking-widest"
                style={{ fontVariantNumeric: "tabular-nums" }}
                data-testid="text-timer"
              >
                {format(elapsed)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              {(!running || paused) && (
                <button
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:opacity-90 disabled:opacity-50"
                  onClick={handlePlay}
                  disabled={!selectedTaskId || selectedTaskId === "none"}
                  data-testid="button-play-timer"
                >
                  <Play className="h-5 w-5 text-primary-foreground" />
                </button>
              )}
              {running && !paused && (
                <button
                  className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center justify-center hover:opacity-90"
                  onClick={handlePause}
                  data-testid="button-pause-timer"
                >
                  <Pause className="h-5 w-5" />
                </button>
              )}
              {(running || paused) && (
                <button
                  className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center hover:opacity-90"
                  onClick={handleStop}
                  data-testid="button-stop-timer"
                >
                  <Square className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Today summary */}
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground border-t border-border pt-2">
              <Clock className="h-3.5 w-3.5" />
              <span data-testid="text-today-summary">Today: {todayH}h {todayM}m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
