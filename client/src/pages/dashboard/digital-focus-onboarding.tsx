import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronRight, Clock, TrendingDown, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const GOALS = [
  { id: "reduce_screen_time", label: "Reduce screen time", icon: TrendingDown },
  { id: "stop_doomscrolling", label: "Stop doomscrolling", icon: Smartphone },
  { id: "improve_focus_work", label: "Improve focus at work", icon: Zap },
  { id: "build_better_habits", label: "Build better habits", icon: Clock },
];

const COMMON_APPS = [
  "Instagram", "TikTok", "YouTube", "Twitter/X", "Facebook",
  "Reddit", "Snapchat", "WhatsApp", "Netflix", "Discord", "Chrome", "Games",
];

const BLOCK_TYPES = [
  {
    id: "time",
    label: "Time",
    icon: "⏰",
    tags: ["WORK", "STUDY", "BED TIME", "HABIT"],
  },
  {
    id: "usage_limit",
    label: "Usage limit",
    icon: "⏱️",
    tags: ["LIMIT", "USAGE CONTROL"],
  },
  {
    id: "launch_count",
    label: "Launch count",
    icon: "🚀",
    tags: ["LIMIT", "HABIT", "MINDFUL USE"],
  },
];

export default function DigitalFocusOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [screenHours, setScreenHours] = useState(4);
  const [goal, setGoal] = useState("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [customApp, setCustomApp] = useState("");
  const [blockType, setBlockType] = useState("");

  const { data: existing, isLoading } = useQuery<any>({ queryKey: ["/api/focus-onboarding"] });

  useEffect(() => {
    if (existing?.onboardingCompleted) {
      navigate("/dashboard/digital-focus");
    }
  }, [existing]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const apps = [...selectedApps, ...(customApp.trim() ? [customApp.trim()] : [])];
      return (await apiRequest("POST", "/api/focus-onboarding", {
        estimatedDailyScreenTime: screenHours * 60,
        primaryGoal: goal,
        topDistractingApps: apps.slice(0, 10),
        preferredBlockType: blockType || "time",
        onboardingCompleted: true,
      })).json();
    },
    onSuccess: () => navigate("/dashboard/digital-focus"),
  });

  const toggleApp = (app: string) => {
    setSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-center mb-2">Focus Setup</h1>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right mt-1">Step {step} of 4</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <h2 className="text-xl font-semibold text-center">How much time do you spend on your phone every day?</h2>
              <div className="text-center">
                <span className="text-6xl font-bold text-blue-400">
                  {screenHours >= 12 ? "12+" : screenHours}
                </span>
                <span className="text-2xl text-muted-foreground ml-2">hours</span>
              </div>
              <Slider
                value={[screenHours]}
                onValueChange={([v]) => setScreenHours(v)}
                min={1}
                max={12}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1h</span>
                <span>12h+</span>
              </div>
              <Button
                data-testid="onboarding-continue"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep(2)}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-xl font-semibold text-center">What's your primary goal?</h2>
              <div className="space-y-3">
                {GOALS.map((g) => {
                  const Icon = g.icon;
                  return (
                    <Card
                      key={g.id}
                      className={`p-4 cursor-pointer transition-all border-2 ${goal === g.id ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"}`}
                      onClick={() => setGoal(g.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-blue-400" />
                        <span className="font-medium">{g.label}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
              <Button
                data-testid="onboarding-continue"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep(3)}
                disabled={!goal}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-xl font-semibold text-center">Which apps distract you the most?</h2>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_APPS.map((app) => (
                  <label key={app} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={selectedApps.includes(app)}
                      onCheckedChange={() => toggleApp(app)}
                    />
                    <span className="text-sm">{app}</span>
                  </label>
                ))}
              </div>
              <Input
                value={customApp}
                onChange={(e) => setCustomApp(e.target.value)}
                placeholder="Add another app..."
                className="text-sm"
              />
              <Button
                data-testid="onboarding-continue"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep(4)}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-xl font-semibold text-center">Where would you like to improve your focus first?</h2>
              <div className="space-y-3">
                {BLOCK_TYPES.map((bt) => (
                  <Card
                    key={bt.id}
                    className={`p-4 cursor-pointer transition-all border-2 ${blockType === bt.id ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"}`}
                    onClick={() => setBlockType(bt.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{bt.icon}</span>
                      <div>
                        <p className="font-medium">{bt.label}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {bt.tags.map((tag) => (
                            <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Button
                data-testid="onboarding-complete"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => completeMutation.mutate()}
                disabled={!blockType || completeMutation.isPending}
              >
                {completeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Complete Setup
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
