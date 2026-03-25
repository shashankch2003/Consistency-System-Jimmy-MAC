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
  Shield,
  BookOpen,
  Trophy,
  Settings,
  Wallet,
  PlayCircle,
  HeartHandshake,
  Sparkles,
  Search,
  Command,
  Users,
  BarChart3,
  FolderKanban,
  UsersRound,
  Building2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

// ─── CURRENTLY VISIBLE MENU ITEMS ───────────────────────────────────────────
// These are the core personal productivity features (Phase 1).
// To reveal the next phase, move items from the hidden section below into this array.

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
  { title: "Community", icon: Users, url: "/dashboard/community" },
  { title: "Settings", icon: Settings, url: "/dashboard/settings" },
];

// ─── HIDDEN MENU ITEMS (NOT DELETED — JUST HIDDEN) ──────────────────────────
// Phase 2 — Team Features:
//   { title: "Team Intelligence", icon: BarChart3, url: "/dashboard/team-intelligence" },
//   { title: "Productivity", icon: BarChart3, url: "/dashboard/productivity" },
//   { title: "Timesheets", icon: Clock, url: "/dashboard/timesheets" },
//   { title: "Workload", icon: Scale, url: "/dashboard/workload" },
//   { title: "Reports", icon: FileBarChart, url: "/dashboard/reports" },
//   { title: "Projects", icon: FolderKanban, url: "/dashboard/projects" },
//   { title: "Team Management", icon: UsersRound, url: "/dashboard/team-management" },
//   { title: "Members", icon: Users, url: "/dashboard/members" },
//   { title: "Workspace Setup", icon: Building2, url: "/dashboard/workspace-setup" },
//   { title: "Team Insights", icon: TrendingUp, url: "/dashboard/team-insights" },
//
// Phase 3 — Slack-Like Messaging Features:
//   { title: "Messages", icon: MessageSquare, url: "/dashboard/messages" },
//   { title: "Connect", icon: MessageSquare, url: "/dashboard/connect" },
//   { title: "Messaging AI", icon: MessageSquare, url: "/dashboard/messaging-ai" },
//
// Phase 4 — Notion-Like Features:
//   { title: "Wiki", icon: BookMarked, url: "/dashboard/wiki" },
//   { title: "Doc Generator", icon: FileText, url: "/dashboard/doc-generator" },
//   { title: "Automations", icon: Zap, url: "/dashboard/automations" },
//
// Phase 5 — 25 Competitor AI Features:
//   { title: "AI Autopilot", icon: Zap, url: "/dashboard/autopilot" },
//   { title: "Time Machine", icon: BarChart3, url: "/dashboard/time-machine" },
//   { title: "Daily Planner", icon: Calendar, url: "/dashboard/daily-planner" },
//   { title: "My Day", icon: Clock, url: "/dashboard/my-day" },
//   { title: "AI Habits", icon: Flame, url: "/dashboard/ai-habits" },
//   { title: "Focus Coach", icon: Target, url: "/dashboard/focus-coach" },
//   { title: "AI Agents", icon: Bot, url: "/dashboard/ai-agents" },
//   { title: "AI Workflows", icon: Workflow, url: "/dashboard/ai-workflows" },
//   { title: "Project Manager", icon: BarChart3, url: "/dashboard/project-manager" },
//   { title: "Task Intelligence", icon: Brain, url: "/dashboard/task-intel" },
//   { title: "Database AI", icon: Database, url: "/dashboard/database-ai" },
//   { title: "Meetings", icon: Video, url: "/dashboard/meetings" },
//   { title: "Email", icon: Mail, url: "/dashboard/email" },
//
// Phase 6 — Sprint 8-10 AI Features:
//   { title: "OKR System", icon: Target, url: "/dashboard/okr-system" },
//   { title: "Calendar Optimizer", icon: Calendar, url: "/dashboard/calendar-optimizer" },
//   { title: "Time Tracking", icon: Clock, url: "/dashboard/time-tracking" },
//   { title: "Smart Notifications", icon: Bell, url: "/dashboard/notifications-center" },
//   { title: "AI Templates", icon: Layout, url: "/dashboard/ai-template-engine" },
//   { title: "Voice Notes", icon: Mic, url: "/dashboard/voice" },
//   { title: "Command Center", icon: Command, url: "/dashboard/command-center" },
//   { title: "Integrations", icon: Plug, url: "/dashboard/integrations" },
//   { title: "Getting Started", icon: Star, url: "/dashboard/onboarding" },

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
            Personal Productivity
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

        {/* ─── TEAM FEATURES ──────────────────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            Team Features
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { title: "Team Intelligence", icon: BarChart3, url: "/dashboard/team-intelligence", startsWith: true },
                { title: "Projects", icon: FolderKanban, url: "/dashboard/projects" },
                { title: "Team Management", icon: UsersRound, url: "/dashboard/team-management" },
                { title: "Members", icon: UsersRound, url: "/dashboard/members" },
                { title: "Workspace Setup", icon: Building2, url: "/dashboard/workspace-setup" },
                { title: "Team Insights", icon: TrendingUp, url: "/dashboard/team-insights" },
              ].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.startsWith ? location.startsWith(item.url) : location === item.url}
                    className="data-[active=true]:bg-white/10 data-[active=true]:text-white"
                  >
                    <Link href={item.url} className="flex items-center gap-3 px-3 py-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
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
