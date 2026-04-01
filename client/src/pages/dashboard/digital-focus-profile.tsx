import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Lock, Unlock, Plus, Trash2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const formatDaysMask = (mask: number) => {
  if (mask === 31) return "Weekdays";
  if (mask === 96) return "Weekends";
  if (mask === 127) return "Every day";
  return DAYS.filter((_, i) => mask & (1 << i)).join(", ");
};

const COLORS = ["#3B82F6", "#EC4899", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];

export default function DigitalFocusProfile() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [emoji, setEmoji] = useState("🎯");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [mode, setMode] = useState("relaxed");
  const [strictEnabled, setStrictEnabled] = useState(false);
  const [strictMethod, setStrictMethod] = useState("cooldown");
  const [strictCooldown, setStrictCooldown] = useState(5);
  const [dailyTimeLimit, setDailyTimeLimit] = useState(30);
  const [dailyLaunchLimit, setDailyLaunchLimit] = useState(15);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [targetType, setTargetType] = useState<"app" | "website" | "keyword">("app");
  const [targetValue, setTargetValue] = useState("");
  const [targetCategory, setTargetCategory] = useState("distractive");
  const [sched, setSched] = useState({ daysMask: 31, startTime: "09:00", endTime: "17:00", isEnabled: true });
  const [schedDays, setSchedDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [strictLockRemaining, setStrictLockRemaining] = useState(0);

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: [`/api/focus-profiles/${id}`],
    enabled: id > 0,
  });

  useEffect(() => {
    if (!profile) return;
    setEmoji(profile.emoji ?? "🎯");
    setName(profile.name ?? "");
    setColor(profile.color ?? "#3B82F6");
    setMode(profile.mode ?? "relaxed");
    setStrictEnabled(profile.strictModeEnabled ?? false);
    setStrictMethod(profile.strictModeUnlockMethod ?? "cooldown");
    setStrictCooldown(profile.strictModeCooldownMinutes ?? 5);
    if (profile.usageLimits?.[0]) {
      setDailyTimeLimit(profile.usageLimits[0].dailyTimeLimitMinutes ?? 30);
      setDailyLaunchLimit(profile.usageLimits[0].dailyLaunchLimit ?? 15);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.strictModeLockedUntil) return;
    const end = new Date(profile.strictModeLockedUntil).getTime();
    const tick = () => setStrictLockRemaining(Math.max(0, end - Date.now()));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [profile?.strictModeLockedUntil]);

  const saveMutation = useMutation({
    mutationFn: async () => (await apiRequest("PATCH", `/api/focus-profiles/${id}`, { name, emoji, color, mode, strictModeEnabled: strictEnabled, strictModeUnlockMethod: strictMethod, strictModeCooldownMinutes: strictCooldown })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/focus-profiles/${id}`] });
      qc.invalidateQueries({ queryKey: ["/api/focus-profiles"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/focus-profiles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/focus-profiles"] });
      navigate("/dashboard/digital-focus");
    },
  });

  const addScheduleMutation = useMutation({
    mutationFn: async () => {
      const mask = schedDays.reduce((acc, d) => acc | (1 << d), 0);
      return (await apiRequest("POST", "/api/focus-schedules", { profileId: id, daysMask: mask, startTime: sched.startTime, endTime: sched.endTime, isEnabled: sched.isEnabled })).json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/focus-profiles/${id}`] });
      setShowAddSchedule(false);
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (schedId: number) => apiRequest("DELETE", `/api/focus-schedules/${schedId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/focus-profiles/${id}`] }),
  });

  const addTargetMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/focus-targets", { profileId: id, targetType, value: targetValue, category: targetCategory })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/focus-profiles/${id}`] });
      setShowAddTarget(false);
      setTargetValue("");
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: async (targetId: number) => apiRequest("DELETE", `/api/focus-targets/${targetId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/focus-profiles/${id}`] }),
  });

  const activateStrictMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/focus-profiles/${id}/activate-strict`)).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/focus-profiles/${id}`] }),
  });

  const deactivateStrictMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/focus-profiles/${id}/deactivate-strict`)).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/focus-profiles/${id}`] }),
  });

  const setDayQuick = (preset: "weekdays" | "weekends" | "all") => {
    if (preset === "weekdays") setSchedDays([0, 1, 2, 3, 4]);
    else if (preset === "weekends") setSchedDays([5, 6]);
    else setSchedDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const toggleDay = (i: number) => {
    setSchedDays((prev) => prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]);
  };

  const isLocked = profile?.strictModeLockedUntil && strictLockRemaining > 0;

  const appTargets = profile?.targets?.filter((t: any) => t.targetType === "app") ?? [];
  const webTargets = profile?.targets?.filter((t: any) => t.targetType === "website") ?? [];
  const kwTargets = profile?.targets?.filter((t: any) => t.targetType === "keyword") ?? [];

  const formatLockTime = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <div className="p-6 text-center text-muted-foreground">Profile not found.</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/digital-focus")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">{name || "Profile"}</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader><CardTitle className="text-sm">Profile Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-start">
              <div>
                <Label className="text-xs mb-1 block">Emoji</Label>
                <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-20 text-center text-xl" />
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1 block">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Profile name" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Color</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: color === c ? "#fff" : "transparent" }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="timer">Timer</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Schedules</CardTitle>
              <Button data-testid="add-schedule" size="sm" variant="outline" onClick={() => setShowAddSchedule(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add Schedule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(profile.schedules ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No schedules yet.</p>
            ) : (
              <div className="space-y-2">
                {profile.schedules.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{s.startTime} – {s.endTime}</p>
                      <p className="text-xs text-muted-foreground">{formatDaysMask(s.daysMask)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.isEnabled ? "default" : "secondary"} className="text-xs">{s.isEnabled ? "On" : "Off"}</Badge>
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-red-400 hover:text-red-300" onClick={() => deleteScheduleMutation.mutate(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Blocking</CardTitle>
              <Button data-testid="add-target" size="sm" variant="outline" onClick={() => setShowAddTarget(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {(["app", "website", "keyword"] as const).map((type) => {
              const items = type === "app" ? appTargets : type === "website" ? webTargets : kwTargets;
              const isOpen = expandedSection === type;
              return (
                <div key={type}>
                  <button
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedSection(isOpen ? null : type)}
                  >
                    <span className="text-sm font-medium capitalize">{type}s <span className="text-muted-foreground">({items.length})</span></span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {isOpen && (
                    <div className="pl-2 space-y-1 mt-1">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1 pl-2">No {type}s blocked yet.</p>
                      ) : (
                        items.map((t: any) => (
                          <div key={t.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/30">
                            <span className="text-sm">{t.value}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{t.category}</span>
                              <Button size="icon" variant="ghost" className="w-6 h-6 text-red-400 hover:text-red-300" onClick={() => deleteTargetMutation.mutate(t.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {(mode === "timer") && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Usage Limits</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <Label>Daily Time Limit</Label>
                  <span className="text-muted-foreground">{dailyTimeLimit} min</span>
                </div>
                <Slider value={[dailyTimeLimit]} onValueChange={([v]) => setDailyTimeLimit(v)} min={5} max={480} step={5} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <Label>Daily Launch Limit</Label>
                  <span className="text-muted-foreground">{dailyLaunchLimit} launches</span>
                </div>
                <Slider value={[dailyLaunchLimit]} onValueChange={([v]) => setDailyLaunchLimit(v)} min={1} max={100} step={1} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-purple-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                Strict Mode
              </CardTitle>
              <Switch checked={strictEnabled} onCheckedChange={setStrictEnabled} />
            </div>
          </CardHeader>
          {strictEnabled && (
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs mb-1 block">Unlock Method</Label>
                <Select value={strictMethod} onValueChange={setStrictMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cooldown">Cooldown</SelectItem>
                    <SelectItem value="timer">Timer</SelectItem>
                    <SelectItem value="pin">PIN</SelectItem>
                    <SelectItem value="approval">Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {strictMethod === "cooldown" && (
                <div>
                  <Label className="text-xs mb-1 block">Cooldown (minutes)</Label>
                  <Input type="number" value={strictCooldown} onChange={(e) => setStrictCooldown(parseInt(e.target.value) || 5)} min={1} max={1440} />
                </div>
              )}
              {strictMethod === "pin" && (
                <div>
                  <Label className="text-xs mb-1 block">4-digit PIN</Label>
                  <Input type="password" maxLength={4} placeholder="****" className="w-24" />
                </div>
              )}
              {strictMethod === "approval" && (
                <p className="text-xs text-muted-foreground">Approval by another person — coming soon.</p>
              )}
              {isLocked ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-medium">Locked for {formatLockTime(strictLockRemaining)}</span>
                  </div>
                  <Button data-testid="deactivate-strict" variant="outline" size="sm" className="border-purple-500/30" disabled>
                    <Unlock className="w-4 h-4 mr-2" />
                    Deactivate (locked)
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    data-testid="activate-strict"
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => activateStrictMutation.mutate()}
                    disabled={activateStrictMutation.isPending}
                  >
                    {activateStrictMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
                    Activate Strict Mode
                  </Button>
                  {profile.strictModeEnabled && (
                    <Button
                      data-testid="deactivate-strict"
                      size="sm"
                      variant="outline"
                      onClick={() => deactivateStrictMutation.mutate()}
                      disabled={deactivateStrictMutation.isPending}
                    >
                      <Unlock className="w-3.5 h-3.5 mr-1" />
                      Deactivate
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </motion.div>

      <div className="flex gap-3 pb-6">
        <Button
          data-testid="save-profile"
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save
        </Button>
        <Button
          data-testid="delete-profile"
          variant="ghost"
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={() => setShowDeleteDialog(true)}
        >
          Delete Profile
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Profile?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete this profile and all its schedules, targets, and limits.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {["Weekdays", "Weekends", "Every day"].map((label, i) => (
                <Button key={label} size="sm" variant="outline" onClick={() => setDayQuick(i === 0 ? "weekdays" : i === 1 ? "weekends" : "all")}>
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={schedDays.includes(i)} onCheckedChange={() => toggleDay(i)} />
                  <span className="text-sm">{d}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Start</Label>
                <Input type="time" value={sched.startTime} onChange={(e) => setSched(s => ({ ...s, startTime: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">End</Label>
                <Input type="time" value={sched.endTime} onChange={(e) => setSched(s => ({ ...s, endTime: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSchedule(false)}>Cancel</Button>
            <Button onClick={() => addScheduleMutation.mutate()} disabled={addScheduleMutation.isPending || schedDays.length === 0}>
              {addScheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTarget} onOpenChange={setShowAddTarget}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Blocked Target</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Type</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="app">App</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Value</Label>
              <Input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder={targetType === "app" ? "Instagram" : targetType === "website" ? "reddit.com" : "keyword"} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Category</Label>
              <Select value={targetCategory} onValueChange={setTargetCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="distractive">Distractive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="productive">Productive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTarget(false)}>Cancel</Button>
            <Button onClick={() => addTargetMutation.mutate()} disabled={!targetValue.trim() || addTargetMutation.isPending}>
              {addTargetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
