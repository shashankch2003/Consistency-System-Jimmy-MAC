import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Target,
  Layout,
  CheckCircle,
  XCircle,
  Clock,
  User,
  LayoutDashboard,
  Lightbulb,
  Gauge,
  FileText,
  Shield,
  BookOpen,
  Trophy,
  Settings,
  Wallet,
  PlayCircle,
  Search,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronRight,
  Folder,
  Plus,
  Ban,
} from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { PmNotificationBell } from "@/components/pm/PmNotificationBell";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  onOpenCommand?: () => void;
  onOpenSearch?: () => void;
  onOpenCoach?: () => void;
}

export function AppSidebar({ onOpenSearch }: AppSidebarProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [trackingOpen, setTrackingOpen] = useState(
    ["/dashboard/goals", "/dashboard/good-habits", "/dashboard/bad-habits",
     "/dashboard/hourly", "/dashboard/journal", "/dashboard/fundamentals",
     "/dashboard/money"].some(p => location.startsWith(p))
  );

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/level/is-admin"],
  });

  const isActive = (url: string) => location === url;

  const navItemClass = "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/10 cursor-pointer w-full";
  const activeClass = "bg-white/10 text-white";
  const inactiveClass = "text-muted-foreground hover:text-foreground";

  const trackingChildren = [
    { title: "Goals", icon: Target, url: "/dashboard/goals" },
    { title: "Good Habits", icon: CheckCircle, url: "/dashboard/good-habits" },
    { title: "Bad Habits", icon: XCircle, url: "/dashboard/bad-habits" },
    { title: "Hourly Tracking", icon: Clock, url: "/dashboard/hourly" },
    { title: "Journaling", icon: BookOpen, url: "/dashboard/journal" },
    { title: "Fundamentals", icon: Trophy, url: "/dashboard/fundamentals" },
    { title: "Money", icon: Wallet, url: "/dashboard/money" },
  ];

  const isTrackingActive = trackingChildren.some(c => location.startsWith(c.url));

  return (
    <Sidebar className="border-r border-border bg-card/95 backdrop-blur-xl">
      <SidebarHeader className="px-4 pt-4 pb-3 border-b border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg">Consistency</span>
          </Link>
          <div className="flex items-center gap-1">
            <PmNotificationBell />
            <NotificationCenter />
            <SidebarTrigger className="h-8 w-8 rounded-lg border border-border/50 hover:bg-white/10" data-testid="button-sidebar-close" />
          </div>
        </div>

        <button
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          onClick={onOpenSearch}
          data-testid="button-open-search"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span>Search...</span>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">

              {/* 1. Task Bank */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard/task-bank")} className="data-[active=true]:bg-white/10 data-[active=true]:text-white">
                  <Link href="/dashboard/task-bank" className="flex items-center gap-3 px-3 py-2" data-testid="nav-task-bank">
                    <Lightbulb className="w-4 h-4" />
                    <span>Task Bank</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 2. AI Agents — empty section placeholder */}
              <SidebarMenuItem>
                <div className={cn(navItemClass, inactiveClass, "opacity-50 cursor-not-allowed")} data-testid="nav-ai-agents">
                  <Bot className="w-4 h-4" />
                  <span>AI Agents</span>
                  <span className="ml-auto text-[10px] bg-muted rounded px-1.5 py-0.5">Soon</span>
                </div>
              </SidebarMenuItem>

              {/* 3. Daily Tasks */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard/tasks")} className="data-[active=true]:bg-white/10 data-[active=true]:text-white">
                  <Link href="/dashboard/tasks" className="flex items-center gap-3 px-3 py-2" data-testid="nav-daily-tasks">
                    <Layout className="w-4 h-4" />
                    <span>Daily Tasks</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 4. Tracking — collapsible */}
              <SidebarMenuItem>
                <button
                  className={cn(navItemClass, isTrackingActive ? activeClass : inactiveClass)}
                  onClick={() => setTrackingOpen(v => !v)}
                  data-testid="nav-tracking"
                >
                  <Folder className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">Tracking</span>
                  {trackingOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </SidebarMenuItem>

              {trackingOpen && (
                <div className="ml-3 pl-3 border-l border-border/50 space-y-0.5">
                  {trackingChildren.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} className="data-[active=true]:bg-white/10 data-[active=true]:text-white">
                        <Link href={item.url} className="flex items-center gap-3 px-3 py-2" data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </div>
              )}

              {/* 5. Comparison */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard/daily-score")} className="data-[active=true]:bg-white/10 data-[active=true]:text-white">
                  <Link href="/dashboard/daily-score" className="flex items-center gap-3 px-3 py-2" data-testid="nav-comparison">
                    <Gauge className="w-4 h-4" />
                    <span>Comparison</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 6. Productivity Data */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/dashboard/productivity")} className="data-[active=true]:bg-white/10 data-[active=true]:text-white">
                  <Link href="/dashboard/productivity" className="flex items-center gap-3 px-3 py-2" data-testid="nav-productivity-data">
                    <BarChart3 className="w-4 h-4" />
                    <span>Productivity Data</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 7. App Block */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard/app-block")} className="data-[active=true]:bg-white/10 data-[active=true]:text-white">
                  <Link href="/dashboard/app-block" className="flex items-center gap-3 px-3 py-2" data-testid="nav-app-block">
                    <Ban className="w-4 h-4" />
                    <span>App Block</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 8. Notes with + button */}
              <SidebarMenuItem>
                <div className={cn("flex items-center rounded-lg overflow-hidden", isActive("/dashboard/notes") && "bg-white/10")}>
                  <SidebarMenuButton asChild isActive={isActive("/dashboard/notes")} className="data-[active=true]:bg-transparent flex-1">
                    <Link href="/dashboard/notes" className="flex items-center gap-3 px-3 py-2" data-testid="nav-notes">
                      <FileText className="w-4 h-4" />
                      <span>Notes</span>
                    </Link>
                  </SidebarMenuButton>
                  <button
                    className="px-2 py-2 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors rounded-r-lg"
                    onClick={() => navigate("/dashboard/notes?new=true")}
                    title="Create new note"
                    data-testid="button-new-note"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </SidebarMenuItem>

              {adminCheck?.isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/dashboard/admin")} className="data-[active=true]:bg-white/10 data-[active=true]:text-white">
                    <Link href="/dashboard/admin" className="flex items-center gap-3 px-3 py-2">
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Spacer + Know More + Settings */}
        <div className="mt-4 pt-4 border-t border-border/40 px-1 space-y-0.5">
          <SidebarMenuButton asChild isActive={isActive("/dashboard/know-more")} className="data-[active=true]:bg-white/10 data-[active=true]:text-white w-full">
            <Link href="/dashboard/know-more" className="flex items-center gap-3 px-3 py-2" data-testid="nav-know-more">
              <PlayCircle className="w-4 h-4" />
              <span>Know More</span>
            </Link>
          </SidebarMenuButton>
          <SidebarMenuButton asChild isActive={isActive("/dashboard/settings")} className="data-[active=true]:bg-white/10 data-[active=true]:text-white w-full">
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2" data-testid="nav-settings">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </SidebarMenuButton>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
