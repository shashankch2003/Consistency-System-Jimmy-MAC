import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users, UserPlus, Link2, Check, X, ArrowLeft, Copy,
  Send, MessageSquare, Crown, Shield, Settings2, Plus,
  Trophy, Flame, BarChart3, Eye, EyeOff, Globe, Lock,
  Trash2, LogOut, ChevronRight, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

type FriendItem = {
  id: number;
  requesterId: string;
  addresseeId: string;
  status: string;
  friendId: string;
  friendName: string;
  createdAt: string | null;
};

type FriendRequest = {
  id: number;
  requesterId: string;
  addresseeId: string;
  status: string;
  requesterName: string;
};

type ComparisonData = {
  myData: { dailyAvg: number; weeklyAvg: number; monthlyAvg: number; currentStreak: number; longestStreak: number; level: string };
  friendData: { dailyAvg: number | null; weeklyAvg: number | null; monthlyAvg: number | null; currentStreak: number | null; longestStreak: number | null; level: string };
};

type DeepComparison = {
  myData: { overallPct: number; taskPct: number; goodHabitPct: number; badHabitPct: number; hourlyPct: number; totalTasks: number; completedTasks: number };
  friendData: { overallPct: number; taskPct: number; goodHabitPct: number; badHabitPct: number; hourlyPct: number; totalTasks: number; completedTasks: number } | null;
  message?: string;
};

type LeaderboardEntry = {
  userId: string;
  name: string;
  average: number | null;
  currentStreak: number | null;
  level: string;
  isMe: boolean;
};

type GrowGroup = {
  id: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdBy: string;
  icon: string | null;
  rules: string | null;
  memberCount: number;
  createdAt: string | null;
};

type GroupMember = {
  id: number;
  groupId: number;
  userId: string;
  role: string;
  name: string;
};

type GroupMessage = {
  id: number;
  groupId: number;
  userId: string;
  senderName: string | null;
  content: string;
  replyToId: number | null;
  isDeleted: boolean;
  createdAt: string | null;
};

type PrivacySettings = {
  shareDailyScore: boolean;
  shareWeeklyAverage: boolean;
  shareMonthlyAverage: boolean;
  shareStreak: boolean;
  shareHabitDetails: boolean;
  shareDailyBreakdown: boolean;
};

