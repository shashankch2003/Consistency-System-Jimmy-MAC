import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { X, MessageSquare, CheckCircle, MoreHorizontal, Reply, Trash2, Edit2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ userId, size = 6 }: { userId: string; size?: number }) {
  const initials = userId.slice(0, 2).toUpperCase();
  return (
    <div className={cn(`w-${size} h-${size} rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0`)}>
      {initials}
    </div>
  );
}

interface CommentsPanelProps {
  pageId: number;
  currentUserId: string;
  members: any[];
  onClose: () => void;
}

export default function CommentsPanel({ pageId, currentUserId, members, onClose }: CommentsPanelProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ["pm-comments", pageId],
    queryFn: () => fetch(`/api/pm-pages/${pageId}/comments`).then(r => r.json()),
  });

  const createComment = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/pm-pages/${pageId}/comments`, body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-comments", pageId] });
      setCommentText("");
      setMentions([]);
      setReplyToId(null);
    },
    onError: () => toast({ title: "Failed to post comment", variant: "destructive" }),
  });

  const updateComment = useMutation({
    mutationFn: ({ id, ...body }: any) => apiRequest("PATCH", `/api/pm-comments/${id}`, body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-comments", pageId] });
      setEditId(null);
    },
  });

  const deleteComment = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pm-comments/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-comments", pageId] }),
  });

  const handleTextChange = (val: string) => {
    setCommentText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1 && lastAt >= val.lastIndexOf(" ")) {
      const search = val.slice(lastAt + 1);
      setMentionSearch(search);
      setMentionCursorPos(lastAt);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (member: any) => {
    const before = commentText.slice(0, mentionCursorPos);
    const after = commentText.slice(mentionCursorPos + 1 + mentionSearch.length);
    const displayName = member.userId || member.inviteEmail || "user";
    setCommentText(before + `@${displayName} ` + after);
    setMentions(prev => [...new Set([...prev, member.userId || member.inviteEmail])]);
    setShowMentionDropdown(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = members.filter(m => {
    const name = (m.userId || m.inviteEmail || "").toLowerCase();
    return name.includes(mentionSearch.toLowerCase());
  }).slice(0, 6);

  const topLevelComments = comments.filter((c: any) => !c.parentCommentId && (showResolved || !c.isResolved));
  const getReplies = (id: number) => comments.filter((c: any) => c.parentCommentId === id);

  const submit = () => {
    if (!commentText.trim()) return;
    createComment.mutate({ content: commentText, parentCommentId: replyToId ?? null, mentions });
  };

  return (
    <div className="w-80 shrink-0 border-l border-border bg-card flex flex-col h-full overflow-hidden" data-testid="comments-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Comments</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className={cn("text-xs px-2 py-1 rounded transition-colors", showResolved ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setShowResolved(v => !v)}
          >
            {showResolved ? "Hide resolved" : "Show resolved"}
          </button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {topLevelComments.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">No comments yet</div>
        )}
        {topLevelComments.map((c: any) => (
          <div key={c.id} className={cn("space-y-1", c.isResolved && "opacity-50")}>
            <div className="flex items-start gap-2">
              <Avatar userId={c.userId} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{c.userId.slice(0, 8)}…</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  {c.isResolved && <CheckCircle className="w-3 h-3 text-green-500" />}
                </div>
                {editId === c.id ? (
                  <div className="space-y-1">
                    <textarea
                      className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                      rows={2}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-6 text-[10px]" onClick={() => updateComment.mutate({ id: c.id, content: editText })}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{c.content}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => { setReplyToId(c.id); textareaRef.current?.focus(); }}>
                    <Reply className="w-3 h-3 inline mr-0.5" /> Reply
                  </button>
                  {!c.isResolved && (
                    <button className="text-[10px] text-muted-foreground hover:text-green-500" onClick={() => updateComment.mutate({ id: c.id, isResolved: true })}>
                      Resolve
                    </button>
                  )}
                </div>
              </div>
              {c.userId === currentUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0"><MoreHorizontal className="w-3 h-3" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuItem onClick={() => { setEditId(c.id); setEditText(c.content); }}>
                      <Edit2 className="w-3 h-3 mr-1.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteComment.mutate(c.id)}>
                      <Trash2 className="w-3 h-3 mr-1.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {getReplies(c.id).map((reply: any) => (
              <div key={reply.id} className="flex items-start gap-2 ml-6 border-l-2 border-border pl-2">
                <Avatar userId={reply.userId} size={5} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-medium">{reply.userId.slice(0, 8)}…</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{reply.content}</p>
                </div>
                {reply.userId === currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0"><MoreHorizontal className="w-3 h-3" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteComment.mutate(reply.id)}>
                        <Trash2 className="w-3 h-3 mr-1.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-border px-3 py-3 space-y-2">
        {replyToId && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted rounded px-2 py-1">
            <Reply className="w-3 h-3" />
            Replying to comment
            <button onClick={() => setReplyToId(null)} className="ml-auto hover:text-foreground"><X className="w-3 h-3" /></button>
          </div>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={3}
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Add a comment... (@ to mention)"
            value={commentText}
            onChange={e => handleTextChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
          />
          {showMentionDropdown && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-background border border-border rounded-lg shadow-lg z-10 overflow-hidden">
              {filteredMembers.map((m, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted text-left"
                  onMouseDown={e => { e.preventDefault(); insertMention(m); }}
                >
                  <Avatar userId={m.userId || m.inviteEmail || "?"} size={5} />
                  {m.userId || m.inviteEmail}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          className="w-full h-7 text-xs gap-1.5"
          disabled={!commentText.trim() || createComment.isPending}
          onClick={submit}
        >
          <Send className="w-3 h-3" /> Comment
        </Button>
      </div>
    </div>
  );
}
