import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Shield, Clock, Loader2, Play, Square, AlertTriangle, Hourglass, ArrowUpRight, Lock, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const fmt = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const formatDaysMask = (mask: number) => {
  if (mask === 31) return "Weekdays";
  if (mask === 96) return "Weekends";
  if (mask === 127) return "Every day";
  return DAYS.filter((_, i) => mask & (1 << i)).join(", ");
};

const formatTimer = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export default function DigitalFocus() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [remaining, setRemaining] = useState(0);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [showQuickBlock, setShowQuickBlock] = useState(false);
  const [qbDuration, setQbDuration] = useState(25);
  const [qbCustom, setQbCustom] = useState("");
  const [qbType, setQbType] = useState<"quick_block" | "pomodoro">("quick_block");
  const [qbWork, setQbWork] = useState(25);
  const [qbBreak, setQbBreak] = useState(5);
  const [qbRounds, setQbRounds] = useState(4);
  const [qbProfile, setQbProfile] = useState<string>("");
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newName, setNewName] = useState("");
  const autoCompleted = useRef(false);

  const { data: activeSession, isLoading: loadingSession } = useQuery<any>({ queryKey: ["/api/focus-sessions/active"] });
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery<any[]>({ queryKey: ["/api/focus-profiles"] });
  const { data: todayLog } = useQuery<any>({ queryKey: ["/api/focus-daily-logs/today"] });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/focus-sessions/${id}/complete`)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/focus-sessions/active"] });
      qc.invalidateQueries({ queryKey: ["/api/focus-daily-logs/today"] });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/focus-sessions/${id}/abandon`)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/focus-sessions/active"] });
      qc.invalidateQueries({ queryKey: ["/api/focus-daily-logs/today"] });
      setShowAbandonDialog(false);
    },
  });

  const startMutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/focus-sessions/start", data)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/focus-sessions/active"] });
      setShowQuickBlock(false);
    },
  });

  const patchProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      (await apiRequest("PATCH", `/api/focus-profiles/${id}`, data)).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/focus-profiles"] }),
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/focus-profiles", data)).json(),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["/api/focus-profiles"] });
      setShowCreateProfile(false);
      navigate(`/dashboard/digital-focus/profile/${created.id}`);
    },
  });

  useEffect(() => {
    if (!activeSession) return;
    autoCompleted.current = false;
    const end = new Date(activeSession.startedAt).getTime() + activeSession.plannedDurationMinutes * 60000;
    const tick = () => {
      const rem = Math.max(0, end - Date.now());
      setRemaining(rem);
      if (rem === 0 && !autoCompleted.current) {
        autoCompleted.current = true;
        completeMutation.mutate(activeSession.id);
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [activeSession?.id]);

  const handleStartSession = () => {
    const duration = qbCustom ? parseInt(qbCustom) : qbDuration;
    startMutation.mutate({
      sessionType: qbType,
      plannedDurationMinutes: duration,
      ...(qbType === "pomodoro" && { pomodoroWorkMinutes: qbWork, pomodoroBreakMinutes: qbBreak, pomodoroRoundsTotal: qbRounds }),
      ...(qbProfile && { profileId: parseInt(qbProfile) }),
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold">Digital Focus</h1>
      </div>

      {loadingSession ? (
        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : activeSession ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-blue-500/40 bg-blue-500/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium capitalize">{activeSession.sessionType?.replace(/_/g, " ")}</span>
                  {activeSession.sessionType === "pomodoro" && (
                    <Badge variant="outline" className="text-xs">
                      Round {activeSession.pomodoroRoundsCompleted ?? 0} of {activeSession.pomodoroRoundsTotal ?? 4}
                    </Badge>
                  )}
                  {(activeSession.interruptionCount ?? 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {activeSession.interruptionCount} interruptions
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-mono font-bold tracking-wider">{formatTimer(remaining)}</div>
                <p className="text-sm text-muted-foreground mt-1">remaining</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  data-testid="session-complete"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => completeMutation.mutate(activeSession.id)}
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                  Complete
                </Button>
                <Button
                  data-testid="session-abandon"
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  onClick={() => setShowAbandonDialog(true)}
                >
                  Abandon
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="cursor-pointer hover:border-blue-500/40 transition-colors h-full">
            <CardHeader>
              <CardTitle className="text-base">Quick Block</CardTitle>
              <p className="text-sm text-muted-foreground">Start blocking instantly with one tap.</p>
            </CardHeader>
            <CardContent>
              <Button
                data-testid="quick-block-start"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowQuickBlock(true)}
                disabled={!!activeSession}
              >
                <Play className="w-4 h-4 mr-2" />
                Get started
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {todayLog ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Screen Time</p>
                    <p className="font-bold text-sm mt-1">{fmt(todayLog.totalScreenTimeMinutes ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Focus Time</p>
                    <p className="font-bold text-sm mt-1 text-blue-400">{fmt(todayLog.totalFocusTimeMinutes ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                    <p className="font-bold text-sm mt-1">{todayLog.sessionsCompleted ?? 0}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">No data yet today</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New schedule</CardTitle>
            <p className="text-sm text-muted-foreground">Let's do this—schedule your first blocking!</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <button
                data-testid="new-schedule-time"
                onClick={() => navigate("/dashboard/digital-focus/profile/new?mode=scheduled")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <Clock className="w-6 h-6 text-blue-400" />
                <span className="text-sm font-medium">Time</span>
              </button>
              <button
                data-testid="new-schedule-usage"
                onClick={() => navigate("/dashboard/digital-focus/profile/new?mode=timer")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <Hourglass className="w-6 h-6 text-orange-400" />
                <span className="text-sm font-medium">Usage limit</span>
              </button>
              <button
                data-testid="new-schedule-launch"
                onClick={() => navigate("/dashboard/digital-focus/profile/new?mode=timer")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <ArrowUpRight className="w-6 h-6 text-purple-400" />
                <span className="text-sm font-medium">Launch count</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Profiles</CardTitle>
              <Button
                data-testid="create-profile"
                size="sm"
                variant="outline"
                onClick={() => setShowCreateProfile(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingProfiles ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">No profiles yet. Create your first focus profile!</p>
                <Button data-testid="create-profile" variant="outline" size="sm" onClick={() => setShowCreateProfile(true)}>
                  Create Profile
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-blue-500/30 cursor-pointer transition-all group"
                    onClick={() => navigate(`/dashboard/digital-focus/profile/${p.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{p.emoji}</span>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p.mode} mode</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {p.strictModeEnabled && <Lock className="w-3.5 h-3.5 text-purple-400" />}
                      <Switch
                        checked={p.isActive ?? false}
                        onCheckedChange={(v) => patchProfileMutation.mutate({ id: p.id, data: { isActive: v } })}
                      />
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Abandon Session?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will mark your session as interrupted. Are you sure?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAbandonDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => activeSession && abandonMutation.mutate(activeSession.id)}
              disabled={abandonMutation.isPending}
            >
              {abandonMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Abandon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showQuickBlock} onOpenChange={setShowQuickBlock}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Quick Block</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-4">
            <div>
              <Label className="text-sm mb-2 block">Duration</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setQbDuration(d); setQbCustom(""); }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${qbDuration === d && !qbCustom ? "bg-blue-600 border-blue-600 text-white" : "border-border hover:border-blue-500/50"}`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
              <Input
                placeholder="Custom minutes..."
                value={qbCustom}
                onChange={(e) => setQbCustom(e.target.value)}
                type="number"
                min={1}
                className="w-40 text-sm"
              />
            </div>

            <div>
              <Label className="text-sm mb-2 block">Session Type</Label>
              <div className="flex gap-2">
                {(["quick_block", "pomodoro"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setQbType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${qbType === t ? "bg-blue-600 border-blue-600 text-white" : "border-border hover:border-blue-500/50"}`}
                  >
                    {t === "quick_block" ? "Focus Timer" : "Pomodoro"}
                  </button>
                ))}
              </div>
            </div>

            {qbType === "pomodoro" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Work (min)</Label>
                  <Input type="number" value={qbWork} onChange={(e) => setQbWork(parseInt(e.target.value) || 25)} min={1} max={120} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Break (min)</Label>
                  <Input type="number" value={qbBreak} onChange={(e) => setQbBreak(parseInt(e.target.value) || 5)} min={1} max={60} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Rounds</Label>
                  <Input type="number" value={qbRounds} onChange={(e) => setQbRounds(parseInt(e.target.value) || 4)} min={1} max={20} />
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm mb-2 block">Profile (optional)</Label>
              <Select value={qbProfile} onValueChange={setQbProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="No profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No profile</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.emoji} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleStartSession}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Start Session
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showCreateProfile} onOpenChange={setShowCreateProfile}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Profile</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">Profile Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Work Focus"
              data-testid="input-profile-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProfile(false)}>Cancel</Button>
            <Button
              onClick={() => createProfileMutation.mutate({ name: newName, emoji: "🎯", color: "#3B82F6", mode: "relaxed" })}
              disabled={!newName.trim() || createProfileMutation.isPending}
            >
              {createProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