export default function GrowTogetherPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const inviteToken = params.get("invite");

  return (
    <div className="p-2 pt-14 sm:p-4 sm:pt-4 max-w-6xl mx-auto" data-testid="grow-together-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="text-page-title">Grow Together</h1>
        <p className="text-muted-foreground text-sm">Compare with friends and grow as a group</p>
      </div>

      <Tabs defaultValue="compare" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="compare" data-testid="tab-compare">
            <BarChart3 className="w-4 h-4 mr-2" /> Compare With Friends
          </TabsTrigger>
          <TabsTrigger value="groups" data-testid="tab-groups">
            <MessageSquare className="w-4 h-4 mr-2" /> Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compare">
          <CompareWithFriends inviteToken={inviteToken} />
        </TabsContent>

        <TabsContent value="groups">
          <GroupsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== COMPARE WITH FRIENDS =====

function CompareWithFriends({ inviteToken }: { inviteToken: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFriend, setSelectedFriend] = useState<FriendItem | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deepDate, setDeepDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("today");
  const [view, setView] = useState<"friends" | "compare" | "deep" | "leaderboard">("friends");

  const { data: friendsList = [] } = useQuery<FriendItem[]>({ queryKey: ["/api/grow/friends"] });
  const { data: requests = [] } = useQuery<FriendRequest[]>({ queryKey: ["/api/grow/friends/requests"] });

  useEffect(() => {
    if (inviteToken) {
      apiRequest("POST", "/api/grow/friends/accept-invite", { token: inviteToken })
        .then(() => {
          toast({ title: "Friend added!", description: "You are now connected." });
          queryClient.invalidateQueries({ queryKey: ["/api/grow/friends"] });
        })
        .catch((e: any) => toast({ title: "Invite error", description: e.message, variant: "destructive" }));
    }
  }, [inviteToken]);

  const generateInvite = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/grow/friends/invite");
      return res.json();
    },
    onSuccess: (data: any) => {
      const fullUrl = `${window.location.origin}${data.link}`;
      navigator.clipboard.writeText(fullUrl);
      toast({ title: "Invite link copied!", description: "Share it with your friend." });
    },
  });

  const respondRequest = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/grow/friends/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grow/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grow/friends/requests"] });
      toast({ title: "Done" });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/grow/friends/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grow/friends"] });
      setSelectedFriend(null);
      setView("friends");
      toast({ title: "Friend removed" });
    },
  });

  if (showPrivacy) {
    return <PrivacySettingsView onBack={() => setShowPrivacy(false)} />;
  }

  if (view === "compare" && selectedFriend) {
    return (
      <HighLevelComparison
        friend={selectedFriend}
        onBack={() => { setView("friends"); setSelectedFriend(null); }}
        onDeep={() => setView("deep")}
      />
    );
  }

  if (view === "deep" && selectedFriend) {
    return (
      <DeepDailyComparison
        friend={selectedFriend}
        date={deepDate}
        onDateChange={setDeepDate}
        onBack={() => setView("compare")}
      />
    );
  }

  if (view === "leaderboard") {
    return (
      <LeaderboardView
        period={leaderboardPeriod}
        onPeriodChange={setLeaderboardPeriod}
        onBack={() => setView("friends")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => generateInvite.mutate()} disabled={generateInvite.isPending} data-testid="button-generate-invite">
          <Link2 className="w-4 h-4 mr-2" /> Generate Invite Link
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowPrivacy(true)} data-testid="button-privacy-settings">
          <Settings2 className="w-4 h-4 mr-2" /> Privacy Settings
        </Button>
        {friendsList.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setView("leaderboard")} data-testid="button-leaderboard">
            <Trophy className="w-4 h-4 mr-2" /> Leaderboard
          </Button>
        )}
      </div>

      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Requests ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`request-${r.id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{r.requesterName}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400" onClick={() => respondRequest.mutate({ id: r.id, status: "accepted" })} data-testid={`button-accept-${r.id}`}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => respondRequest.mutate({ id: r.id, status: "rejected" })} data-testid={`button-reject-${r.id}`}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> Your Friends ({friendsList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friendsList.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mb-3">No friends connected yet</p>
              <p className="text-xs text-muted-foreground">Generate an invite link and share it to connect with friends</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friendsList.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => { setSelectedFriend(f); setView("compare"); }}
                  data-testid={`friend-${f.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                      {f.friendName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{f.friendName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); removeFriend.mutate(f.id); }} data-testid={`button-remove-friend-${f.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===== HIGH-LEVEL COMPARISON =====

function HighLevelComparison({ friend, onBack, onDeep }: { friend: FriendItem; onBack: () => void; onDeep: () => void }) {
  const { data: comparison } = useQuery<ComparisonData>({
    queryKey: [`/api/grow/compare/${friend.friendId}`],
  });

  const metrics = comparison ? [
    { label: "Daily Average", mine: comparison.myData.dailyAvg, theirs: comparison.friendData.dailyAvg },
    { label: "Weekly Average", mine: comparison.myData.weeklyAvg, theirs: comparison.friendData.weeklyAvg },
    { label: "Monthly Average", mine: comparison.myData.monthlyAvg, theirs: comparison.friendData.monthlyAvg },
  ] : [];

  const chartData = metrics.map(m => ({
    name: m.label,
    You: m.mine,
    [friend.friendName]: m.theirs ?? 0,
  }));

  return (
    <div className="space-y-6" data-testid="high-level-comparison">
      <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-friends">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Friends
      </Button>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Comparing with {friend.friendName}</h2>
        <Button size="sm" onClick={onDeep} data-testid="button-deep-compare">
          Deep Compare
        </Button>
      </div>

      {comparison ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((m) => {
              const diff = m.theirs !== null ? m.mine - m.theirs : null;
              return (
                <Card key={m.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-2">{m.label}</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold">{m.mine}%</p>
                        <p className="text-[10px] text-muted-foreground">You</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{m.theirs !== null ? `${m.theirs}%` : "Private"}</p>
                        <p className="text-[10px] text-muted-foreground">{friend.friendName}</p>
                      </div>
                    </div>
                    {diff !== null && (
                      <div className={`text-xs mt-2 font-medium ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : "Equal"} difference
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">Current Streak</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <span className="text-xl font-bold">{comparison.myData.currentStreak}</span>
                    <span className="text-xs text-muted-foreground">days (You)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold">{comparison.friendData.currentStreak !== null ? comparison.friendData.currentStreak : "Private"}</span>
                    <span className="text-xs text-muted-foreground ml-1">days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">Level</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{comparison.myData.level}</Badge>
                  <Badge variant="outline">{comparison.friendData.level}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="You" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={friend.friendName} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading comparison data...</div>
      )}
    </div>
  );
}

