import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import {
  Target, Play, Pause, Square, BarChart3, Brain, Clock,
  CheckCircle, AlertCircle, Sparkles, ChevronDown
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

interface FocusSession {
  id: number;
  userId: string;
  taskId?: number;
  title: string;
  plannedMinutes: number;
  actualMinutes?: number;
  startedAt: string;
  endedAt?: string;
  pausedMinutes?: number;
  status: string;
  notificationsPaused: boolean;
}

function FocusTimer({ session, onEnd }: { session: FocusSession; onEnd: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const start = new Date(session.startedAt).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000) - (session.pausedMinutes || 0) * 60);
    };

    updateElapsed();
    if (session.status === "active") {
      intervalRef.current = setInterval(updateElapsed, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session]);

  const togglePauseMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/focus/${session.id}/toggle-pause`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["focusActive"] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const endMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/focus/${session.id}/end`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusActive"] });
      queryClient.invalidateQueries({ queryKey: ["focusProductivity"] });
      toast({ title: "Focus session ended!", description: `Great work! You focused for ${Math.round(elapsed / 60)} minutes.` });
      onEnd();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const planned = session.plannedMinutes * 60;
  const progress = Math.min((elapsed / planned) * 100, 100);
  const isOver4Hours = elapsed > 4 * 60 * 60;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      {/* Active indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${session.status === "active" ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
          <span className="text-sm font-medium dark:text-gray-300">
            {session.status === "active" ? "Focus Active" : "Paused"}
          </span>
          {session.notificationsPaused && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
              Notifications paused
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{session.title}</span>
      </div>

      {/* Timer */}
      <div className="text-center py-4">
        <div className="text-5xl font-mono font-bold dark:text-gray-100 tabular-nums">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          of {session.plannedMinutes} min planned
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-gradient-to-r from-blue-500 to-purple-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 4-hour warning */}
      {isOver4Hours && (
        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-400">You've been focusing for 4+ hours. Take a break!</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <button
          data-testid="focus-toggle-pause"
          onClick={() => togglePauseMutation.mutate()}
          disabled={togglePauseMutation.isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium dark:text-gray-300"
        >
          {session.status === "active" ? (
            <><Pause className="w-4 h-4" /> Pause</>
          ) : (
            <><Play className="w-4 h-4" /> Resume</>
          )}
        </button>
        <button
          data-testid="focus-end-session"
          onClick={() => endMutation.mutate()}
          disabled={endMutation.isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium"
        >
          <Square className="w-4 h-4" />
          End Session
        </button>
      </div>
    </div>
  );
}

function StartFocusForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [plannedMinutes, setPlannedMinutes] = useState(25);

  const startMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/api/focus/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusActive"] });
      toast({ title: "Focus session started! Notifications are paused." });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">
        <h2 className="font-semibold text-base dark:text-gray-100 mb-4">Start Focus Session</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">
              What are you focusing on?
            </label>
            <input
              data-testid="focus-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Write project proposal"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">Duration</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[15, 25, 50, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPlannedMinutes(m)}
                  className={`py-2 text-xs rounded-lg transition-colors font-medium ${
                    plannedMinutes === m
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
            <input
              data-testid="focus-duration-input"
              type="number"
              min={5}
              max={480}
              value={plannedMinutes}
              onChange={(e) => setPlannedMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              data-testid="focus-start-submit"
              onClick={() => {
                if (!title.trim()) return;
                startMutation.mutate({ title: title.trim(), plannedMinutes });
              }}
              disabled={startMutation.isPending || !title.trim()}
              className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {startMutation.isPending ? "Starting..." : "Start Focus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FocusCoachPage() {
  const [showStartForm, setShowStartForm] = useState(false);
  const [coachingInsight, setCoachingInsight] = useState<string | null>(null);
  const [loadingCoaching, setLoadingCoaching] = useState(false);
  const { toast } = useToast();

  const activeSessionQuery = useQuery<FocusSession | null>({
    queryKey: ["focusActive"],
    queryFn: () => apiFetch("/api/focus/active"),
    refetchInterval: 5000,
  });

  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const productivityQuery = useQuery<any[]>({
    queryKey: ["focusProductivity", startDate, endDate],
    queryFn: () => apiFetch(`/api/focus/productivity?startDate=${startDate}&endDate=${endDate}`),
  });

  const scores = productivityQuery.data || [];
  const totalFocusMinutes = scores.reduce((s, r) => s + (r.focusMinutes || 0), 0);
  const totalSessions = scores.length;
  const avgFocusMin = totalSessions > 0 ? Math.round(totalFocusMinutes / totalSessions) : 0;

  const chartData = scores.slice(-14).map((s: any) => ({
    date: s.date?.slice(5) || "",
    focus: s.focusMinutes || 0,
    tasks: s.tasksCompleted || 0,
    habits: s.habitsCompleted || 0,
  }));

  const handleGetCoaching = async () => {
    setLoadingCoaching(true);
    try {
      const data = await apiFetch("/api/focus/coaching", { method: "POST" });
      setCoachingInsight(data.insight);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingCoaching(false);
    }
  };

  const activeSession = activeSessionQuery.data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold dark:text-gray-100">Focus Coach</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered focus & productivity</p>
            </div>
          </div>
          {!activeSession && (
            <button
              data-testid="start-focus-btn"
              onClick={() => setShowStartForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Play className="w-4 h-4" />
              Start Focus
            </button>
          )}
        </div>

        {/* Active session banner (unfinished session detection) */}
        {activeSessionQuery.isSuccess && !activeSession && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 text-center">
            <Target className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No active focus session. Start one to boost productivity!</p>
          </div>
        )}

        {/* Active focus timer */}
        {activeSession && (
          <div className="mb-6">
            <FocusTimer session={activeSession} onEnd={() => {}} />
          </div>
        )}

        {/* Stats overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold dark:text-gray-100">{totalFocusMinutes}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Focus Min</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold dark:text-gray-100">{totalSessions}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Days Tracked</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <BarChart3 className="w-4 h-4 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold dark:text-gray-100">{avgFocusMin}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg Focus/Day</p>
          </div>
        </div>

        {/* Focus chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <h2 className="text-sm font-semibold dark:text-gray-200 mb-4">Focus Minutes (Last 14 days)</h2>
          {chartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              No data yet. Complete focus sessions to see trends.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F9FAFB",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="focus" name="Focus min" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI Coaching */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-semibold dark:text-gray-200">AI Coaching</h2>
            </div>
            <button
              data-testid="get-coaching-btn"
              onClick={handleGetCoaching}
              disabled={loadingCoaching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loadingCoaching ? "animate-spin" : ""}`} />
              {loadingCoaching ? "Analyzing..." : "Get Coaching"}
            </button>
          </div>

          {!coachingInsight && !loadingCoaching && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {scores.length === 0
                ? "Track a few focus sessions to see your personalized coaching insights."
                : "Click 'Get Coaching' to receive AI-powered productivity tips based on your data."}
            </p>
          )}

          {loadingCoaching && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
              Analyzing your productivity patterns...
            </div>
          )}

          {coachingInsight && !loadingCoaching && (
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                  {coachingInsight}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Detailed analytics table */}
        {scores.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold dark:text-gray-200 mb-4">Productivity Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                    <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Focus</th>
                    <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Tasks</th>
                    <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Habits</th>
                    <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.slice(-10).reverse().map((s: any) => (
                    <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="py-2 text-gray-700 dark:text-gray-300">{s.date}</td>
                      <td className="py-2 text-right text-blue-600 dark:text-blue-400">{s.focusMinutes || 0}m</td>
                      <td className="py-2 text-right text-green-600 dark:text-green-400">{s.tasksCompleted || 0}</td>
                      <td className="py-2 text-right text-orange-600 dark:text-orange-400">{s.habitsCompleted || 0}</td>
                      <td className="py-2 text-right text-purple-600 dark:text-purple-400">
                        {s.productivityScore ? `${Math.round(s.productivityScore)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showStartForm && <StartFocusForm onClose={() => setShowStartForm(false)} />}
    </div>
  );
}
