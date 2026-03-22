import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Sparkles, HelpCircle, Star, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: "welcome", label: "Welcome", description: "Get familiar with the platform" },
  { id: "profile", label: "Set Up Profile", description: "Add your name and preferences" },
  { id: "first_task", label: "Create First Task", description: "Add your first task to My Day" },
  { id: "first_page", label: "Explore a Page", description: "Visit the Goals or Habits page" },
  { id: "join_channel", label: "Join a Channel", description: "Connect with team members" },
  { id: "first_habit", label: "Create a Habit", description: "Set up your first recurring habit" },
  { id: "ai_search", label: "Try AI Search", description: "Press Cmd+K and ask a question" },
  { id: "daily_plan", label: "Generate Daily Plan", description: "Create your first AI-powered day plan" },
];

export default function OnboardingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const { data: progress, isLoading } = useQuery<any>({
    queryKey: ["/api/onboarding/progress"],
  });

  const completeStep = useMutation({
    mutationFn: (step: string) => apiRequest("POST", "/api/onboarding/complete-step", { step }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/onboarding/progress"] }); }
  });

  const dismiss = useMutation({
    mutationFn: () => apiRequest("POST", "/api/onboarding/dismiss", {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/onboarding/progress"] }); toast({ title: "Onboarding dismissed" }); }
  });

  const askHelp = async () => {
    if (!question) return;
    setLoadingAnswer(true);
    try {
      const res = await apiRequest("POST", "/api/onboarding/ask-help", { question });
      const data = await res.json();
      setAnswer(data.answer || "");
    } catch { toast({ title: "Failed to get help", variant: "destructive" }); }
    finally { setLoadingAnswer(false); }
  };

  const loadSuggestions = async () => {
    try {
      const res = await apiRequest("POST", "/api/onboarding/feature-suggestions", {});
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {}
  };

  const completedSteps: string[] = Array.isArray(progress?.completedSteps) ? progress.completedSteps : [];
  const completedCount = completedSteps.length;
  const totalSteps = STEPS.length;
  const percentComplete = Math.round((completedCount / totalSteps) * 100);

  if (isLoading) return <div className="p-6 max-w-4xl mx-auto"><div className="h-8 w-48 bg-gray-800/50 rounded animate-pulse mb-4" /><div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-800/50 animate-pulse" />)}</div></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Star className="w-7 h-7 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Getting Started</h1>
            <p className="text-sm text-gray-400">AI-guided onboarding to get you productive fast</p>
          </div>
        </div>
        {progress && !progress.dismissedAt && (
          <Button variant="ghost" onClick={() => dismiss.mutate()} className="text-gray-400 hover:text-white" data-testid="button-dismiss"><X className="w-4 h-4 mr-1" />Dismiss</Button>
        )}
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white font-medium">Setup Progress</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400" data-testid="text-progress">{completedCount}/{totalSteps} steps</span>
              {progress?.isComplete && <Badge className="bg-green-500/20 text-green-400">Complete!</Badge>}
            </div>
          </div>
          <Progress value={percentComplete} className="h-3 bg-gray-700" />
          <p className="text-xs text-gray-400 mt-2">{percentComplete}% complete</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {STEPS.map(step => {
          const done = completedSteps.includes(step.id);
          return (
            <div key={step.id} className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${done ? "bg-green-900/10 border-green-700/30" : "bg-gray-900 border-gray-800"}`} data-testid={`card-step-${step.id}`}>
              <button onClick={() => !done && completeStep.mutate(step.id)} className="mt-0.5 shrink-0" data-testid={`button-step-${step.id}`}>
                {done ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Circle className="w-5 h-5 text-gray-500 hover:text-green-400 transition-colors" />}
              </button>
              <div className="flex-1">
                <p className={`text-sm font-medium ${done ? "text-green-400 line-through" : "text-white"}`}>{step.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
              </div>
              {!done && <Button size="sm" variant="ghost" onClick={() => completeStep.mutate(step.id)} className="text-xs text-gray-400 hover:text-green-400 shrink-0">Done</Button>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><HelpCircle className="w-4 h-4 text-amber-400" />Ask for Help</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="How do I create a daily plan?" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askHelp()} className="bg-gray-800 border-gray-700" data-testid="input-question" />
              <Button onClick={askHelp} disabled={!question || loadingAnswer} className="bg-amber-600 hover:bg-amber-700 shrink-0" data-testid="button-ask">{loadingAnswer ? "..." : "Ask"}</Button>
            </div>
            {answer && (
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                <p className="text-xs text-amber-400 font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />AI Answer</p>
                <p className="text-sm text-gray-200 whitespace-pre-wrap" data-testid="text-answer">{answer}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" />Feature Suggestions</CardTitle>
              <Button size="sm" variant="ghost" onClick={loadSuggestions} className="text-amber-400 hover:bg-amber-900/20 text-xs" data-testid="button-load-suggestions">Load</Button>
            </div>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <p className="text-gray-500 text-sm">Click "Load" to get personalized feature suggestions based on your usage.</p>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg p-3" data-testid={`card-suggestion-${i}`}>
                    <p className="text-sm text-white font-medium">{s.feature}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