// ===== DEEP DAILY COMPARISON =====

function DeepDailyComparison({ friend, date, onDateChange, onBack }: { friend: FriendItem; date: string; onDateChange: (d: string) => void; onBack: () => void }) {
  const { data: deep } = useQuery<DeepComparison>({
    queryKey: [`/api/grow/compare/${friend.friendId}/deep`, date],
    queryFn: async () => {
      const res = await fetch(`/api/grow/compare/${friend.friendId}/deep?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const metricsRows = deep && deep.friendData ? [
    { label: "Overall Score", mine: deep.myData.overallPct, theirs: deep.friendData.overallPct, suffix: "%" },
    { label: "Task Completion", mine: deep.myData.taskPct, theirs: deep.friendData.taskPct, suffix: "%" },
    { label: "Good Habits", mine: deep.myData.goodHabitPct, theirs: deep.friendData.goodHabitPct, suffix: "%" },
    { label: "Bad Habits", mine: deep.myData.badHabitPct, theirs: deep.friendData.badHabitPct, suffix: "%", invert: true },
    { label: "Hourly Tracking", mine: deep.myData.hourlyPct, theirs: deep.friendData.hourlyPct, suffix: "%" },
    { label: "Total Tasks", mine: deep.myData.totalTasks, theirs: deep.friendData.totalTasks, suffix: "" },
    { label: "Completed Tasks", mine: deep.myData.completedTasks, theirs: deep.friendData.completedTasks, suffix: "" },
  ] : [];

  return (
    <div className="space-y-6" data-testid="deep-comparison">
      <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-comparison">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold">Deep Compare: {date}</h2>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-40"
          data-testid="input-deep-date"
        />
      </div>

      {deep?.message ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-sm"><EyeOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />{deep.message}</CardContent></Card>
      ) : metricsRows.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-4 p-3 text-xs font-medium text-muted-foreground bg-muted/30">
                <span>Metric</span>
                <span className="text-center">You</span>
                <span className="text-center">{friend.friendName}</span>
                <span className="text-center">Difference</span>
              </div>
              {metricsRows.map((row) => {
                const diff = row.mine - row.theirs;
                const better = row.invert ? diff < 0 : diff > 0;
                const worse = row.invert ? diff > 0 : diff < 0;
                return (
                  <div key={row.label} className="grid grid-cols-4 p-3 text-sm items-center">
                    <span className="font-medium text-xs">{row.label}</span>
                    <span className="text-center font-bold">{row.mine}{row.suffix}</span>
                    <span className="text-center font-bold">{row.theirs}{row.suffix}</span>
                    <span className={`text-center text-xs font-medium ${better ? "text-emerald-400" : worse ? "text-red-400" : "text-muted-foreground"}`}>
                      {diff > 0 ? "+" : ""}{diff}{row.suffix}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading comparison...</div>
      )}
    </div>
  );
}

// ===== LEADERBOARD =====

function LeaderboardView({ period, onPeriodChange, onBack }: { period: string; onPeriodChange: (p: string) => void; onBack: () => void }) {
  const { data: entries = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/grow/leaderboard", period],
    queryFn: async () => {
      const res = await fetch(`/api/grow/leaderboard?period=${period}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const medalColors = ["text-yellow-400", "text-gray-400", "text-amber-600"];

  return (
    <div className="space-y-6" data-testid="leaderboard-view">
      <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-from-leaderboard">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Friends
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Leaderboard</h2>
        <div className="flex gap-1">
          {[{ val: "today", label: "Today" }, { val: "week", label: "Week" }, { val: "month", label: "Month" }].map((p) => (
            <Button key={p.val} size="sm" variant={period === p.val ? "default" : "outline"} onClick={() => onPeriodChange(p.val)} data-testid={`button-period-${p.val}`}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {entries.map((entry, idx) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-4 ${entry.isMe ? "bg-primary/5" : ""}`}
                data-testid={`leaderboard-entry-${idx}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg w-8 text-center font-bold ${idx < 3 ? medalColors[idx] : "text-muted-foreground"}`}>
                    {idx < 3 ? <Trophy className={`w-5 h-5 inline ${medalColors[idx]}`} /> : `#${idx + 1}`}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{entry.name} {entry.isMe && <Badge variant="secondary" className="text-[10px] ml-1">You</Badge>}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{entry.level}</Badge>
                      {entry.currentStreak !== null && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-orange-400" /> {entry.currentStreak}d
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {entry.average !== null ? (
                    <p className="text-xl font-bold">{entry.average}%</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Private</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== PRIVACY SETTINGS =====

function PrivacySettingsView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: privacy } = useQuery<PrivacySettings>({ queryKey: ["/api/grow/privacy"] });

  const updatePrivacy = useMutation({
    mutationFn: async (data: Partial<PrivacySettings>) => {
      await apiRequest("PUT", "/api/grow/privacy", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grow/privacy"] });
      toast({ title: "Privacy settings updated" });
    },
  });

  const toggles = privacy ? [
    { key: "shareDailyScore", label: "Share Daily Score", desc: "Allow friends to see your daily score", value: privacy.shareDailyScore },
    { key: "shareWeeklyAverage", label: "Share Weekly Average", desc: "Allow friends to see your weekly average", value: privacy.shareWeeklyAverage },
    { key: "shareMonthlyAverage", label: "Share Monthly Average", desc: "Allow friends to see your monthly average", value: privacy.shareMonthlyAverage },
    { key: "shareStreak", label: "Share Streak", desc: "Allow friends to see your streak data", value: privacy.shareStreak },
    { key: "shareHabitDetails", label: "Share Habit Details", desc: "Allow friends to see your habit details", value: privacy.shareHabitDetails },
    { key: "shareDailyBreakdown", label: "Share Deep Daily Breakdown", desc: "Allow friends to deep-compare specific days", value: privacy.shareDailyBreakdown },
  ] : [];

  return (
    <div className="space-y-6" data-testid="privacy-settings">
      <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-from-privacy">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <h2 className="text-lg font-bold flex items-center gap-2"><Eye className="w-5 h-5" /> Privacy Controls</h2>
      <p className="text-sm text-muted-foreground">Control what data your friends can see when comparing with you.</p>

      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between p-4" data-testid={`privacy-toggle-${t.key}`}>
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <Switch
                checked={t.value}
                onCheckedChange={(val) => updatePrivacy.mutate({ [t.key]: val })}
                data-testid={`switch-${t.key}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ===== GROUPS SECTION =====

function GroupsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeGroup, setActiveGroup] = useState<GrowGroup | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formRules, setFormRules] = useState("");
  const [formIcon, setFormIcon] = useState("👥");

  const { data: membership } = useQuery<{ hasPaid: boolean }>({ queryKey: ["/api/grow/membership"] });
  const { data: myGroups = [] } = useQuery<GrowGroup[]>({ queryKey: ["/api/grow/groups/my"] });
  const { data: publicGroups = [] } = useQuery<GrowGroup[]>({
    queryKey: ["/api/grow/groups/discover"],
    enabled: showDiscover,
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/grow/groups", {
        name: formName, description: formDescription, isPublic: formIsPublic, rules: formRules, icon: formIcon,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grow/groups/my"] });
      setCreateDialogOpen(false);
      setFormName("");
      setFormDescription("");
      setFormRules("");
      toast({ title: "Group created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const joinGroup = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/grow/groups/${id}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grow/groups/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grow/groups/discover"] });
      toast({ title: "Joined group!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (activeGroup) {
    return <GroupChatView group={activeGroup} onBack={() => setActiveGroup(null)} />;
  }

  return (
    <div className="space-y-6">
      {!membership?.hasPaid && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Paid Membership Required</p>
              <p className="text-xs text-muted-foreground">You need an active paid membership to create or join groups and send messages.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!membership?.hasPaid} data-testid="button-create-group">
              <Plus className="w-4 h-4 mr-2" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Group Name</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Morning Hustlers" data-testid="input-group-name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What is this group about?" rows={2} data-testid="input-group-description" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Group Rules (optional)</label>
                <Textarea value={formRules} onChange={(e) => setFormRules(e.target.value)} placeholder="Any rules for members..." rows={2} data-testid="input-group-rules" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={formIsPublic} onCheckedChange={setFormIsPublic} data-testid="switch-group-public" />
                  <span className="text-sm">{formIsPublic ? "Public" : "Private"}</span>
                </div>
                {formIsPublic ? <Globe className="w-4 h-4 text-muted-foreground" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
              </div>
              <Button className="w-full" disabled={!formName.trim() || createGroup.isPending} onClick={() => createGroup.mutate()} data-testid="button-save-group">
                {createGroup.isPending ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" onClick={() => setShowDiscover(!showDiscover)} data-testid="button-discover-groups">
          <Globe className="w-4 h-4 mr-2" /> {showDiscover ? "My Groups" : "Discover Groups"}
        </Button>
      </div>

      {!showDiscover ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> My Groups ({myGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myGroups.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No groups yet. Create one or discover public groups!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myGroups.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setActiveGroup(g)}
                    data-testid={`group-${g.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.icon || "👥"}</span>
                      <div>
                        <p className="font-medium text-sm">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.memberCount} members</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> Public Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {publicGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No public groups available yet.</p>
            ) : (
              <div className="space-y-2">
                {publicGroups.map((g) => {
                  const alreadyJoined = myGroups.some(mg => mg.id === g.id);
                  return (
                    <div key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30" data-testid={`discover-group-${g.id}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{g.icon || "👥"}</span>
                        <div>
                          <p className="font-medium text-sm">{g.name}</p>
                          <p className="text-xs text-muted-foreground">{g.description?.slice(0, 60) || "No description"} · {g.memberCount} members</p>
                        </div>
                      </div>
                      {alreadyJoined ? (
                        <Badge variant="secondary" className="text-xs">Joined</Badge>
                      ) : (
                        <Button size="sm" disabled={!membership?.hasPaid} onClick={() => joinGroup.mutate(g.id)} data-testid={`button-join-group-${g.id}`}>
                          Join
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===== GROUP CHAT VIEW =====

function GroupChatView({ group, onBack }: { group: GrowGroup; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: groupDetail } = useQuery<GrowGroup & { members: GroupMember[] }>({
    queryKey: [`/api/grow/groups/${group.id}`],
  });

  const { data: messages = [] } = useQuery<GroupMessage[]>({
    queryKey: [`/api/grow/groups/${group.id}/messages`],
    refetchInterval: 5000,
  });

  const { data: membership } = useQuery<{ hasPaid: boolean }>({ queryKey: ["/api/grow/membership"] });

  const sendMessage = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/grow/groups/${group.id}/messages`, { content: message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/grow/groups/${group.id}/messages`] });
      setMessage("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMsg = useMutation({
    mutationFn: async (msgId: number) => {
      await apiRequest("DELETE", `/api/grow/groups/${group.id}/messages/${msgId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/grow/groups/${group.id}/messages`] }),
  });

  const leaveGroup = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/grow/groups/${group.id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grow/groups/my"] });
      toast({ title: "Left group" });
      onBack();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGroup = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/grow/groups/${group.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grow/groups/my"] });
      toast({ title: "Group deleted" });
      onBack();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && membership?.hasPaid) sendMessage.mutate();
    }
  };

  return (
    <div className="space-y-4" data-testid="group-chat-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} data-testid="button-back-from-chat">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-xl">{group.icon || "👥"}</span>
          <div>
            <h2 className="font-bold text-sm">{group.name}</h2>
            <p className="text-[10px] text-muted-foreground">{groupDetail?.members?.length || group.memberCount} members</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowMembers(!showMembers)} data-testid="button-toggle-members">
            <Users className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => leaveGroup.mutate()} data-testid="button-leave-group">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showMembers && groupDetail?.members && (
        <Card>
          <CardContent className="p-3 space-y-2">
            {groupDetail.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm" data-testid={`member-${m.id}`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">{m.name.charAt(0)}</div>
                  <span>{m.name}</span>
                </div>
                <Badge variant={m.role === "owner" ? "default" : "outline"} className="text-[10px]">
                  {m.role === "owner" && <Crown className="w-3 h-3 mr-1" />}
                  {m.role === "admin" && <Shield className="w-3 h-3 mr-1" />}
                  {m.role}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="group flex gap-2" data-testid={`message-${msg.id}`}>
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  {(msg.senderName || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{msg.senderName || "Unknown"}</span>
                    {msg.createdAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm break-words">{msg.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={() => deleteMsg.mutate(msg.id)}
                  data-testid={`button-delete-msg-${msg.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="p-3 border-t border-border">
          {!membership?.hasPaid ? (
            <p className="text-sm text-muted-foreground text-center py-2">Paid membership required to send messages</p>
          ) : (
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1"
                maxLength={2000}
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                disabled={!message.trim() || sendMessage.isPending}
                onClick={() => sendMessage.mutate()}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
