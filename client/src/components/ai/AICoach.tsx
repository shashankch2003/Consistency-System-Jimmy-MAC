import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ChevronRight, Send, Loader2, X } from "lucide-react";

interface AICoachProps {
  open: boolean;
  onClose: () => void;
}

export function AICoach({ open, onClose }: AICoachProps) {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "coach"; text: string }[]>([]);
  const [focusRecs, setFocusRecs] = useState<string>("");
  const [weekInsights, setWeekInsights] = useState<string>("");

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/team-tasks-coach"],
    queryFn: () => fetch("/api/team-tasks?status=In Progress").then((r) => r.json()).then((d) => Array.isArray(d) ? d : []),
    enabled: !!workspaceId,
  });

  const topTasks = [...tasks]
    .filter((t) => t.status !== "Done")
    .sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return 0;
    })
    .slice(0, 3);

  const focusMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/coach", {
      type: "focus",
      context: { tasks: topTasks.map((t) => ({ title: t.title, priority: t.priority, dueDate: t.dueDate })), userId: user?.id },
    }),
    onSuccess: (data: any) => setFocusRecs(data.reply || ""),
  });

  const insightsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/coach", {
      type: "insights",
      context: { workspaceId, userId: user?.id, tasksCount: tasks.length },
    }),
    onSuccess: (data: any) => setWeekInsights(data.reply || ""),
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => apiRequest("POST", "/api/ai/coach", {
      type: "chat",
      message: msg,
      context: { workspaceId, userId: user?.id, tasks: topTasks.length },
    }),
    onSuccess: (data: any) => {
      setChatMessages((prev) => [...prev, { role: "coach", text: data.reply || "..." }]);
    },
    onError: () => setChatMessages((prev) => [...prev, { role: "coach", text: "Sorry, I had trouble with that." }]),
  });

  useEffect(() => {
    if (open && !focusRecs) focusMutation.mutate();
    if (open && !weekInsights) insightsMutation.mutate();
  }, [open]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
    setChatInput("");
    chatMutation.mutate(msg);
  };

  if (!open) return null;

  return (
    <div
      className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-2xl z-40 flex flex-col"
      data-testid="ai-coach-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">AI Coach</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-coach">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Today's Plan */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Today's Plan</h3>
            <div className="space-y-2">
              {topTasks.length > 0 ? topTasks.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg text-sm" data-testid={`today-task-${i}`}>
                  <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{t.title}</span>
                </div>
              )) : <p className="text-xs text-muted-foreground">No active tasks</p>}
            </div>
          </section>

          {/* Focus Recommendations */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Focus Recommendations</h3>
              <button
                onClick={() => focusMutation.mutate()}
                className="text-[10px] text-primary hover:underline"
                data-testid="button-refresh-focus"
              >Refresh</button>
            </div>
            {focusMutation.isPending ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />Thinking...
              </div>
            ) : (
              <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-lg p-2">
                {focusRecs || "Click refresh to get recommendations"}
              </div>
            )}
          </section>

          {/* Insights */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insights</h3>
              <button
                onClick={() => insightsMutation.mutate()}
                className="text-[10px] text-primary hover:underline"
                data-testid="button-refresh-insights"
              >Refresh</button>
            </div>
            {insightsMutation.isPending ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />Analyzing...
              </div>
            ) : (
              <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-lg p-2">
                {weekInsights || "Click refresh to get insights"}
              </div>
            )}
          </section>

          {/* Chat */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chat with Coach</h3>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs p-2 rounded-lg ${msg.role === "user" ? "bg-primary/10 text-primary ml-4" : "bg-muted/30 text-muted-foreground mr-4"}`}
                  data-testid={`chat-message-${i}`}
                >
                  {msg.text}
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                  <Loader2 className="h-3 w-3 animate-spin" />Coach is thinking...
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Ask your coach..."
                className="h-8 text-xs"
                data-testid="input-coach-chat"
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendChat} disabled={chatMutation.isPending} data-testid="button-send-chat">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
