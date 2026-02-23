import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Inbox, Mail, MailOpen, CheckCheck, Clock
} from "lucide-react";

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
  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/level/is-admin"],
  });

  const { data: inbox, isLoading: loadingInbox } = useQuery<InboxMessage[]>({
    queryKey: ["/api/admin/inbox"],
    enabled: adminCheck?.isAdmin === true,
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
    <div className="p-2 pt-14 sm:p-4 sm:pt-4 h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row border border-border rounded-xl overflow-hidden bg-card/30">

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
