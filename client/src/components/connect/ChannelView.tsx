import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Hash, Lock, Settings, Users, Search, Bell, Pin } from "lucide-react";
import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Channel {
  id: string;
  name: string;
  displayName: string;
  type: string;
  description?: string;
  topic?: string;
  memberCount: number;
}

interface ChannelViewProps {
  channelId: string;
  currentUserId: string;
  currentUserName: string;
  workspaceId?: number;
}

const channelTypeIcon = (type: string) =>
  type === "private" ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />;

export default function ChannelView({ channelId, currentUserId, currentUserName, workspaceId }: ChannelViewProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: channelData } = useQuery<{ channel: Channel }[]>({
    queryKey: ["/api/channels/my"],
    queryFn: async () => {
      const res = await fetch("/api/channels/my", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const channel = channelData?.find(m => m.channel.id === channelId)?.channel;

  const { data: typingUsers = [] } = useQuery<{ userId: string; userName: string }[]>({
    queryKey: ["/api/typing", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/typing/${channelId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 2000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/messages", { channelId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", channelId] });
      queryClient.invalidateQueries({ queryKey: ["/api/channels/my"] });
    },
    onError: (e: any) => toast({ title: "Error sending message", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      apiRequest("PATCH", `/api/messages/${messageId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", channelId] });
      setEditingId(null);
      setEditContent("");
    },
    onError: (e: any) => toast({ title: "Error editing message", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => apiRequest("DELETE", `/api/messages/${messageId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/messages", channelId] }),
    onError: (e: any) => toast({ title: "Error deleting message", description: e.message, variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: (messageId: string) => apiRequest("POST", "/api/messages/pin", { messageId, channelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", channelId] });
      toast({ title: "Message pinned" });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: (messageId: string) => apiRequest("POST", "/api/messages/bookmark", { messageId }),
    onSuccess: () => toast({ title: "Message bookmarked" }),
  });

  const handleTypingStart = async () => {
    try {
      await fetch("/api/typing/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channelId, userName: currentUserName }),
      });
    } catch {}
  };

  const handleTypingStop = async () => {
    try {
      await fetch("/api/typing/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channelId }),
      });
    } catch {}
  };

  const handleEditStart = (messageId: string, content: string) => {
    setEditingId(messageId);
    setEditContent(content);
  };

  const handleEditSubmit = (messageId: string, content: string) => {
    editMutation.mutate({ messageId, content });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleDelete = (messageId: string) => {
    if (window.confirm("Delete this message?")) {
      deleteMutation.mutate(messageId);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid={`channel-view-${channelId}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#16181e] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white/50">{channelTypeIcon(channel?.type || "public")}</span>
          <span className="font-semibold text-white text-sm">{channel?.displayName || "Loading..."}</span>
          {channel?.topic && (
            <>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-xs text-white/40 truncate max-w-[300px]">{channel.topic}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors" data-testid="button-channel-search">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors" data-testid="button-channel-notifications">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors" data-testid="button-channel-pins">
            <Pin className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-white/40 text-xs">
            <Users className="w-3.5 h-3.5" />
            <span>{channel?.memberCount || 0}</span>
          </div>
          <button className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors" data-testid="button-channel-settings">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <MessageList
        channelId={channelId}
        currentUserId={currentUserId}
        editingId={editingId}
        editContent={editContent}
        onEditContentChange={setEditContent}
        onEditStart={handleEditStart}
        onEditSubmit={handleEditSubmit}
        onEditCancel={handleEditCancel}
        onDelete={handleDelete}
        onPin={id => pinMutation.mutate(id)}
        onBookmark={id => bookmarkMutation.mutate(id)}
        typingUsers={typingUsers}
      />

      <div className="px-4 pb-4 shrink-0">
        <MessageComposer
          onSend={content => sendMutation.mutate(content)}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          placeholder={`Message #${channel?.displayName || "channel"}`}
          disabled={sendMutation.isPending}
        />
      </div>
    </div>
  );
}
