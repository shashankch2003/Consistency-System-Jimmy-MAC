import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { MoreHorizontal, Smile, Reply, Bookmark, Pin, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  contentHtml?: string;
  isEdited: boolean;
  isPinned: boolean;
  threadReplyCount: number;
  threadLastReplyAt?: string;
  mentionedUserIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  authorName?: string;
}

interface MessageListProps {
  channelId: string;
  currentUserId: string;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
  onBookmarkMessage?: (messageId: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onOpenThread?: (messageId: string) => void;
  typingUsers?: { userId: string; userName: string }[];
}

function formatDateDivider(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

function formatTime(dateStr: string): string {
  return format(new Date(dateStr), "h:mm a");
}

function shouldGroupMessage(prev: Message, curr: Message): boolean {
  if (prev.authorId !== curr.authorId) return false;
  const diff = differenceInMinutes(new Date(curr.createdAt), new Date(prev.createdAt));
  return diff < 5;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙌", "👀"];

function MessageItem({
  message,
  isGrouped,
  currentUserId,
  onEdit,
  onDelete,
  onPin,
  onBookmark,
  onReaction,
  onThread,
}: {
  message: Message;
  isGrouped: boolean;
  currentUserId: string;
  onEdit?: (id: string, c: string) => void;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onReaction?: (id: string, emoji: string) => void;
  onThread?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const isOwn = message.authorId === currentUserId;
  const displayName = message.authorName || message.authorId.slice(0, 8);
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 rounded-lg transition-colors",
        isGrouped ? "py-0.5" : "pt-3 pb-0.5",
        hovered && "bg-white/[0.025]"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmoji(false); }}
      data-testid={`message-item-${message.id}`}
    >
      {!isGrouped ? (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
          {initials}
        </div>
      ) : (
        <div className="w-9 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white">{displayName}</span>
            <span className="text-xs text-white/30">{formatTime(message.createdAt)}</span>
            {message.isPinned && <span className="text-xs text-yellow-400/70">📌 pinned</span>}
          </div>
        )}
        <div className={cn("text-sm text-white/80 leading-relaxed break-words", isGrouped && "relative")}>
          {message.content}
          {message.isEdited && (
            <span className="text-xs text-white/30 ml-1">(edited)</span>
          )}
        </div>

        {message.threadReplyCount > 0 && (
          <button
            onClick={() => onThread?.(message.id)}
            className="mt-1 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            data-testid={`button-open-thread-${message.id}`}
          >
            <Reply className="w-3 h-3" />
            {message.threadReplyCount} {message.threadReplyCount === 1 ? "reply" : "replies"}
            {message.threadLastReplyAt && (
              <span className="text-white/30">· Last reply {formatTime(message.threadLastReplyAt)}</span>
            )}
          </button>
        )}
      </div>

      {hovered && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-[#1e2230] border border-white/10 rounded-lg shadow-xl px-1 py-0.5 z-10">
          {showEmoji ? (
            <div className="flex items-center gap-0.5">
              {QUICK_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onReaction?.(message.id, emoji); setShowEmoji(false); }}
                  className="w-7 h-7 flex items-center justify-center text-base hover:bg-white/10 rounded transition-colors"
                  data-testid={`button-reaction-${emoji}-${message.id}`}
                >
                  {emoji}
                </button>
              ))}
              <button onClick={() => setShowEmoji(false)} className="w-5 h-5 flex items-center justify-center text-white/30 hover:text-white transition-colors text-xs">✕</button>
            </div>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setShowEmoji(true)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors" data-testid={`button-add-reaction-${message.id}`}>
                      <Smile className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">React</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => onThread?.(message.id)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors" data-testid={`button-reply-thread-${message.id}`}>
                      <Reply className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Reply in thread</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => onBookmark?.(message.id)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors" data-testid={`button-bookmark-${message.id}`}>
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Bookmark</TooltipContent>
                </Tooltip>
                {isOwn && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => onEdit?.(message.id, message.content)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors" data-testid={`button-edit-${message.id}`}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => onDelete?.(message.id)} className="p-1.5 rounded text-white/40 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors" data-testid={`button-delete-${message.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
                    </Tooltip>
                  </>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => onPin?.(message.id)} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors" data-testid={`button-pin-${message.id}`}>
                      <Pin className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Pin message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageList({
  channelId,
  currentUserId,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onBookmarkMessage,
  onAddReaction,
  onOpenThread,
  typingUsers = [],
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const { data, isLoading } = useQuery<{ messages: Message[]; hasMore: boolean }>({
    queryKey: ["/api/messages", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${channelId}?limit=50`, { credentials: "include" });
      if (!res.ok) return { messages: [], hasMore: false };
      return res.json();
    },
    enabled: !!channelId,
    refetchInterval: false,
    staleTime: 0,
  });

  const messages = data?.messages || [];

  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isAtBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAtBottom(atBottom);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/30 text-sm">Loading messages...</div>
      </div>
    );
  }

  const groupedMessages: { message: Message; isGrouped: boolean; showDivider?: string }[] = [];
  let lastDate = "";
  let lastMessage: Message | null = null;

  for (const msg of messages) {
    const dateKey = format(new Date(msg.createdAt), "yyyy-MM-dd");
    const showDivider = dateKey !== lastDate ? formatDateDivider(msg.createdAt) : undefined;
    const isGrouped = !showDivider && !!lastMessage && shouldGroupMessage(lastMessage, msg);
    groupedMessages.push({ message: msg, isGrouped, showDivider });
    lastDate = dateKey;
    lastMessage = msg;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-2"
      data-testid="message-list"
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-white/50 text-sm">No messages yet. Be the first to say something!</p>
        </div>
      )}

      {groupedMessages.map(({ message, isGrouped, showDivider }) => (
        <div key={message.id}>
          {showDivider && (
            <div className="flex items-center gap-3 px-4 my-4">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs text-white/30 font-medium">{showDivider}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          )}
          <MessageItem
            message={message}
            isGrouped={isGrouped}
            currentUserId={currentUserId}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onPin={onPinMessage}
            onBookmark={onBookmarkMessage}
            onReaction={onAddReaction}
            onThread={onOpenThread}
          />
        </div>
      ))}

      {typingUsers.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-2">
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-white/40">
            {typingUsers.map(u => u.userName).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
