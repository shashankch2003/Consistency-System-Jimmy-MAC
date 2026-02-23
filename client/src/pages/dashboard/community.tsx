import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Trophy, Crown, Star, Gem, Zap, Send, Lock,
  TrendingUp, Target, MessageCircle, ArrowLeft, Info,
  ChevronRight, Users, CheckCheck
} from "lucide-react";
import { LEVELS, LEVEL_INDEX, LEVEL_REQUIREMENTS, INTERACTIVE_LEVELS } from "@shared/schema";

const LEVEL_CONFIG: Record<string, { icon: any; color: string; bg: string; avatarBg: string }> = {
  Unproductive: { icon: Shield, color: "text-gray-400", bg: "bg-gray-500/10", avatarBg: "bg-gray-700" },
  Bronze: { icon: Shield, color: "text-amber-600", bg: "bg-amber-600/10", avatarBg: "bg-amber-900" },
  Silver: { icon: Star, color: "text-gray-300", bg: "bg-gray-300/10", avatarBg: "bg-gray-600" },
  Gold: { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10", avatarBg: "bg-yellow-900" },
  Platinum: { icon: Crown, color: "text-cyan-400", bg: "bg-cyan-400/10", avatarBg: "bg-cyan-900" },
  Diamond: { icon: Gem, color: "text-blue-400", bg: "bg-blue-400/10", avatarBg: "bg-blue-900" },
  Elite: { icon: Zap, color: "text-purple-400", bg: "bg-purple-400/10", avatarBg: "bg-purple-900" },
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

function formatMsgTime(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type ViewType = "groups" | "chat" | "progress" | "contact";

export default function CommunityPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chatInput, setChatInput] = useState("");
  const [contactInput, setContactInput] = useState("");
  const [activeView, setActiveView] = useState<ViewType>("groups");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [prevView, setPrevView] = useState<ViewType>("groups");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: levelStatus, isLoading } = useQuery<LevelStatus>({
    queryKey: ["/api/level/status"],
  });

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/level/is-admin"],
  });

  const currentLevel = levelStatus?.level || "Unproductive";
  const config = LEVEL_CONFIG[currentLevel];
  const isUserAdmin = adminCheck?.isAdmin === true;

  const activeGroup = selectedGroup || currentLevel;
  const canChat = INTERACTIVE_LEVELS.includes(currentLevel) && activeGroup === currentLevel;

  const { data: messages, isLoading: loadingMessages } = useQuery<GroupMessage[]>({
    queryKey: ["/api/groups", activeGroup, "messages"],
    enabled: activeView === "chat",
    refetchInterval: 10000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/groups/${activeGroup}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", activeGroup, "messages"] });
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

  useEffect(() => {
    if (activeView === "chat" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeView]);

  const openGroup = (level: string) => {
    setSelectedGroup(level);
    setPrevView(activeView);
    setActiveView("chat");
  };

  const openView = (view: ViewType) => {
    setPrevView(activeView);
    setActiveView(view);
  };

  const goBack = () => {
    if (activeView === "chat") {
      setActiveView("groups");
    } else {
      setActiveView(prevView === activeView ? "groups" : prevView);
    }
  };

  const showRightPanel = activeView !== "groups";

  if (isLoading) {
    return (
      <div className="p-4 pt-14 sm:p-8 sm:pt-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const progress = levelStatus?.currentMonthProgress;

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto">
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row border border-border rounded-xl overflow-hidden bg-card/30">

        <div className={cn(
          "sm:w-[320px] sm:min-w-[320px] sm:border-r border-border flex flex-col bg-card/50",
          showRightPanel && "hidden sm:flex"
        )}>
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold" data-testid="text-community-title">Community</h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openView("progress")}
                  className={cn("p-2 rounded-md hover:bg-white/5 transition-colors", activeView === "progress" ? "text-white bg-white/5" : "text-muted-foreground")}
                  title="My Progress"
                  data-testid="btn-progress"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openView("contact")}
                  className={cn("p-2 rounded-md hover:bg-white/5 transition-colors", activeView === "contact" ? "text-white bg-white/5" : "text-muted-foreground")}
                  title="Contact Admin"
                  data-testid="btn-contact-admin"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={cn("flex items-center gap-3 p-2.5 rounded-md", config?.bg)}>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config?.avatarBg)}>
                {(() => { const LI = config?.icon || Shield; return <LI className={cn("w-5 h-5", config?.color)} />; })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", config?.color)} data-testid="text-level-name">{currentLevel}</p>
                <p className="text-[11px] text-muted-foreground">
                  Level {LEVEL_INDEX[currentLevel]} · {levelStatus?.consecutiveMonths || 0} month streak
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Your Group</p>
            </div>
            <GroupListItem
              level={currentLevel}
              isActive={activeView === "chat" && activeGroup === currentLevel}
              isCurrent
              onClick={() => openGroup(currentLevel)}
            />
            <div className="px-3 py-2 mt-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">All Level Groups</p>
            </div>
            {LEVELS.filter(l => l !== currentLevel).map(level => (
              <GroupListItem
                key={level}
                level={level}
                isActive={activeView === "chat" && activeGroup === level}
                locked={!isUserAdmin && level !== currentLevel}
                onClick={() => {
                  if (isUserAdmin || level === currentLevel) openGroup(level);
                }}
              />
            ))}
          </div>
        </div>

        <div className={cn(
          "flex-1 flex flex-col min-h-0",
          !showRightPanel && "hidden sm:flex"
        )}>
          {activeView === "chat" && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50">
                <button onClick={goBack} className="sm:hidden p-1 -ml-1 hover:bg-white/5 rounded-md" data-testid="btn-back">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {(() => {
                  const gc = LEVEL_CONFIG[activeGroup];
                  const GI = gc?.icon || Shield;
                  return (
                    <>
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", gc?.avatarBg)}>
                        <GI className={cn("w-5 h-5", gc?.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-semibold" data-testid="text-group-title">{activeGroup} Group</h2>
                        <p className="text-[11px] text-muted-foreground">
                          {INTERACTIVE_LEVELS.includes(activeGroup) ? "Chat enabled" : "Read-only group"}
                          {activeGroup !== currentLevel && !isUserAdmin && " · View only"}
                        </p>
                      </div>
                    </>
                  );
                })()}
                {!canChat && !isUserAdmin && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-white/5 rounded-full px-2.5 py-1">
                    <Lock className="w-3 h-3" />
                    <span className="hidden sm:inline">Read-only</span>
                  </div>
                )}
              </div>

              <div
                className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1"
                data-testid="group-messages"
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                      <MessageCircle className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs mt-1">Be the first to send a message</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const prev = idx > 0 ? messages[idx - 1] : null;
                      const showDate = !prev || (msg.createdAt && prev.createdAt &&
                        new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString());
                      const sameSender = prev && prev.createdBy === msg.createdBy && !showDate;

                      return (
                        <div key={msg.id}>
                          {showDate && msg.createdAt && (
                            <div className="flex justify-center my-3">
                              <span className="text-[10px] bg-white/10 text-muted-foreground px-3 py-1 rounded-full">
                                {new Date(msg.createdAt).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
                              </span>
                            </div>
                          )}
                          <ChatBubble msg={msg} compact={!!sameSender} />
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {(canChat || isUserAdmin) && (
                <div className="px-3 sm:px-4 py-3 border-t border-border/50 bg-card/50">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-white/5 border border-border rounded-2xl px-4 py-2.5">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message"
                        rows={1}
                        className="w-full bg-transparent text-sm resize-none focus:outline-none max-h-[100px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (chatInput.trim()) sendMessage.mutate(chatInput);
                          }
                        }}
                        onInput={(e) => {
                          const t = e.target as HTMLTextAreaElement;
                          t.style.height = "auto";
                          t.style.height = Math.min(t.scrollHeight, 100) + "px";
                        }}
                        data-testid="input-chat"
                      />
                    </div>
                    <Button
                      size="icon"
                      onClick={() => chatInput.trim() && sendMessage.mutate(chatInput)}
                      disabled={!chatInput.trim() || sendMessage.isPending}
                      className="rounded-full shrink-0"
                      data-testid="button-send-chat"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!canChat && !isUserAdmin && (
                <div className="px-4 py-3 border-t border-border/50 bg-card/50 text-center">
                  <p className="text-xs text-muted-foreground">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Chat is read-only. Reach <strong>Platinum</strong> level to unlock messaging.
                  </p>
                </div>
              )}
            </>
          )}

          {activeView === "progress" && progress && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50">
                <button onClick={goBack} className="sm:hidden p-1 -ml-1 hover:bg-white/5 rounded-md" data-testid="btn-back-progress">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">My Progress</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Tasks Avg" value={`${progress.avgTaskCompletion}%`} icon={Target} />
                  <StatCard label="Good Habits" value={`${progress.avgGoodHabits}%`} icon={TrendingUp} />
                  <StatCard label="Hourly" value={`${progress.avgHourlyCompletion}%`} icon={Shield} />
                  <StatCard label="Bad Habit Days" value={`${progress.badHabitDays}`} icon={Shield} negative />
                </div>

                <div className="bg-white/5 border border-border rounded-md p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qualifying Days ({progress.daysTracked} tracked)</h3>
                  <div className="space-y-2.5">
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
                            <span className="text-muted-foreground">{days}/{needed} days</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", lc.color.replace("text-", "bg-"))} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/5 border border-border rounded-md p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Level Requirements</h3>
                  <div className="space-y-1.5">
                    {LEVELS.filter(l => l !== "Unproductive").map(level => {
                      const req = LEVEL_REQUIREMENTS[level];
                      const lc = LEVEL_CONFIG[level];
                      const LI = lc.icon;
                      const isCurrent = level === currentLevel;
                      return (
                        <div key={level} className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs", isCurrent && "bg-white/5 border border-white/10")}>
                          <LI className={cn("w-3.5 h-3.5 shrink-0", lc.color)} />
                          <span className={cn("font-medium min-w-[60px]", lc.color)}>{level}</span>
                          <span className="text-muted-foreground flex-1">
                            {req.percent}% · {req.days > 0 ? `${req.days}d` : "All"} · {req.consecutiveMonths}mo
                          </span>
                          {isCurrent && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">You</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === "contact" && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50">
                <button onClick={goBack} className="sm:hidden p-1 -ml-1 hover:bg-white/5 rounded-md" data-testid="btn-back-contact">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Send className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Contact Admin</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3 bg-white/5 rounded-md p-4">
                  <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Send a private message to the admin. They may share valuable insights with the community group.
                  </p>
                </div>
                <textarea
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  placeholder="Write your message..."
                  className="w-full min-h-[180px] bg-white/5 border border-border rounded-md p-4 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-white/20"
                  data-testid="textarea-contact-admin"
                />
                <Button
                  onClick={() => contactInput.trim() && sendToAdmin.mutate(contactInput)}
                  disabled={!contactInput.trim() || sendToAdmin.isPending}
                  className="w-full gap-2"
                  data-testid="button-send-to-admin"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </div>
            </div>
          )}

          {activeView === "groups" && (
            <div className="hidden sm:flex flex-1 flex-col items-center justify-center text-muted-foreground/40">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Users className="w-9 h-9" />
              </div>
              <p className="text-sm font-medium">Select a group to view messages</p>
              <p className="text-xs mt-1">Your current level: <span className={config?.color}>{currentLevel}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupListItem({ level, isActive, isCurrent, locked, onClick }: {
  level: string; isActive?: boolean; isCurrent?: boolean; locked?: boolean; onClick: () => void;
}) {
  const lc = LEVEL_CONFIG[level];
  const LI = lc?.icon || Shield;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left",
        isActive && "bg-white/5",
        locked && "opacity-50 cursor-not-allowed hover:bg-transparent"
      )}
      disabled={locked}
      data-testid={`group-item-${level}`}
    >
      <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shrink-0", lc?.avatarBg)}>
        <LI className={cn("w-5 h-5", lc?.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{level} Group</span>
          {isCurrent && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-2 shrink-0", lc?.bg, lc?.color)}>
              You
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {locked ? (
            <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Not your level</span>
          ) : INTERACTIVE_LEVELS.includes(level) ? (
            "Chat enabled"
          ) : (
            "Read-only group"
          )}
        </p>
      </div>
      {!locked && <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />}
    </button>
  );
}

function ChatBubble({ msg, compact }: { msg: GroupMessage; compact: boolean }) {
  const isAdminMsg = msg.isAdmin;

  return (
    <div className={cn("flex mb-0.5", compact ? "mt-0.5" : "mt-2.5")} data-testid={`msg-${msg.id}`}>
      <div className={cn(
        "max-w-[85%] sm:max-w-[70%] rounded-md px-3 py-1.5 relative",
        isAdminMsg
          ? "bg-emerald-900/40 border border-emerald-800/30"
          : "bg-white/[0.07] border border-white/[0.06]"
      )}>
        {!compact && (
          <p className={cn("text-[11px] font-semibold mb-0.5", isAdminMsg ? "text-emerald-400" : "text-cyan-400")}>
            {isAdminMsg ? "Admin" : msg.senderName || "Member"}
          </p>
        )}
        <div className="flex items-end gap-3">
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap flex-1">{msg.content}</p>
          <span className="text-[10px] text-muted-foreground/60 shrink-0 self-end translate-y-0.5 flex items-center gap-0.5">
            {formatMsgTime(msg.createdAt)}
            {isAdminMsg && <CheckCheck className="w-3 h-3 text-cyan-400/60 ml-0.5" />}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, negative }: { label: string; value: string; icon: any; negative?: boolean }) {
  return (
    <div className="bg-white/5 border border-border rounded-md p-3 text-center">
      <Icon className={cn("w-4 h-4 mx-auto mb-1", negative ? "text-red-400" : "text-muted-foreground")} />
      <p className={cn("text-lg font-bold", negative && parseInt(value) > 0 ? "text-red-400" : "")}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
