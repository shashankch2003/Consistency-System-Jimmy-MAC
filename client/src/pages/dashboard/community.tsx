import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Trophy, Crown, Star, Gem, Zap, Send, Lock,
  TrendingUp, Calendar, Target, MessageCircle, ChevronRight, Info
} from "lucide-react";
import { LEVELS, LEVEL_INDEX, LEVEL_REQUIREMENTS, INTERACTIVE_LEVELS } from "@shared/schema";

const LEVEL_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string; gradient: string }> = {
  Unproductive: { icon: Shield, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", gradient: "from-gray-600 to-gray-800" },
  Bronze: { icon: Shield, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/30", gradient: "from-amber-700 to-amber-900" },
  Silver: { icon: Star, color: "text-gray-300", bg: "bg-gray-300/10", border: "border-gray-300/30", gradient: "from-gray-400 to-gray-600" },
  Gold: { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", gradient: "from-yellow-500 to-yellow-700" },
  Platinum: { icon: Crown, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30", gradient: "from-cyan-500 to-cyan-700" },
  Diamond: { icon: Gem, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", gradient: "from-blue-500 to-blue-700" },
  Elite: { icon: Zap, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30", gradient: "from-purple-500 to-purple-700" },
};

type LevelStatus = {
  level: string;
  consecutiveMonths: number;
  currentMonthProgress: {
    qualifyingDays: Record<string, number>;
    avgTaskCompletion: number;
    avgGoodHabits: number;
    avgHourlyCompletion: number;
    badHabitDays: number;
    daysTracked: number;
  };
  nextLevel: string | null;
  nextLevelRequirements: { percent: number; days: number; consecutiveMonths: number } | null;
};

type GroupMessage = {
  id: number;
  level: string;
  content: string;
  createdBy: string;
  senderName: string | null;
  isAdmin: boolean;
  createdAt: string | null;
};

export default function CommunityPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chatInput, setChatInput] = useState("");
  const [contactInput, setContactInput] = useState("");
  const [activeTab, setActiveTab] = useState<"group" | "progress" | "contact">("group");

  const { data: levelStatus, isLoading } = useQuery<LevelStatus>({
    queryKey: ["/api/level/status"],
  });

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/level/is-admin"],
  });

  const currentLevel = levelStatus?.level || "Unproductive";
  const config = LEVEL_CONFIG[currentLevel];
  const LevelIcon = config?.icon || Shield;
  const canChat = INTERACTIVE_LEVELS.includes(currentLevel);

  const { data: messages, isLoading: loadingMessages } = useQuery<GroupMessage[]>({
    queryKey: ["/api/groups", currentLevel, "messages"],
    enabled: !!currentLevel,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/groups/${currentLevel}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", currentLevel, "messages"] });
      setChatInput("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendToAdmin = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/inbox", { content });
    },
    onSuccess: () => {
      setContactInput("");
      toast({ title: "Sent", description: "Your message has been sent to the admin." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="p-4 pt-14 sm:p-8 sm:pt-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const progress = levelStatus?.currentMonthProgress;
  const nextLevel = levelStatus?.nextLevel;
  const nextReq = levelStatus?.nextLevelRequirements;

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-6 max-w-5xl mx-auto">
      <div className={cn("rounded-2xl border p-6 relative overflow-hidden", config?.border)}>
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-20", config?.gradient)} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", config?.bg)}>
            <LevelIcon className={cn("w-8 h-8", config?.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-level-name">{currentLevel}</h1>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", config?.bg, config?.color)}>
                Level {LEVEL_INDEX[currentLevel]}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {levelStatus?.consecutiveMonths || 0} consecutive month{(levelStatus?.consecutiveMonths || 0) !== 1 ? "s" : ""} qualified
            </p>
          </div>
          {nextLevel && nextReq && (
            <div className="bg-card/50 border border-border rounded-xl p-3 text-sm">
              <p className="text-muted-foreground text-xs mb-1">Next Level</p>
              <div className="flex items-center gap-2">
                {(() => { const NI = LEVEL_CONFIG[nextLevel]?.icon || Shield; return <NI className={cn("w-4 h-4", LEVEL_CONFIG[nextLevel]?.color)} />; })()}
                <span className="font-semibold">{nextLevel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {nextReq.percent}% · {nextReq.days > 0 ? `${nextReq.days} days` : "All days"} · {nextReq.consecutiveMonths}mo
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-card/50 border border-border rounded-xl p-1">
        {[
          { key: "group" as const, label: "Group", icon: MessageCircle },
          { key: "progress" as const, label: "Progress", icon: TrendingUp },
          { key: "contact" as const, label: "Contact Admin", icon: Send },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.key ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white/70"
            )}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "group" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" data-testid="text-group-title">{currentLevel} Group</h2>
            {!canChat && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/50 border border-border rounded-lg px-3 py-1.5">
                <Lock className="w-3 h-3" />
                Read-only · Chat unlocks at Platinum
              </div>
            )}
            {canChat && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                <MessageCircle className="w-3 h-3" />
                Chat enabled
              </div>
            )}
          </div>

          <div className="bg-card/30 border border-border rounded-xl min-h-[300px] max-h-[500px] overflow-y-auto flex flex-col-reverse p-4 gap-3" data-testid="group-messages">
            {loadingMessages ? (
              <div className="text-center text-muted-foreground py-8">Loading messages...</div>
            ) : !messages || messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No messages yet in this group.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-xl px-4 py-3 max-w-[85%]",
                    msg.isAdmin
                      ? "bg-emerald-500/10 border border-emerald-500/20 self-start"
                      : "bg-white/5 border border-white/10 self-end"
                  )}
                  data-testid={`msg-${msg.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs font-semibold", msg.isAdmin ? "text-emerald-400" : "text-white/70")}>
                      {msg.isAdmin ? "Admin" : msg.senderName || "Member"}
                    </span>
                    {msg.createdAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))
            )}
          </div>

          {canChat && (
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && chatInput.trim() && sendMessage.mutate(chatInput)}
                data-testid="input-chat"
              />
              <Button
                onClick={() => chatInput.trim() && sendMessage.mutate(chatInput)}
                disabled={!chatInput.trim() || sendMessage.isPending}
                size="icon"
                data-testid="button-send-chat"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === "progress" && progress && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Tasks Avg" value={`${progress.avgTaskCompletion}%`} icon={Target} />
            <StatCard label="Good Habits" value={`${progress.avgGoodHabits}%`} icon={TrendingUp} />
            <StatCard label="Hourly" value={`${progress.avgHourlyCompletion}%`} icon={Calendar} />
            <StatCard label="Bad Habit Days" value={`${progress.badHabitDays}`} icon={Shield} negative />
          </div>

          <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Qualifying Days This Month</h3>
            <p className="text-xs text-muted-foreground">{progress.daysTracked} days tracked so far</p>
            <div className="space-y-2">
              {LEVELS.filter(l => l !== "Unproductive").map(level => {
                const days = progress.qualifyingDays[level] || 0;
                const req = LEVEL_REQUIREMENTS[level];
                const needed = level === "Elite" ? progress.daysTracked : req.days;
                const pct = needed > 0 ? Math.min(100, Math.round((days / needed) * 100)) : 0;
                const lc = LEVEL_CONFIG[level];
                return (
                  <div key={level} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-medium", lc.color)}>{level}</span>
                      <span className="text-muted-foreground">{days}/{needed} days ({req.percent}%+ needed)</span>
                    </div>
                    <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", lc.color.replace("text-", "bg-"))}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card/50 border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Level Requirements</h3>
            <div className="space-y-2">
              {LEVELS.filter(l => l !== "Unproductive").map(level => {
                const req = LEVEL_REQUIREMENTS[level];
                const lc = LEVEL_CONFIG[level];
                const LI = lc.icon;
                const isCurrent = level === currentLevel;
                return (
                  <div key={level} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm", isCurrent && "bg-white/5 border border-white/10")}>
                    <LI className={cn("w-4 h-4 shrink-0", lc.color)} />
                    <span className={cn("font-medium min-w-[70px]", lc.color)}>{level}</span>
                    <span className="text-muted-foreground flex-1 text-xs">
                      {req.percent}% all metrics · {req.days > 0 ? `${req.days} days` : "All days"} · {req.consecutiveMonths} month{req.consecutiveMonths !== 1 ? "s" : ""} · 0% bad habits
                    </span>
                    {isCurrent && <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "contact" && (
        <div className="space-y-4">
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Send a message directly to the admin. If your content is valuable, the admin may share it with the group.
              </p>
            </div>
            <textarea
              value={contactInput}
              onChange={(e) => setContactInput(e.target.value)}
              placeholder="Write your message to the admin..."
              className="w-full min-h-[150px] bg-background border border-border rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-white/20"
              data-testid="textarea-contact-admin"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={() => contactInput.trim() && sendToAdmin.mutate(contactInput)}
                disabled={!contactInput.trim() || sendToAdmin.isPending}
                className="gap-2"
                data-testid="button-send-to-admin"
              >
                <Send className="w-4 h-4" />
                Send to Admin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, negative }: { label: string; value: string; icon: any; negative?: boolean }) {
  return (
    <div className="bg-card/50 border border-border rounded-xl p-3 text-center">
      <Icon className={cn("w-5 h-5 mx-auto mb-1", negative ? "text-red-400" : "text-primary")} />
      <p className={cn("text-lg font-bold", negative && parseInt(value) > 0 ? "text-red-400" : "")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
