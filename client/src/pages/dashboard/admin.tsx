import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, Inbox, Mail, MailOpen, CheckCheck, Clock,
  MessageSquare, Send, Reply, X, AlertCircle, Lightbulb, Bug, Sparkles
} from "lucide-react";

type InboxMessage = {
  id: number;
  userId: string;
  content: string;
  status: string;
  createdAt: string | null;
};

type FeedbackItem = {
  id: number;
  videoId: number;
  userId: string;
  feedbackType: string;
  message: string;
  status: string;
  adminReply: string | null;
  adminRepliedAt: string | null;
  createdAt: string | null;
};

type VideoItem = {
  id: number;
  title: string;
};

const FEEDBACK_TYPES = [
  { value: "doubt", label: "Ask a Doubt", icon: AlertCircle, color: "text-blue-400" },
  { value: "improvement", label: "Suggest Improvement", icon: Lightbulb, color: "text-yellow-400" },
  { value: "issue", label: "Report Issue", icon: Bug, color: "text-red-400" },
  { value: "feature", label: "Request Feature", icon: Sparkles, color: "text-purple-400" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"inbox" | "feedback">("inbox");

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/level/is-admin"],
  });

  if (adminCheck?.isAdmin === false) {
    return (
      <div className="p-2 pt-14 sm:p-4 sm:pt-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 pt-14 sm:p-4 sm:pt-4 h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex gap-2 mb-3 shrink-0">
        <Button
          variant={activeTab === "inbox" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("inbox")}
          className="gap-2"
          data-testid="button-tab-inbox"
        >
          <Inbox className="w-4 h-4" /> Inbox
        </Button>
        <Button
          variant={activeTab === "feedback" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("feedback")}
          className="gap-2"
          data-testid="button-tab-video-feedback"
        >
          <MessageSquare className="w-4 h-4" /> Video Feedback
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === "inbox" ? <InboxSection /> : <VideoFeedbackSection />}
      </div>
    </div>
  );
}

