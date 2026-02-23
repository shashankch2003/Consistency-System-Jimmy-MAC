import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Shield, Send, Trash2, Inbox, Users, MessageSquare, ChevronDown } from "lucide-react";
import { LEVELS } from "@shared/schema";

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

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState("Unproductive");
  const [postContent, setPostContent] = useState("");
  const [activeTab, setActiveTab] = useState<"post" | "inbox">("post");

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/level/is-admin"],
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<GroupMessage[]>({
    queryKey: ["/api/groups", selectedLevel, "messages"],
  });

  const { data: inbox, isLoading: loadingInbox } = useQuery<InboxMessage[]>({
    queryKey: ["/api/admin/inbox"],
    enabled: adminCheck?.isAdmin === true,
  });

  const postMessage = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/groups/${selectedLevel}/messages`, { content: postContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedLevel, "messages"] });
      setPostContent("");
      toast({ title: "Posted", description: `Message sent to ${selectedLevel} group` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/groups/messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedLevel, "messages"] });
      toast({ title: "Deleted" });
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

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-admin-title">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage groups and moderate user messages</p>
      </div>

      <div className="flex gap-1 bg-card/50 border border-border rounded-xl p-1">
        <button
          onClick={() => setActiveTab("post")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
            activeTab === "post" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white/70"
          )}
          data-testid="tab-post"
        >
          <MessageSquare className="w-4 h-4" />
          Post to Groups
        </button>
        <button
          onClick={() => setActiveTab("inbox")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
            activeTab === "inbox" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white/70"
          )}
          data-testid="tab-inbox"
        >
          <Inbox className="w-4 h-4" />
          Inbox
          {inbox && inbox.filter(m => m.status === "pending").length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
              {inbox.filter(m => m.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "post" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map(level => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  selectedLevel === level
                    ? "bg-white/10 border-white/20 text-white"
                    : "border-border text-muted-foreground hover:text-white hover:border-white/20"
                )}
                data-testid={`btn-level-${level}`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold">Post to {selectedLevel} Group</h3>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={`Write a message for the ${selectedLevel} group...`}
              className="w-full min-h-[120px] bg-background border border-border rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-white/20"
              data-testid="textarea-admin-post"
            />
            <div className="flex justify-end">
              <Button
                onClick={() => postContent.trim() && postMessage.mutate()}
                disabled={!postContent.trim() || postMessage.isPending}
                className="gap-2"
                data-testid="button-admin-post"
              >
                <Send className="w-4 h-4" />
                Post Message
              </Button>
            </div>
          </div>

          <div className="bg-card/30 border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{selectedLevel} Group Messages</h3>
            {loadingMessages ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Loading...</p>
            ) : !messages || messages.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No messages yet</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {messages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-3 bg-card/50 border border-border rounded-lg p-3" data-testid={`admin-msg-${msg.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-semibold", msg.isAdmin ? "text-emerald-400" : "text-white/70")}>
                          {msg.isAdmin ? "Admin" : msg.senderName || "Member"}
                        </span>
                        {msg.createdAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-red-400 hover:text-red-300 h-7 w-7"
                      onClick={() => deleteMessage.mutate(msg.id)}
                      data-testid={`btn-delete-msg-${msg.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "inbox" && (
        <div className="space-y-3">
          {loadingInbox ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading inbox...</p>
          ) : !inbox || inbox.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/60">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No messages in inbox</p>
            </div>
          ) : (
            inbox.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  "bg-card/50 border rounded-xl p-4",
                  msg.status === "pending" ? "border-yellow-500/30" : "border-border"
                )}
                data-testid={`inbox-msg-${msg.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">User: {msg.userId.slice(0, 8)}...</span>
                      {msg.status === "pending" && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">New</span>
                      )}
                      {msg.createdAt && (
                        <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dismissInbox.mutate(msg.id)}
                      className="shrink-0 text-xs"
                      data-testid={`btn-dismiss-${msg.id}`}
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
