import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Send, Trash2, Inbox, MessageSquare, ArrowLeft,
  Star, Trophy, Crown, Gem, Flame, CheckCheck, Users, Lock
} from "lucide-react";
import { LEVELS, INTERACTIVE_LEVELS } from "@shared/schema";

const LEVEL_CONFIG: Record<string, { icon: any; color: string; avatarBg: string }> = {
  Unproductive: { icon: Shield, color: "text-gray-400", avatarBg: "bg-gray-700" },
  Bronze: { icon: Shield, color: "text-amber-600", avatarBg: "bg-amber-900" },
  Silver: { icon: Star, color: "text-gray-300", avatarBg: "bg-gray-600" },
  Gold: { icon: Trophy, color: "text-yellow-400", avatarBg: "bg-yellow-900" },
  Platinum: { icon: Crown, color: "text-cyan-400", avatarBg: "bg-cyan-900" },
  Diamond: { icon: Gem, color: "text-blue-400", avatarBg: "bg-blue-900" },
  Elite: { icon: Flame, color: "text-amber-400", avatarBg: "bg-amber-950" },
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

type InboxMessage = {
  id: number;
  userId: string;
  content: string;
  status: string;
  createdAt: string | null;
};

function formatMsgTime(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [postContent, setPostContent] = useState("");
  const [activeView, setActiveView] = useState<"list" | "chat" | "inbox">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/level/is-admin"],
  });

  const activeGroup = selectedLevel || "Unproductive";

  const { data: messages, isLoading: loadingMessages } = useQuery<GroupMessage[]>({
    queryKey: ["/api/groups", activeGroup, "messages"],
    enabled: activeView === "chat",
    refetchInterval: 10000,
  });

  const { data: inbox, isLoading: loadingInbox } = useQuery<InboxMessage[]>({
    queryKey: ["/api/admin/inbox"],
    enabled: adminCheck?.isAdmin === true,
  });

  const postMessage = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/groups/${activeGroup}/messages`, { content: postContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", activeGroup, "messages"] });
      setPostContent("");
      toast({ title: "Sent", description: `Message posted to ${activeGroup} group` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/groups/messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", activeGroup, "messages"] });
    },
  });

  const dismissInbox = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/admin/inbox/${id}`, { status: "read" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] });
    },
  });

  useEffect(() => {
    if (activeView === "chat" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeView]);

  if (adminCheck?.isAdmin === false) {
    return (
      <div className="p-4 pt-14 sm:p-8 sm:pt-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const pendingCount = inbox?.filter(m => m.status === "pending").length || 0;

  const openGroup = (level: string) => {
    setSelectedLevel(level);
    setActiveView("chat");
  };

  const goBack = () => {
    setActiveView("list");
    setSelectedLevel(null);
  };

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto">
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row border border-border rounded-xl overflow-hidden bg-card/30">

        <div className={cn(
          "sm:w-[320px] sm:min-w-[320px] sm:border-r border-border flex flex-col bg-card/50",
          activeView !== "list" && "hidden sm:flex"
        )}>
          <div className="p-4 border-b border-border/50">
            <h1 className="text-lg font-bold" data-testid="text-admin-title">Admin Panel</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Manage groups and moderate messages</p>
          </div>

          <button
            onClick={() => setActiveView("inbox")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-white/5 transition-colors text-left",
              activeView === "inbox" && "bg-white/5"
            )}
            data-testid="btn-admin-inbox"
          >
            <div className="w-11 h-11 rounded-full bg-emerald-900 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User Inbox</span>
                {pendingCount > 0 && (
                  <span className="w-5 h-5 bg-emerald-600 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0">
                    {pendingCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {pendingCount > 0 ? `${pendingCount} new message${pendingCount > 1 ? "s" : ""}` : "No new messages"}
              </p>
            </div>
          </button>

          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Level Groups</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {LEVELS.map(level => {
              const lc = LEVEL_CONFIG[level];
              const LI = lc?.icon || Shield;
              return (
                <button
                  key={level}
                  onClick={() => openGroup(level)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left",
                    activeView === "chat" && activeGroup === level && "bg-white/5"
                  )}
                  data-testid={`btn-level-${level}`}
                >
                  <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shrink-0", lc?.avatarBg)}>
                    <LI className={cn("w-5 h-5", lc?.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{level}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {INTERACTIVE_LEVELS.includes(level) ? "Chat enabled" : "Read-only group"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={cn(
          "flex-1 flex flex-col min-h-0",
          activeView === "list" && "hidden sm:flex"
        )}>

          {activeView === "chat" && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50">
                <button onClick={goBack} className="sm:hidden p-1 -ml-1 hover:bg-white/5 rounded-lg" data-testid="btn-back">
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
                        <h2 className="text-sm font-semibold">{activeGroup} Group</h2>
                        <p className="text-[11px] text-muted-foreground">Admin view</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div
                className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1"
                data-testid="admin-messages"
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
                    <MessageSquare className="w-8 h-8 mb-2" />
                    <p className="text-sm">No messages in this group</p>
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
                          <div className={cn("flex mb-0.5 group", sameSender ? "mt-0.5" : "mt-2.5")} data-testid={`admin-msg-${msg.id}`}>
                            <div className={cn(
                              "max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-1.5 relative",
                              msg.isAdmin
                                ? "bg-emerald-900/40 border border-emerald-800/30"
                                : "bg-white/[0.07] border border-white/[0.06]"
                            )}>
                              {!sameSender && (
                                <p className={cn("text-[11px] font-semibold mb-0.5", msg.isAdmin ? "text-emerald-400" : "text-cyan-400")}>
                                  {msg.isAdmin ? "Admin (You)" : msg.senderName || "Member"}
                                </p>
                              )}
                              <div className="flex items-end gap-3">
                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap flex-1">{msg.content}</p>
                                <span className="text-[10px] text-muted-foreground/60 shrink-0 self-end translate-y-0.5">
                                  {formatMsgTime(msg.createdAt)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteMessage.mutate(msg.id)}
                              className="opacity-0 group-hover:opacity-100 ml-2 self-center text-red-400/60 hover:text-red-400 transition-all"
                              data-testid={`btn-delete-msg-${msg.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="px-3 sm:px-4 py-3 border-t border-border/50 bg-card/50">
                <div className="flex items-end gap-2">
                  <div className="flex-1 bg-white/5 border border-border rounded-2xl px-4 py-2.5">
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder={`Message ${activeGroup} group as Admin...`}
                      rows={1}
                      className="w-full bg-transparent text-sm resize-none focus:outline-none max-h-[100px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (postContent.trim()) postMessage.mutate();
                        }
                      }}
                      onInput={(e) => {
                        const t = e.target as HTMLTextAreaElement;
                        t.style.height = "auto";
                        t.style.height = Math.min(t.scrollHeight, 100) + "px";
                      }}
                      data-testid="textarea-admin-post"
                    />
                  </div>
                  <Button
                    size="icon"
                    onClick={() => postContent.trim() && postMessage.mutate()}
                    disabled={!postContent.trim() || postMessage.isPending}
                    className="rounded-full shrink-0"
                    data-testid="button-admin-post"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeView === "inbox" && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50">
                <button onClick={goBack} className="sm:hidden p-1 -ml-1 hover:bg-white/5 rounded-lg" data-testid="btn-back-inbox">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">User Inbox</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {pendingCount > 0 ? `${pendingCount} unread` : "All caught up"}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingInbox ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : !inbox || inbox.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
                    <Inbox className="w-12 h-12 mb-3" />
                    <p className="text-sm">No messages from users yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {inbox.map(msg => (
                      <div
                        key={msg.id}
                        className={cn(
                          "px-4 py-3 hover:bg-white/[0.02] transition-colors",
                          msg.status === "pending" && "bg-emerald-500/[0.03]"
                        )}
                        data-testid={`inbox-msg-${msg.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                            {msg.userId.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm font-medium">User {msg.userId.slice(0, 8)}</span>
                              <div className="flex items-center gap-2">
                                {msg.createdAt && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                  </span>
                                )}
                                {msg.status === "pending" && (
                                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />
                                )}
                              </div>
                            </div>
                            <p className="text-[13px] text-muted-foreground line-clamp-2 whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                        {msg.status === "pending" && (
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => dismissInbox.mutate(msg.id)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                              data-testid={`btn-dismiss-${msg.id}`}
                            >
                              Mark as read
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeView === "list" && (
            <div className="hidden sm:flex flex-1 flex-col items-center justify-center text-muted-foreground/40">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Shield className="w-9 h-9" />
              </div>
              <p className="text-sm font-medium">Select a group or view inbox</p>
              <p className="text-xs mt-1">Post messages to any level group</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