function InboxSection() {
  const queryClient = useQueryClient();
  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);

  const { data: inbox, isLoading: loadingInbox } = useQuery<InboxMessage[]>({
    queryKey: ["/api/admin/inbox"],
    refetchInterval: 15000,
  });

  const dismissInbox = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/admin/inbox/${id}`, { status: "read" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] });
    },
  });

  const pendingMessages = inbox?.filter(m => m.status === "pending") || [];
  const readMessages = inbox?.filter(m => m.status === "read") || [];
  const pendingCount = pendingMessages.length;

  const handleSelectMsg = (msg: InboxMessage) => {
    setSelectedMsg(msg);
    if (msg.status === "pending") {
      dismissInbox.mutate(msg.id);
    }
  };

  return (
    <div className="h-full flex flex-col sm:flex-row border border-border rounded-xl overflow-hidden bg-card/30">
      <div className={cn(
        "sm:w-[360px] sm:min-w-[360px] sm:border-r border-border flex flex-col bg-card/50",
        selectedMsg && "hidden sm:flex"
      )}>
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold" data-testid="text-admin-title">Admin Inbox</h1>
              <p className="text-[11px] text-muted-foreground">
                {pendingCount > 0 ? `${pendingCount} unread message${pendingCount > 1 ? "s" : ""}` : "All messages read"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingInbox ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : !inbox || inbox.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 px-4">
              <Inbox className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1 text-center">Messages from users will appear here</p>
            </div>
          ) : (
            <>
              {pendingMessages.length > 0 && (
                <>
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                      New ({pendingMessages.length})
                    </p>
                  </div>
                  {pendingMessages.map(msg => (
                    <InboxListItem
                      key={msg.id}
                      msg={msg}
                      isActive={selectedMsg?.id === msg.id}
                      onClick={() => handleSelectMsg(msg)}
                    />
                  ))}
                </>
              )}

              {readMessages.length > 0 && (
                <>
                  <div className="px-4 py-2 mt-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Read ({readMessages.length})
                    </p>
                  </div>
                  {readMessages.map(msg => (
                    <InboxListItem
                      key={msg.id}
                      msg={msg}
                      isActive={selectedMsg?.id === msg.id}
                      onClick={() => handleSelectMsg(msg)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className={cn(
        "flex-1 flex flex-col min-h-0",
        !selectedMsg && "hidden sm:flex"
      )}>
        {selectedMsg ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50">
              <button
                onClick={() => setSelectedMsg(null)}
                className="sm:hidden p-1 -ml-1 hover:bg-white/5 rounded-md"
                data-testid="btn-back-inbox"
              >
                <Shield className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
                {selectedMsg.userId.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">User {selectedMsg.userId.slice(0, 8)}</h2>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedMsg.createdAt
                    ? new Date(selectedMsg.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "Unknown time"}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Read</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              <div className="max-w-2xl">
                <div className="bg-white/[0.05] border border-border rounded-lg p-5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedMsg.content}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 px-1">
                  Received {selectedMsg.createdAt
                    ? new Date(selectedMsg.createdAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : ""}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex flex-1 flex-col items-center justify-center text-muted-foreground/40">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Inbox className="w-9 h-9" />
            </div>
            <p className="text-sm font-medium">Select a message to read</p>
            <p className="text-xs mt-1">User messages from all groups appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoFeedbackSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: allFeedback = [], isLoading } = useQuery<FeedbackItem[]>({
    queryKey: ["/api/admin/video-feedback"],
  });

  const { data: videos = [] } = useQuery<VideoItem[]>({
    queryKey: ["/api/admin/videos"],
  });

  const updateFeedbackStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/video-feedback/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/video-feedback"] });
    },
  });

  const replyToFeedback = useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) => {
      await apiRequest("POST", `/api/admin/video-feedback/${id}/reply`, { reply });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/video-feedback"] });
      setReplyingTo(null);
      setReplyText("");
      toast({ title: "Reply sent" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pendingFeedback = allFeedback.filter(fb => fb.status === "pending");
  const otherFeedback = allFeedback.filter(fb => fb.status !== "pending");

  return (
    <div className="h-full border border-border rounded-xl overflow-hidden bg-card/30 flex flex-col">
      <div className="p-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold" data-testid="text-feedback-title">Video Feedback</h1>
            <p className="text-[11px] text-muted-foreground">
              {pendingFeedback.length > 0 ? `${pendingFeedback.length} pending feedback` : "All feedback reviewed"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : allFeedback.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">No feedback received yet</p>
            <p className="text-xs mt-1">Feedback from users on videos will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {pendingFeedback.length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
                  Pending ({pendingFeedback.length})
                </p>
              </div>
            )}
            {pendingFeedback.map(fb => (
              <FeedbackCard
                key={fb.id}
                fb={fb}
                videos={videos}
                replyingTo={replyingTo}
                replyText={replyText}
                setReplyingTo={setReplyingTo}
                setReplyText={setReplyText}
                onStatusChange={(id, status) => updateFeedbackStatus.mutate({ id, status })}
                onReply={(id, reply) => replyToFeedback.mutate({ id, reply })}
                isReplying={replyToFeedback.isPending}
              />
            ))}

            {otherFeedback.length > 0 && pendingFeedback.length > 0 && (
              <div className="pt-2 mb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Reviewed ({otherFeedback.length})
                </p>
              </div>
            )}
            {otherFeedback.map(fb => (
              <FeedbackCard
                key={fb.id}
                fb={fb}
                videos={videos}
                replyingTo={replyingTo}
                replyText={replyText}
                setReplyingTo={setReplyingTo}
                setReplyText={setReplyText}
                onStatusChange={(id, status) => updateFeedbackStatus.mutate({ id, status })}
                onReply={(id, reply) => replyToFeedback.mutate({ id, reply })}
                isReplying={replyToFeedback.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({
  fb, videos, replyingTo, replyText, setReplyingTo, setReplyText,
  onStatusChange, onReply, isReplying,
}: {
  fb: FeedbackItem;
  videos: VideoItem[];
  replyingTo: number | null;
  replyText: string;
  setReplyingTo: (id: number | null) => void;
  setReplyText: (text: string) => void;
  onStatusChange: (id: number, status: string) => void;
  onReply: (id: number, reply: string) => void;
  isReplying: boolean;
}) {
  const ft = FEEDBACK_TYPES.find((t) => t.value === fb.feedbackType);
  const vid = videos.find((v) => v.id === fb.videoId);

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/50" data-testid={`admin-feedback-${fb.id}`}>
      <div className="mt-0.5">
        {ft && <ft.icon className={`w-4 h-4 ${ft.color}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{ft?.label || fb.feedbackType}</Badge>
          <Badge variant="secondary" className="text-[10px]">{vid?.title || `Video #${fb.videoId}`}</Badge>
          <span className="text-[10px] text-muted-foreground">User: {fb.userId.slice(0, 8)}...</span>
        </div>
        <p className="text-sm mb-2">{fb.message}</p>

        {fb.adminReply && (
          <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5 mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Reply className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-medium text-primary">Your Reply</span>
              {fb.adminRepliedAt && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(fb.adminRepliedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm">{fb.adminReply}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Select
            value={fb.status}
            onValueChange={(status) => onStatusChange(fb.id, status)}
          >
            <SelectTrigger className="w-28 h-7 text-xs" data-testid={`select-feedback-status-${fb.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => { setReplyingTo(replyingTo === fb.id ? null : fb.id); setReplyText(fb.adminReply || ""); }}
            data-testid={`button-reply-feedback-${fb.id}`}
          >
            <Reply className="w-3.5 h-3.5" /> {fb.adminReply ? "Edit Reply" : "Reply"}
          </Button>
          {fb.createdAt && (
            <span className="text-[10px] text-muted-foreground">{new Date(fb.createdAt).toLocaleDateString()}</span>
          )}
        </div>

        {replyingTo === fb.id && (
          <div className="mt-2 flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={2}
              className="text-sm"
              data-testid={`input-reply-${fb.id}`}
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                disabled={!replyText.trim() || isReplying}
                onClick={() => onReply(fb.id, replyText)}
                data-testid={`button-send-reply-${fb.id}`}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                data-testid={`button-cancel-reply-${fb.id}`}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InboxListItem({ msg, isActive, onClick }: {
  msg: InboxMessage; isActive: boolean; onClick: () => void;
}) {
  const isPending = msg.status === "pending";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left",
        isActive && "bg-white/5",
        isPending && "bg-emerald-500/[0.03]"
      )}
      data-testid={`inbox-msg-${msg.id}`}
    >
      <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        {isPending ? (
          <Mail className="w-5 h-5 text-emerald-400" />
        ) : (
          <MailOpen className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={cn("text-sm truncate", isPending ? "font-semibold" : "font-medium text-muted-foreground")}>
            User {msg.userId.slice(0, 8)}
          </span>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {msg.createdAt && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            )}
            {isPending && (
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
            )}
          </div>
        </div>
        <p className={cn("text-[12px] truncate", isPending ? "text-muted-foreground" : "text-muted-foreground/60")}>
          {msg.content}
        </p>
      </div>
    </button>
  );
}
