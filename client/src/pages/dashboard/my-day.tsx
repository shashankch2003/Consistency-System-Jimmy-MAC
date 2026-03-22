import { useState } from "react";
import { PlanTimeline } from "@/components/daily-plan/plan-timeline";
import { Settings, X, Clock, ToggleLeft, ToggleRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

function PreferencesPanel({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: ["schedulingPreferences"],
    queryFn: () => apiFetch("/api/daily-plan/preferences"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/api/daily-plan/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedulingPreferences"] });
      toast({ title: "Preferences saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const prefs = prefsQuery.data;
  if (!prefs) return null;

  const workingHours = (prefs.workingHours as any) || { start: "09:00", end: "18:00" };
  const lunchTime = (prefs.lunchTime as any) || { start: "12:30", end: "13:30" };
  const peakFocus = (prefs.peakFocusWindow as any) || { start: "10:00", end: "12:00" };

  const handleSave = (key: string, value: any) => {
    updateMutation.mutate({ [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
      <div className="w-96 h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-base dark:text-gray-100">Scheduling Preferences</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-4 h-4 dark:text-gray-300" />
          </button>
        </div>
        <div className="p-5 space-y-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">Working Hours</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start</label>
                <input
                  data-testid="pref-work-start"
                  type="time"
                  defaultValue={workingHours.start}
                  onBlur={(e) => handleSave("workingHours", { ...workingHours, start: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">End</label>
                <input
                  data-testid="pref-work-end"
                  type="time"
                  defaultValue={workingHours.end}
                  onBlur={(e) => handleSave("workingHours", { ...workingHours, end: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">Peak Focus Window</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start</label>
                <input
                  data-testid="pref-focus-start"
                  type="time"
                  defaultValue={peakFocus.start}
                  onBlur={(e) => handleSave("peakFocusWindow", { ...peakFocus, start: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">End</label>
                <input
                  data-testid="pref-focus-end"
                  type="time"
                  defaultValue={peakFocus.end}
                  onBlur={(e) => handleSave("peakFocusWindow", { ...peakFocus, end: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">Lunch Break</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start</label>
                <input
                  data-testid="pref-lunch-start"
                  type="time"
                  defaultValue={lunchTime.start}
                  onBlur={(e) => handleSave("lunchTime", { ...lunchTime, start: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">End</label>
                <input
                  data-testid="pref-lunch-end"
                  type="time"
                  defaultValue={lunchTime.end}
                  onBlur={(e) => handleSave("lunchTime", { ...lunchTime, end: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">Buffer Between Meetings</label>
            <input
              data-testid="pref-buffer"
              type="number"
              min={0}
              max={60}
              defaultValue={prefs.bufferBetweenMeetings ?? 15}
              onBlur={(e) => handleSave("bufferBetweenMeetings", Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Minutes</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">Plan Mode</label>
            <select
              data-testid="pref-plan-mode"
              defaultValue={prefs.planMode || "suggest"}
              onChange={(e) => handleSave("planMode", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="automatic">Automatic (auto-activates)</option>
              <option value="suggest">Suggest (review before activating)</option>
              <option value="manual">Manual (build yourself)</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium dark:text-gray-200">Morning Planning</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Show plan review at start of day</p>
            </div>
            <button
              data-testid="pref-morning-planning"
              onClick={() => handleSave("morningPlanningEnabled", !prefs.morningPlanningEnabled)}
              className="text-purple-600 dark:text-purple-400"
            >
              {prefs.morningPlanningEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium dark:text-gray-200">Evening Review</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Show end-of-day summary</p>
            </div>
            <button
              data-testid="pref-evening-review"
              onClick={() => handleSave("eveningReviewEnabled", !prefs.eveningReviewEnabled)}
              className="text-purple-600 dark:text-purple-400"
            >
              {prefs.eveningReviewEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyDayPage() {
  const [showPrefs, setShowPrefs] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold dark:text-gray-100">My Day</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered daily schedule</p>
            </div>
          </div>
          <button
            data-testid="open-preferences"
            onClick={() => setShowPrefs(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
          >
            <Settings className="w-4 h-4" />
            Preferences
          </button>
        </div>

        <PlanTimeline />
      </div>

      {showPrefs && <PreferencesPanel onClose={() => setShowPrefs(false)} />}
    </div>
  );
}
