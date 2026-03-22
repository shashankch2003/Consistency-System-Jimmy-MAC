import { useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Settings, Sparkles } from "lucide-react";
import { PlanBlock } from "./plan-block";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

interface PlanTimelineProps {
  onStartFocus?: (taskId?: number, title?: string) => void;
}

export function PlanTimeline({ onStartFocus }: PlanTimelineProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const planQuery = useQuery({
    queryKey: ["dailyPlan", dateStr],
    queryFn: () => apiFetch(`/api/daily-plan?date=${dateStr}`),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/daily-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", dateStr] });
      toast({ title: "Plan generated!", description: "Your AI daily plan is ready." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const completeBlockMutation = useMutation({
    mutationFn: ({ planId, blockId }: { planId: number; blockId: string }) =>
      apiFetch(`/api/daily-plan/${planId}/complete-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dailyPlan", dateStr] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const skipBlockMutation = useMutation({
    mutationFn: ({ planId, blockId }: { planId: number; blockId: string }) =>
      apiFetch(`/api/daily-plan/${planId}/skip-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dailyPlan", dateStr] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const plan = planQuery.data;
  const timeBlocks: any[] = (plan?.timeBlocks as any[]) || [];
  const aiSummary: any = plan?.aiSummary;

  const handleComplete = (blockId: string) => {
    if (!plan) return;
    completeBlockMutation.mutate({ planId: plan.id, blockId });
  };

  const handleSkip = (blockId: string) => {
    if (!plan) return;
    skipBlockMutation.mutate({ planId: plan.id, blockId });
  };

  const handleStartFocus = (block: any) => {
    if (onStartFocus) onStartFocus(block.taskId, block.title);
  };

  const mustTotal = timeBlocks.filter((b) => b.priority === "must_do").length;
  const mustDone = timeBlocks.filter((b) => b.priority === "must_do" && b.isCompleted).length;
  const shouldTotal = timeBlocks.filter((b) => b.priority === "should_do").length;
  const shouldDone = timeBlocks.filter((b) => b.priority === "should_do" && b.isCompleted).length;
  const niceTotal = timeBlocks.filter((b) => b.priority === "nice_to_do").length;
  const niceDone = timeBlocks.filter((b) => b.priority === "nice_to_do" && b.isCompleted).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold dark:text-gray-100">
            {isToday(selectedDate) ? "My Day" : format(selectedDate, "EEEE, MMMM d")}
          </h1>
          {!isToday(selectedDate) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="prev-day"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 dark:text-gray-300" />
          </button>
          <button
            data-testid="today-btn"
            onClick={() => setSelectedDate(new Date())}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              isToday(selectedDate)
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                : "bg-gray-100 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Today
          </button>
          <button
            data-testid="next-day"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 dark:text-gray-300" />
          </button>
          <button
            data-testid="generate-plan-btn"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            {plan ? "Regenerate" : "Generate Plan"}
          </button>
        </div>
      </div>

      {/* AI Briefing */}
      {aiSummary && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold mb-2 uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            AI Briefing
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{aiSummary.aiReasoning}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Focus: {aiSummary.focusMinutes}min</span>
            <span>Meetings: {aiSummary.meetingMinutes}min</span>
            <span>Completion: {aiSummary.completionLikelihood}% likely</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {planQuery.isLoading && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          Loading your plan...
        </div>
      )}

      {/* Empty state */}
      {!plan && !planQuery.isLoading && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-purple-500" />
          </div>
          <h3 className="text-base font-semibold dark:text-gray-100 mb-1">No plan for this day yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Let AI build an optimized schedule based on your tasks and habits.
          </p>
          <button
            data-testid="generate-plan-empty"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
          >
            {generateMutation.isPending ? "Generating..." : "Generate AI Plan"}
          </button>
        </div>
      )}

      {/* Time blocks */}
      {timeBlocks.length > 0 && (
        <div className="space-y-2">
          {timeBlocks.map((block: any) => (
            <PlanBlock
              key={block.id}
              block={block}
              onComplete={() => handleComplete(block.id)}
              onSkip={() => handleSkip(block.id)}
              onStartFocus={() => handleStartFocus(block)}
            />
          ))}
        </div>
      )}

      {/* Summary bar */}
      {aiSummary && timeBlocks.length > 0 && (
        <div className="mt-5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="text-gray-700 dark:text-gray-300">
                Must: <span className="font-semibold text-red-600 dark:text-red-400">{mustDone}/{mustTotal}</span>
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                Should: <span className="font-semibold text-yellow-600 dark:text-yellow-400">{shouldDone}/{shouldTotal}</span>
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                Nice: <span className="font-semibold text-blue-600 dark:text-blue-400">{niceDone}/{niceTotal}</span>
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {plan?.completionRate ? `${Math.round((plan.completionRate as number) * 100)}% complete` : "0% complete"}
            </span>
          </div>
          {/* Progress bar */}
          {(mustTotal + shouldTotal + niceTotal) > 0 && (
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                style={{
                  width: `${Math.round(
                    ((mustDone + shouldDone + niceDone) / (mustTotal + shouldTotal + niceTotal)) * 100
                  )}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
