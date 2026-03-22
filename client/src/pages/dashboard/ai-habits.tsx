import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Flame, Plus, Trash2, Check, X, Edit2, Zap, ChevronDown, ChevronUp, Activity
} from "lucide-react";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

interface Habit {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  durationMinutes: number;
  frequency: string;
  customDays?: number[];
  preferredTimeRange?: { earliest: string; latest: string };
  priority: string;
  isFlexible: boolean;
  isProtected: boolean;
  streakCurrent: number;
  streakLongest: number;
  isActive: boolean;
  completions: Array<{ id: number; date: string }>;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-500 dark:text-red-400",
  medium: "text-yellow-500 dark:text-yellow-400",
  low: "text-blue-500 dark:text-blue-400",
};

const FREQ_LABEL: Record<string, string> = {
  daily: "Every day",
  weekdays: "Weekdays only",
  custom: "Custom days",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function HabitCard({ habit, today }: { habit: Habit; today: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const completedToday = habit.completions.some(
    (c) => String(c.date).split("T")[0] === today
  );

  const completeMutation = useMutation({
    mutationFn: (date: string) =>
      apiFetch(`/api/habits/${habit.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["aiHabits"] });
      toast({
        title: completedToday ? "Already completed!" : `Habit completed! 🔥 Streak: ${data.streak} days`,
      });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const uncompleteMutation = useMutation({
    mutationFn: (date: string) =>
      apiFetch(`/api/habits/${habit.id}/uncomplete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiHabits"] });
      toast({ title: "Habit unchecked" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/habits/${habit.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiHabits"] });
      toast({ title: "Habit removed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  return (
    <div
      data-testid={`habit-card-${habit.id}`}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            data-testid={`habit-toggle-${habit.id}`}
            onClick={() =>
              completedToday
                ? uncompleteMutation.mutate(today)
                : completeMutation.mutate(today)
            }
            disabled={completeMutation.isPending || uncompleteMutation.isPending}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              completedToday
                ? "bg-green-500 border-green-500 text-white"
                : "border-gray-300 dark:border-gray-600 hover:border-green-400"
            }`}
          >
            {completedToday ? <Check className="w-4 h-4" /> : null}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm dark:text-gray-100 truncate">{habit.name}</span>
              <span className={`text-xs font-medium ${PRIORITY_COLORS[habit.priority] || ""}`}>
                {habit.priority}
              </span>
              {habit.isProtected && (
                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Protected</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{habit.durationMinutes} min</span>
              <span>{FREQ_LABEL[habit.frequency] || habit.frequency}</span>
            </div>
            {/* 7-day streak grid */}
            <div className="flex items-center gap-1 mt-2">
              {last7Days.map((day) => {
                const done = habit.completions.some((c) => String(c.date).split("T")[0] === day);
                return (
                  <div
                    key={day}
                    title={day}
                    className={`w-5 h-5 rounded-sm ${done ? "bg-green-500" : "bg-gray-100 dark:bg-gray-700"}`}
                  />
                );
              })}
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">last 7d</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="text-center">
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-sm font-bold">{habit.streakCurrent}</span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">streak</p>
            </div>
            <button
              data-testid={`habit-expand-${habit.id}`}
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <button
              data-testid={`habit-delete-${habit.id}`}
              onClick={() => deleteMutation.mutate()}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Streak</p>
              <p className="text-xl font-bold text-orange-500">{habit.streakCurrent}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">days</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Longest Streak</p>
              <p className="text-xl font-bold text-purple-500">{habit.streakLongest}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">days</p>
            </div>
            {habit.preferredTimeRange && (
              <div className="col-span-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preferred Time</p>
                <p className="text-sm dark:text-gray-200">
                  {(habit.preferredTimeRange as any).earliest} – {(habit.preferredTimeRange as any).latest}
                </p>
              </div>
            )}
            {habit.frequency === "custom" && habit.customDays && (
              <div className="col-span-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Active Days</p>
                <div className="flex gap-1">
                  {DAY_NAMES.map((d, i) => (
                    <span
                      key={d}
                      className={`text-xs px-1.5 py-1 rounded ${
                        habit.customDays?.includes(i)
                          ? "bg-purple-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateHabitForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [frequency, setFrequency] = useState("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [priority, setPriority] = useState("medium");
  const [isProtected, setIsProtected] = useState(false);
  const [earliestTime, setEarliestTime] = useState("07:00");
  const [latestTime, setLatestTime] = useState("09:00");

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiHabits"] });
      toast({ title: "Habit created!" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (frequency === "custom" && customDays.length === 0) {
      toast({ title: "Select at least one day", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      durationMinutes,
      frequency,
      customDays: frequency === "custom" ? customDays : undefined,
      preferredTimeRange: { earliest: earliestTime, latest: latestTime },
      priority,
      isProtected,
      isFlexible: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-base dark:text-gray-100">Create Habit</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">Habit Name *</label>
            <input
              data-testid="habit-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Deep Work 2h daily"'
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">Duration (min)</label>
              <input
                data-testid="habit-duration-input"
                type="number"
                min={5}
                max={480}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">Priority</label>
              <select
                data-testid="habit-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">Frequency</label>
            <select
              data-testid="habit-frequency-select"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="daily">Every day</option>
              <option value="weekdays">Weekdays only</option>
              <option value="custom">Custom days</option>
            </select>
          </div>

          {frequency === "custom" && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">Active Days</label>
              <div className="flex gap-1">
                {DAY_NAMES.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 py-1.5 text-xs rounded font-medium transition-colors ${
                      customDays.includes(i)
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">Preferred Time Window</label>
            <div className="flex items-center gap-2">
              <input
                data-testid="habit-earliest-time"
                type="time"
                value={earliestTime}
                onChange={(e) => setEarliestTime(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                data-testid="habit-latest-time"
                type="time"
                value={latestTime}
                onChange={(e) => setLatestTime(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              data-testid="habit-protected-checkbox"
              type="checkbox"
              id="isProtected"
              checked={isProtected}
              onChange={(e) => setIsProtected(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600"
            />
            <label htmlFor="isProtected" className="text-sm dark:text-gray-300 cursor-pointer">
              Protected (never skip or reschedule)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              data-testid="habit-create-submit"
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
            >
              {createMutation.isPending ? "Creating..." : "Create Habit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AiHabitsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const habitsQuery = useQuery<Habit[]>({
    queryKey: ["aiHabits"],
    queryFn: () => apiFetch("/api/habits"),
    refetchInterval: 30000,
  });

  const habits = habitsQuery.data || [];
  const todayCompleted = habits.filter((h) =>
    h.completions.some((c) => String(c.date).split("T")[0] === today)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold dark:text-gray-100">AI Habits</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {todayCompleted}/{habits.length} completed today
              </p>
            </div>
          </div>
          <button
            data-testid="create-habit-btn"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Habit
          </button>
        </div>

        {/* Today's progress bar */}
        {habits.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold dark:text-gray-200">Today's Progress</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{todayCompleted}/{habits.length}</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all"
                style={{ width: `${habits.length ? (todayCompleted / habits.length) * 100 : 0}%` }}
              />
            </div>
            {todayCompleted === habits.length && habits.length > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">🎉 All habits completed for today!</p>
            )}
          </div>
        )}

        {/* Loading */}
        {habitsQuery.isLoading && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
            Loading habits...
          </div>
        )}

        {/* Empty state */}
        {!habitsQuery.isLoading && habits.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flame className="w-7 h-7 text-orange-500" />
            </div>
            <h3 className="text-base font-semibold dark:text-gray-100 mb-1">No habits yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Create your first habit and let AI schedule it in your day.
            </p>
            <button
              data-testid="create-first-habit"
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Create First Habit
            </button>
          </div>
        )}

        {/* Habit list */}
        <div className="space-y-3">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} today={today} />
          ))}
        </div>

        {/* Stats summary */}
        {habits.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <Activity className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold dark:text-gray-100">{habits.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Habits</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold dark:text-gray-100">
                {Math.max(...habits.map((h) => h.streakCurrent), 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Best Streak</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <Zap className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
              <p className="text-lg font-bold dark:text-gray-100">
                {habits.filter((h) => h.priority === "high").length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">High Priority</p>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateHabitForm onClose={() => setShowCreate(false)} />}
    </div>
  );
}
