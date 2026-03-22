import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/hooks/use-auth";
import { Bell, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON_COLOR: Record<string, string> = {
  assignment: "text-blue-400",
  completion: "text-green-400",
  deadline: "text-orange-400",
  mention: "text-purple-400",
  default: "text-muted-foreground",
};

export function NotificationCenter() {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["/api/notifications", workspaceId],
    queryFn: () => fetch(`/api/notifications?workspaceId=${workspaceId || 0}`).then((r) => r.json()),
    refetchInterval: 30000,
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/mark-all-read", { workspaceId: workspaceId || 0 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative h-8 w-8 rounded-lg border border-border/50 hover:bg-white/10 flex items-center justify-center transition-colors"
          data-testid="button-notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white"
              data-testid="notification-badge"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] max-h-[480px] p-0 bg-card border border-border"
        align="end"
        data-testid="notification-dropdown"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3.5 w-3.5" />Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer ${!n.isRead ? "bg-primary/5" : ""}`}
                  onClick={() => !n.isRead && markRead.mutate(n.id)}
                  data-testid={`notification-${n.id}`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {!n.isRead ? (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-transparent" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
