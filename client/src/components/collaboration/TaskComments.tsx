import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: number;
  taskId: number;
  authorId: string;
  content: string;
  parentCommentId?: number;
  createdAt: string;
}

interface TaskCommentsProps {
  taskId: number;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [text, setText] = useState("");
  const { toast } = useToast();

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/task-comments", taskId],
    queryFn: () => fetch(`/api/task-comments?taskId=${taskId}`).then((r) => r.json()),
    enabled: !!taskId,
  });

  const mutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/task-comments", { taskId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-comments", taskId] });
      setText("");
    },
    onError: () => toast({ title: "Failed to post comment", variant: "destructive" }),
  });

  const initials = (id: string) => id.slice(0, 2).toUpperCase();

  const handleSubmit = () => {
    if (!text.trim()) return;
    mutation.mutate(text.trim());
  };

  return (
    <div className="mt-4" data-testid="task-comments">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Comments</span>
        {comments.length > 0 && (
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        )}
      </div>

      {/* Comment list */}
      <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5" data-testid={`comment-${c.id}`}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {initials(c.authorId)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">{c.authorId.split("-")[0]}</span>
                <span className="text-[10px] text-muted-foreground">
                  {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ""}
                </span>
              </div>
              <div className="bg-muted/30 rounded-lg px-3 py-2 text-sm">{c.content}</div>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
        )}
      </div>

      {/* New comment */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="text-sm resize-none min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          data-testid="input-comment"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!text.trim() || mutation.isPending}
          data-testid="button-send-comment"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">Ctrl+Enter to send</p>
    </div>
  );
}
