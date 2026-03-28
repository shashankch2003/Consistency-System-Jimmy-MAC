import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Bell, AtSign, MessageSquare, Share2, UserPlus, FileText } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, any> = {
  mention: AtSign,
  comment: MessageSquare,
  share: Share2,
  invite: UserPlus,
  pageUpdate: FileText,
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function PmNotificationBell() {
  const [, navigate] = useLocation();

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["pm-notifications"],
    queryFn: () => fetch("/api/pm-notifications").then(r => r.json()),
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/pm-notifications/${id}/read`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/pm-notifications/read-all").then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-notifications"] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleClick = (n: any) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.linkUrl) navigate(n.linkUrl);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors" data-testid="pm-notification-bell">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              className="text-[10px] text-primary hover:underline"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">No notifications yet</div>
        )}
        {notifications.map((n: any) => {
          const Icon = TYPE_ICONS[n.type] || FileText;
          return (
            <button
              key={n.id}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0",
                !n.isRead && "bg-primary/5"
              )}
              onClick={() => handleClick(n)}
              data-testid={`notification-item-${n.id}`}
            >
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-snug">{n.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
              )}
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
