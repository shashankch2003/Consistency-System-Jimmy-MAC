import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { X, Check, CornerDownRight, Eye, EyeOff } from "lucide-react";

interface Comment {
  id: string;
  authorName: string;
  authorInitials: string;
  content: string;
  createdAt: Date;
  resolved: boolean;
  replies: Comment[];
  selectionText?: string;
}

function uid() { return Math.random().toString(36).slice(2, 10); }
function relativeTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name, initials }: { name: string; initials: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white shrink-0" title={name}>
      {initials}
    </div>
  );
}

function CommentThread({ comment, onReply, onResolve, showResolved }: {
  comment: Comment;
  onReply: (parentId: string, content: string) => void;
  onResolve: (id: string) => void;
  showResolved: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  if (comment.resolved && !showResolved) return null;

  return (
    <div className={`border rounded-xl p-3 mb-3 transition-all ${comment.resolved ? "opacity-60 border-gray-100 bg-gray-50" : "border-gray-200 bg-white"}`}>
      {comment.selectionText && (
        <div className="text-xs text-gray-500 bg-yellow-50 border-l-2 border-yellow-400 pl-2 py-0.5 mb-2 rounded-r italic line-clamp-2">"{comment.selectionText}"</div>
      )}
      <div className="flex gap-2.5">
        <Avatar name={comment.authorName} initials={comment.authorInitials} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-gray-800">{comment.authorName}</span>
            <span className="text-xs text-gray-400">{relativeTime(comment.createdAt)}</span>
            {comment.resolved && <span className="text-xs text-green-600 flex items-center gap-0.5"><Check className="w-3 h-3" />Resolved</span>}
          </div>
          <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{comment.content}</p>
          <div className="flex gap-3 mt-1.5">
            <button className="text-xs text-gray-400 hover:text-blue-600 transition-colors" onClick={() => setReplyOpen(v => !v)}>
              <CornerDownRight className="w-3 h-3 inline mr-0.5" />Reply
            </button>
            <button className={`text-xs transition-colors ${comment.resolved ? "text-gray-400 hover:text-gray-600" : "text-gray-400 hover:text-green-600"}`} onClick={() => onResolve(comment.id)}>
              {comment.resolved ? "Unresolve" : "Resolve"}
            </button>
          </div>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="ml-9 mt-2 space-y-2 border-l border-gray-100 pl-3">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex gap-2">
              <Avatar name={reply.authorName} initials={reply.authorInitials} />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-gray-700">{reply.authorName}</span>
                  <span className="text-xs text-gray-400">{relativeTime(reply.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-700 mt-0.5">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {replyOpen && (
        <div className="ml-9 mt-2">
          <div className="flex gap-2 items-start">
            <textarea
              autoFocus
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none resize-none focus:border-blue-300"
              rows={2}
              placeholder="Write a reply..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (replyText.trim()) { onReply(comment.id, replyText.trim()); setReplyText(""); setReplyOpen(false); }
                }
                if (e.key === "Escape") setReplyOpen(false);
              }}
            />
            <button className="text-xs bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600 shrink-0 mt-0.5" onClick={() => { if (replyText.trim()) { onReply(comment.id, replyText.trim()); setReplyText(""); setReplyOpen(false); } }}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const ACTIVITY_LOG = [
  { text: "Page created", time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
  { text: "Status changed to In Progress", time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
  { text: "3 blocks added", time: new Date(Date.now() - 1000 * 60 * 60 * 10) },
  { text: "Title updated", time: new Date(Date.now() - 1000 * 60 * 60 * 2) },
];

interface Props {
  onClose: () => void;
}

export default function CollaborationPanel({ onClose }: Props) {
  const { user } = useAuth();
  const firstName = (user as any)?.firstName || "You";
  const lastName = (user as any)?.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const initials = [firstName[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "Y";

  const [activeTab, setActiveTab] = useState<"Comments" | "Activity">("Comments");
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "c1", authorName: "Alice Kim", authorInitials: "AK", content: "We should reconsider the timeline for this section. The current estimates seem optimistic.", createdAt: new Date(Date.now() - 7200000), resolved: false, replies: [], selectionText: undefined,
    },
    {
      id: "c2", authorName: "Bob Lee", authorInitials: "BL", content: "Great point on this! The type safety it provides will save us a lot of debugging time.", createdAt: new Date(Date.now() - 14400000), resolved: false, replies: [
        { id: "r1", authorName: "Alice Kim", authorInitials: "AK", content: "Totally agree! Let's go with it.", createdAt: new Date(Date.now() - 10800000), resolved: false, replies: [], selectionText: undefined },
      ],
    },
    { id: "c3", authorName: "Carol M.", authorInitials: "CM", content: "I've reviewed this — looks good to merge.", createdAt: new Date(Date.now() - 86400000), resolved: true, replies: [], selectionText: undefined },
  ]);
  const [newComment, setNewComment] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  const postComment = () => {
    if (!newComment.trim()) return;
    setComments(cs => [{ id: uid(), authorName: fullName, authorInitials: initials, content: newComment.trim(), createdAt: new Date(), resolved: false, replies: [] }, ...cs]);
    setNewComment("");
  };

  const addReply = (parentId: string, content: string) => {
    setComments(cs => cs.map(c => c.id === parentId ? { ...c, replies: [...c.replies, { id: uid(), authorName: fullName, authorInitials: initials, content, createdAt: new Date(), resolved: false, replies: [] }] } : c));
  };

  const toggleResolve = (id: string) => {
    setComments(cs => cs.map(c => c.id === id ? { ...c, resolved: !c.resolved } : c));
  };

  const unresolvedCount = comments.filter(c => !c.resolved).length;
  const resolvedCount = comments.filter(c => c.resolved).length;

  return (
    <div className="w-[320px] bg-white border-l border-gray-200 h-full flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 pt-3 pb-0">
        <div className="flex gap-4">
          {(["Comments", "Activity"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-sm pb-2.5 cursor-pointer border-b-2 transition-colors ${activeTab === tab ? "border-blue-500 text-blue-700 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {tab}{tab === "Comments" && unresolvedCount > 0 && <span className="ml-1.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full px-1.5">{unresolvedCount}</span>}
            </button>
          ))}
        </div>
        <button className="text-gray-400 hover:text-gray-600 mb-2" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>

      {activeTab === "Comments" && (
        <>
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex gap-2">
              <Avatar name={fullName} initials={initials} />
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none resize-none focus:border-blue-300 transition-colors"
                  rows={2}
                  placeholder="Write a comment... (Enter to post)"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                />
                {newComment.trim() && (
                  <div className="flex justify-end mt-1">
                    <button className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600" onClick={postComment}>Post</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-gray-400">{unresolvedCount} open · {resolvedCount} resolved</span>
            <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1" onClick={() => setShowResolved(v => !v)}>
              {showResolved ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showResolved ? "Hide resolved" : "Show resolved"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2">
            {comments.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No comments yet. Be the first!</p>}
            {comments.map(c => (
              <CommentThread key={c.id} comment={c} onReply={addReply} onResolve={toggleResolve} showResolved={showResolved} />
            ))}
          </div>
        </>
      )}

      {activeTab === "Activity" && (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-3">
            {ACTIVITY_LOG.map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{item.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{relativeTime(item.time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
