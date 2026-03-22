import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  LogOut,
  User,
  LayoutDashboard,
  Lightbulb,
  Gauge,
  FileText,
  Users,
  Shield,
  BookOpen,
  Trophy,
  Settings,
  Wallet,
  PlayCircle,
  HeartHandshake,
  BarChart3,
  Building2,
  UsersRound,
  FolderKanban,
  MessageSquare,
  BookMarked,
  Scale,
  FileBarChart,
  Zap,
  Sparkles,
  Search,
  Command,
  Calendar,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

const menuItems = [
  { title: "Task Bank", icon: Lightbulb, url: "/dashboard/task-bank" },
  { title: "Goals", icon: Target, url: "/dashboard/goals" },
  { title: "OKR Goals", icon: Target, url: "/dashboard/okr-goals" },
  { title: "Daily Tasks", icon: Layout, url: "/dashboard/tasks" },
  { title: "Good Habits", icon: CheckCircle, url: "/dashboard/good-habits" },
  { title: "Bad Habits", icon: XCircle, url: "/dashboard/bad-habits" },
  { title: "Hourly Tracker", icon: Clock, url: "/dashboard/hourly" },
  { title: "Comparison", icon: Gauge, url: "/dashboard/daily-score" },
  { title: "Journal", icon: BookOpen, url: "/dashboard/journal" },
  { title: "Notes", icon: FileText, url: "/dashboard/notes" },
  { title: "Fundamentals", icon: Trophy, url: "/dashboard/fundamentals" },
  { title: "Money", icon: Wallet, url: "/dashboard/money" },
  { title: "Know More", icon: PlayCircle, url: "/dashboard/know-more" },
  { title: "Grow Together", icon: HeartHandshake, url: "/dashboard/grow-together" },
  { title: "Team Intelligence", icon: BarChart3, url: "/dashboard/team-intelligence" },
  { title: "Productivity", icon: BarChart3, url: "/dashboard/productivity" },
  { title: "Timesheets", icon: Clock, url: "/dashboard/timesheets" },
  { title: "Workload", icon: Scale, url: "/dashboard/workload" },
  { title: "Reports", icon: FileBarChart, url: "/dashboard/reports" },
  { title: "Projects", icon: FolderKanban, url: "/dashboard/projects" },
  { title: "Messages", icon: MessageSquare, url: "/dashboard/messages" },
  { title: "Wiki", icon: BookMarked, url: "/dashboard/wiki" },
  { title: "Automations", icon: Zap, url: "/dashboard/automations" },
  { title: "Connect", icon: MessageSquare, url: "/dashboard/connect" },
  { title: "AI Autopilot", icon: Zap, url: "/dashboard/autopilot" },
  { title: "Time Machine", icon: BarChart3, url: "/dashboard/time-machine" },
  { title: "Daily Planner", icon: Calendar, url: "/dashboard/daily-planner" },
  { title: "My Day", icon: Clock, url: "/dashboard/my-day" },
  { title: "AI Habits", icon: Flame, url: "/dashboard/ai-habits" },
  { title: "Focus Coach", icon: Target, url: "/dashboard/focus-coach" },
  { title: "Workspace Setup", icon: Building2, url: "/dashboard/workspace-setup" },
  { title: "Team Management", icon: UsersRound, url: "/dashboard/team-management" },
  { title: "Members", icon: Users, url: "/dashboard/members" },
  { title: "Community", icon: Users, url: "/dashboard/community" },
  { title: "Settings", icon: Settings, url: "/dashboard/settings" },
];

interface AppSidebarProps {
  onOpenCommand?: () => void;
  onOpenSearch?: () => void;
  onOpenCoach?: () => void;
}

export function AppSidebar({ onOpenCommand, onOpenSearch, onOpenCoach }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/level/is-admin"],
  });

  return (
    <Sidebar className="border-r border-border bg-card/95 backdrop-blur-xl">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg">Consistency System</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <SidebarTrigger className="h-8 w-8 rounded-lg border border-border/50 hover:bg-white/10" data-testid="button-sidebar-close" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="data-[active=true]:bg-white/10 data-[active=true]:text-white"
                  >
                    <Link href={item.url} className="flex items-center gap-3 px-3 py-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {adminCheck?.isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/dashboard/admin"}
                    className="data-[active=true]:bg-white/10 data-[active=true]:text-white"
                  >
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
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        {/* AI Shortcut buttons */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 h-8 text-xs justify-start"
            onClick={onOpenCommand}
            data-testid="button-open-command"
            title="AI Command Bar (Ctrl+K)"
          >
            <Command className="w-3.5 h-3.5" />
            Command
            <span className="ml-auto text-[10px] text-muted-foreground">⌘K</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 h-8 text-xs justify-start"
            onClick={onOpenSearch}
            data-testid="button-open-search"
            title="Smart Search (Ctrl+Shift+F)"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 h-8 text-xs justify-start mb-3"
          onClick={onOpenCoach}
          data-testid="button-open-coach"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          AI Coach
        </Button>

        {/* User info */}
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Profile" className="w-full h-full rounded-full" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => logout()}>
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
