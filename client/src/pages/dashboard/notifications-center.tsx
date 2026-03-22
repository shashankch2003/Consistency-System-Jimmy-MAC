import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Notification = { id: number; title: string; body: string; aiPriority: string; isRead: boolean; type: string; createdAt: string };

const PRIORITY_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  urgent: { color: "text-red-400 bg-red-500/20 border-red-500/30", icon: AlertTriangle, label: "Urgent" },
  important: { color: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30", icon: Bell, label: "Important" },
  normal: { color: "text-blue-400 bg-blue-500/20 border-blue-500/30", icon: Info, label: "Normal" },
  low: { color: "text-gray-400 bg-gray-500/20 border-gray-500/30", icon: CheckCircle, label: "Low" },
};

export default function NotificationsCenterPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/ai-notifications", priorityFilter, unreadOnly],
    queryFn: () => fetch(`/api/ai-notifications?priority=${priorityFilter}&unreadOnly=${unreadOnly}`).then(r => r.json()),
  });

  const { data: counts } = useQuery<Record<string, number>>({
    queryKey: ["/api/ai-notifications/unread-counts"],
  });

  const { data: preferences } = useQuery<any>({
    queryKey: ["/api/ai-notifications/preferences"],
  });

  const markRead = useMutation({
    mutationFn: (ids: number[]) => apiRequest("POST", "/api/ai-notifications/mark-read", { ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ai-notifications"] }); qc.invalidateQueries({ queryKey: ["/api/ai-notifications/unread-counts"] }); }
  });

  const updatePrefs = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/ai-notifications/preferences", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ai-notifications/preferences"] }); toast({ title: "Preferences saved" }); }
  });

  const markAllRead = () => {
    const unread = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unread.length > 0) markRead.mutate(unread);
  };

  const grouped = ["urgent", "important", "normal", "low"].reduce((acc, p) => {
    acc[p] = notifications.filter(n => n.aiPriority === p);
    return acc;
  }, {} as Record<string, Notification[]>);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-7 h-7 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Smart Notifications</h1>
            <p className="text-sm text-gray-400">AI-prioritized notification inbox</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400">
            <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} data-testid="switch-unread-only" />
            Unread only
          </label>
          <Button variant="ghost" onClick={markAllRead} className="text-gray-400 hover:text-white text-sm" data-testid="button-mark-all-read"><CheckCircle className="w-4 h-4 mr-2" />Mark all read</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "urgent", "important", "normal", "low"].map(p => (
          <Button key={p} size="sm" variant={priorityFilter === p ? "default" : "ghost"} onClick={() => setPriorityFilter(p)} className={priorityFilter === p ? "bg-yellow-600 hover:bg-yellow-700" : "text-gray-400"} data-testid={`button-filter-${p}`}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
            {p !== "all" && counts?.[p] ? <Badge className="ml-1 bg-red-500/20 text-red-400 text-xs">{counts[p]}</Badge> : null}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-800/50 animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800"><CardContent className="py-12 text-center"><BellOff className="w-12 h-12 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">No notifications{unreadOnly ? " unread" : ""}. All caught up!</p></CardContent></Card>
      ) : (
        <div className="space-y-6">
          {["urgent", "important", "normal", "low"].map(priority => {
            const items = priorityFilter === "all" ? grouped[priority] : (priorityFilter === priority ? notifications : []);
            if (!items?.length) return null;
            const { color, icon: Icon, label } = PRIORITY_CONFIG[priority];
            return (
              <Card key={priority} className={`bg-gray-900 border ${color.split(" ").find(c => c.startsWith("border")) || "border-gray-800"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-sm flex items-center gap-2 ${color.split(" ")[0]}`}><Icon className="w-4 h-4" />{label} ({items.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map(n => (
                    <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${n.isRead ? "bg-gray-800/30" : "bg-gray-800/60"}`} data-testid={`card-notification-${n.id}`}>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${n.isRead ? "text-gray-400" : "text-white"}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                        <p className="text-xs text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                      {!n.isRead && (
                        <Button size="sm" variant="ghost" onClick={() => markRead.mutate([n.id])} className="text-xs text-gray-400 hover:text-white shrink-0" data-testid={`button-mark-read-${n.id}`}>Mark read</Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {preferences && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white text-base">Notification Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">AI Triage</p>
                <p className="text-xs text-gray-400">Let AI prioritize and filter notifications</p>
              </div>
              <Switch checked={preferences.aiTriageEnabled ?? true} onCheckedChange={v => updatePrefs.mutate({ aiTriageEnabled: v })} data-testid="switch-ai-triage" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
