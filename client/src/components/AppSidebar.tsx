import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
} from "@/components/ui/sidebar";
import { 
  Target, 
  Layout, 
  CheckCircle, 
  XCircle, 
  Clock, 
  LogOut,
  User,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Goals", icon: Target, url: "/dashboard/goals" },
  { title: "Daily Tasks", icon: Layout, url: "/dashboard/tasks" },
  { title: "Good Habits", icon: CheckCircle, url: "/dashboard/good-habits" },
  { title: "Bad Habits", icon: XCircle, url: "/dashboard/bad-habits" },
  { title: "Hourly Tracker", icon: Clock, url: "/dashboard/hourly" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar className="border-r border-border bg-card/95 backdrop-blur-xl">
      <SidebarHeader className="p-4 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-lg">Consistency</span>
        </Link>
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
                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
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
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Profile" className="w-full h-full rounded-full" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName || 'User'}</p>
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
