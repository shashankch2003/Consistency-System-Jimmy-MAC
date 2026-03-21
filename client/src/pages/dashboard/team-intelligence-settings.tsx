import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const WS = "default";

const CATEGORY_OPTIONS = [
  { key: "achievement", label: "Achievement" },
  { key: "warning", label: "Warning" },
  { key: "suggestion", label: "Suggestion" },
  { key: "pattern", label: "Pattern" },
  { key: "coaching", label: "Coaching" },
];

const DAY_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
];

const WORK_DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export default function TeamIntelligenceSettingsPage() {
  const { toast } = useToast();
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({ queryKey: ["/api/level/is-admin"] });
  const isAdmin = adminCheck?.isAdmin ?? false;

  const { data: aiSettings, isLoading: aiLoading } = useQuery<any>({
    queryKey: [`/api/team-intelligence/ai-settings?workspaceId=${WS}`],
  });

  const { data: orgSettings, isLoading: orgLoading } = useQuery<any>({
    queryKey: [`/api/team-intelligence/org-settings?workspaceId=${WS}`],
    enabled: isAdmin,
  });

  const [ai, setAi] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    if (aiSettings) {
      setAi({
        insightsEnabled: aiSettings.insightsEnabled ?? true,
        morningBriefEnabled: aiSettings.morningBriefEnabled ?? true,
        morningBriefTime: aiSettings.morningBriefTime ?? "07:30",
        categoriesEnabled: aiSettings.categoriesEnabled ?? ["achievement", "warning", "suggestion", "pattern", "coaching"],
        frequency: aiSettings.frequency ?? "daily",
        intensity: aiSettings.intensity ?? "moderate",
        notificationChannel: aiSettings.notificationChannel ?? "in_app",
        weekendInsights: aiSettings.weekendInsights ?? false,
        tonePreference: aiSettings.tonePreference ?? "encouraging",
        teamBriefEnabled: aiSettings.teamBriefEnabled ?? true,
        teamBriefDay: String(aiSettings.teamBriefDay ?? 1),
        riskAlerts: aiSettings.riskAlerts ?? "daily_digest",
        coachingSuggestions: aiSettings.coachingSuggestions ?? true,
      });
    }
  }, [aiSettings]);

  useEffect(() => {
    if (orgSettings) {
      setOrg({
        managerSeesIndividualFocus: orgSettings.managerSeesIndividualFocus ?? true,
        managerSeesIndividualIdle: orgSettings.managerSeesIndividualIdle ?? false,
        managerSeesAppUsage: orgSettings.managerSeesAppUsage ?? "none",
        managerSeesScreenTime: orgSettings.managerSeesScreenTime ?? false,
        minDataDaysForScoring: orgSettings.minDataDaysForScoring ?? 7,
        newEmployeeRampDays: orgSettings.newEmployeeRampDays ?? 30,
        standardWorkStart: orgSettings.standardWorkStart ?? "09:00",
        standardWorkEnd: orgSettings.standardWorkEnd ?? "17:00",
        workDays: orgSettings.workDays ?? [1, 2, 3, 4, 5],
      });
    }
  }, [orgSettings]);

  const saveAiMut = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/team-intelligence/ai-settings", { workspaceId: WS, ...ai, teamBriefDay: parseInt(ai.teamBriefDay) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team-intelligence/ai-settings?workspaceId=${WS}`] });
      toast({ title: "Settings saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const saveOrgMut = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/team-intelligence/org-settings", { workspaceId: WS, ...org }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team-intelligence/org-settings?workspaceId=${WS}`] });
      toast({ title: "Settings saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const seedMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/team-intelligence/seed-demo-data", { workspaceId: WS });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: `Demo data seeded for ${data.usersSeeded} users` });
      queryClient.invalidateQueries();
    },
    onError: () => toast({ title: "Failed to seed data", variant: "destructive" }),
  });

  const toggleCategory = (cat: string) => {
    if (!ai) return;
    const cats: string[] = ai.categoriesEnabled;
    const next = cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat];
    setAi({ ...ai, categoriesEnabled: next });
  };

  const toggleWorkDay = (day: number) => {
    if (!org) return;
    const days: number[] = org.workDays;
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
    setOrg({ ...org, workDays: next });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/team-intelligence">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Team Intelligence Settings</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Configure AI preferences and organization policies</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <Tabs defaultValue="ai-preferences" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 mb-6" data-testid="tabs-settings">
            <TabsTrigger value="ai-preferences" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400" data-testid="tab-ai-preferences">
              AI Preferences
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="org-settings" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400" data-testid="tab-org-settings">
                Organization Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="ai-preferences">
            {aiLoading || !ai ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-zinc-800 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-white">General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-zinc-300">Enable AI Insights</Label>
                      <Switch checked={ai.insightsEnabled} onCheckedChange={v => setAi({ ...ai, insightsEnabled: v })} data-testid="switch-insights-enabled" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-zinc-300">Morning Brief</Label>
                      <Switch checked={ai.morningBriefEnabled} onCheckedChange={v => setAi({ ...ai, morningBriefEnabled: v })} data-testid="switch-morning-brief" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-zinc-300">Morning Brief Time</Label>
                      <Input type="time" value={ai.morningBriefTime} onChange={e => setAi({ ...ai, morningBriefTime: e.target.value })} className="w-32 bg-zinc-800 border-zinc-700 text-white" data-testid="input-brief-time" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-zinc-300">Weekend Insights</Label>
                      <Switch checked={ai.weekendInsights} onCheckedChange={v => setAi({ ...ai, weekendInsights: v })} data-testid="switch-weekend-insights" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-white">Insight Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {CATEGORY_OPTIONS.map(cat => (
                        <div key={cat.key} className="flex items-center gap-2">
                          <Checkbox
                            id={`cat-${cat.key}`}
                            checked={(ai.categoriesEnabled as string[]).includes(cat.key)}
                            onCheckedChange={() => toggleCategory(cat.key)}
                            data-testid={`checkbox-cat-${cat.key}`}
                          />
                          <Label htmlFor={`cat-${cat.key}`} className="text-xs text-zinc-300 cursor-pointer">{cat.label}</Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-white">Delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-zinc-300">Frequency</Label>
                      <Select value={ai.frequency} onValueChange={v => setAi({ ...ai, frequency: v })}>
                        <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white" data-testid="select-frequency"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Realtime</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-zinc-300">Intensity</Label>
                      <Select value={ai.intensity} onValueChange={v => setAi({ ...ai, intensity: v })}>
                        <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white" data-testid="select-intensity"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-zinc-300">Notification Channel</Label>
                      <Select value={ai.notificationChannel} onValueChange={v => setAi({ ...ai, notificationChannel: v })}>
                        <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white" data-testid="select-channel"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_app">In-app</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-zinc-300">Tone</Label>
                      <Select value={ai.tonePreference} onValueChange={v => setAi({ ...ai, tonePreference: v })}>
                        <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white" data-testid="select-tone"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="encouraging">Encouraging</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="direct">Direct</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {isAdmin && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-sm text-white">Admin Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Team Weekly Brief</Label>
                        <Switch checked={ai.teamBriefEnabled} onCheckedChange={v => setAi({ ...ai, teamBriefEnabled: v })} data-testid="switch-team-brief" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Brief Day</Label>
                        <Select value={ai.teamBriefDay} onValueChange={v => setAi({ ...ai, teamBriefDay: v })}>
                          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white" data-testid="select-brief-day"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DAY_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Risk Alerts</Label>
                        <Select value={ai.riskAlerts} onValueChange={v => setAi({ ...ai, riskAlerts: v })}>
                          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white" data-testid="select-risk-alerts"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Realtime</SelectItem>
                            <SelectItem value="daily_digest">Daily Digest</SelectItem>
                            <SelectItem value="off">Off</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Coaching Suggestions</Label>
                        <Switch checked={ai.coachingSuggestions} onCheckedChange={v => setAi({ ...ai, coachingSuggestions: v })} data-testid="switch-coaching" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white" onClick={() => saveAiMut.mutate()} disabled={saveAiMut.isPending} data-testid="button-save-ai">
                  {saveAiMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save AI Preferences
                </Button>
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="org-settings">
              {orgLoading || !org ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-zinc-800 rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-6">
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-sm text-white">Privacy Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Manager sees individual focus</Label>
                        <Switch checked={org.managerSeesIndividualFocus} onCheckedChange={v => setOrg({ ...org, managerSeesIndividualFocus: v })} data-testid="switch-sees-focus" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Manager sees idle time</Label>
                        <Switch checked={org.managerSeesIndividualIdle} onCheckedChange={v => setOrg({ ...org, managerSeesIndividualIdle: v })} data-testid="switch-sees-idle" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Manager sees app usage</Label>
                        <Select value={org.managerSeesAppUsage} onValueChange={v => setOrg({ ...org, managerSeesAppUsage: v })}>
                          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white" data-testid="select-app-usage"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="category_level">Category Level</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Manager sees screen time</Label>
                        <Switch checked={org.managerSeesScreenTime} onCheckedChange={v => setOrg({ ...org, managerSeesScreenTime: v })} data-testid="switch-sees-screen" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-sm text-white">Scoring & Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Min days for scoring</Label>
                        <Input type="number" min={1} max={30} value={org.minDataDaysForScoring} onChange={e => setOrg({ ...org, minDataDaysForScoring: parseInt(e.target.value) || 7 })} className="w-20 bg-zinc-800 border-zinc-700 text-white text-center" data-testid="input-min-days" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">New employee ramp days</Label>
                        <Input type="number" min={1} max={90} value={org.newEmployeeRampDays} onChange={e => setOrg({ ...org, newEmployeeRampDays: parseInt(e.target.value) || 30 })} className="w-20 bg-zinc-800 border-zinc-700 text-white text-center" data-testid="input-ramp-days" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Standard work start</Label>
                        <Input type="time" value={org.standardWorkStart} onChange={e => setOrg({ ...org, standardWorkStart: e.target.value })} className="w-32 bg-zinc-800 border-zinc-700 text-white" data-testid="input-work-start" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-zinc-300">Standard work end</Label>
                        <Input type="time" value={org.standardWorkEnd} onChange={e => setOrg({ ...org, standardWorkEnd: e.target.value })} className="w-32 bg-zinc-800 border-zinc-700 text-white" data-testid="input-work-end" />
                      </div>
                      <div>
                        <Label className="text-sm text-zinc-300 mb-2 block">Work Days</Label>
                        <div className="flex gap-2">
                          {WORK_DAYS.map(d => (
                            <button
                              key={d.value}
                              type="button"
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${(org.workDays as number[]).includes(d.value) ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                              onClick={() => toggleWorkDay(d.value)}
                              data-testid={`button-workday-${d.label.toLowerCase()}`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white" onClick={() => saveOrgMut.mutate()} disabled={saveOrgMut.isPending} data-testid="button-save-org">
                    {saveOrgMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Organization Settings
                  </Button>

                  <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-yellow-500">
                    <CardHeader>
                      <CardTitle className="text-sm text-white">Seed Demo Data</CardTitle>
                      <CardDescription className="text-zinc-400">
                        Generate 30 days of sample productivity data for all users. This creates realistic snapshots, insights, and alerts for previewing the dashboards.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="destructive"
                        onClick={() => seedMut.mutate()}
                        disabled={seedMut.isPending}
                        data-testid="button-seed-demo"
                      >
                        {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {seedMut.isPending ? "Seeding..." : "Seed Demo Data"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
