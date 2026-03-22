import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Hash, Lock, Settings, Users, Search, Bell, Pin, Bookmark } from "lucide-react";
import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";
import { useSocket } from "@/hooks/use-socket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

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

const channelTypeIcon = (type: string) => {
  if (type === "private") return <Lock className="w-4 h-4" />;
  return <Hash className="w-4 h-4" />;
};

export default function ChannelView({ channelId, currentUserId, currentUserName, workspaceId }: ChannelViewProps) {
  const { toast } = useToast();
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);

  const { data: channel } = useQuery<Channel>({
    queryKey: ["/api/connect/channels", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/connect/channels?workspaceId=${workspaceId || ""}`, { credentials: "include" });
      if (!res.ok) return null;
      const channels = await res.json();
      return channels.find((c: Channel) => c.id === channelId) || null;
    },
    enabled: !!channelId,
  });

  const { sendMessage, editMessage, deleteMessage, startTyping, stopTyping, markRead, addReaction, getSocket } = useSocket(
    currentUserId,
    currentUserName,
    workspaceId ? String(workspaceId) : undefined
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTyping = (data: any) => {
      if (data.channelId !== channelId || data.userId === currentUserId) return;
      if (data.isTyping) {
        setTypingUsers(prev => {
          if (prev.find(u => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, userName: data.userName || data.userId }];
        });
      } else {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    };

    socket.on("typing", handleTyping);
    return () => {
      socket.off("typing", handleTyping);
    };
  }, [channelId, currentUserId, getSocket]);

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

  const handleSend = (content: string) => {
    sendMessage({
      channelId,
      content,
      tempId: nanoid(),
    });
  };

  const handleTypingStart = () => startTyping(channelId);
  const handleTypingStop = () => stopTyping(channelId);

  const handleEditMessage = (messageId: string, content: string) => {
    const newContent = window.prompt("Edit message:", content);
    if (newContent && newContent !== content) {
      editMessage({ messageId, content: newContent });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm("Delete this message?")) {
      deleteMessage({ messageId });
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    addReaction(messageId, emoji, channelId);
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
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onPinMessage={id => pinMutation.mutate(id)}
        onBookmarkMessage={id => bookmarkMutation.mutate(id)}
        onAddReaction={handleAddReaction}
        typingUsers={typingUsers}
      />

      <div className="px-4 pb-4 shrink-0">
        <MessageComposer
          onSend={handleSend}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          placeholder={`Message #${channel?.displayName || "channel"}`}
        />
      </div>
    </div>
  );
}
