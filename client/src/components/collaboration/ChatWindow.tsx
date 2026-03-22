import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: number;
  channelId: number;
  senderId: string;
  content: string;
  createdAt: string;
}

interface Channel {
  id: number;
  name: string;
  type: string;
}

interface ChatWindowProps {
  channel: Channel;
}

export function ChatWindow({ channel }: ChatWindowProps) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", channel.id],
    queryFn: () => fetch(`/api/messages?channelId=${channel.id}`).then((r) => r.json()),
    enabled: !!channel.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const mutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/messages", { channelId: channel.id, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", channel.id] });
      setText("");
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const handleSend = () => {
    if (!text.trim()) return;
    mutation.mutate(text.trim());
  };

  const initials = (id: string) => id.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full" data-testid="chat-window">
      {/* Channel header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">{channel.name.replace(/^#/, "")}</span>
        <span className="text-xs text-muted-foreground capitalize">({channel.type} channel)</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Hash className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Welcome to #{channel.name.replace(/^#/, "")}</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const sameAuthor = prevMsg && prevMsg.senderId === msg.senderId;
          return (
            <div key={msg.id} className={`flex gap-3 ${sameAuthor ? "mt-1" : "mt-4"}`} data-testid={`message-${msg.id}`}>
              {!sameAuthor ? (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials(msg.senderId)}
                  </AvatarFallback>
                </Avatar>
              ) : <div className="w-8 shrink-0" />}
              <div className="flex-1">
                {!sameAuthor && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{msg.senderId.slice(0, 8)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                    </span>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder={`Message #${channel.name.replace(/^#/, "")}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || mutation.isPending}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Press Enter to send</p>
      </div>
    </div>
  );
}
