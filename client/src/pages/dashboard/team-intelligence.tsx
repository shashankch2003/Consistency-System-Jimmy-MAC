import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Cog } from "lucide-react";
import EmployeeDashboard from "@/components/team-intelligence/EmployeeDashboard";
import ManagerDashboard from "@/components/team-intelligence/ManagerDashboard";
import AdminDashboard from "@/components/team-intelligence/AdminDashboard";

export default function TeamIntelligencePage() {
  const [, setLocation] = useLocation();
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({ queryKey: ["/api/level/is-admin"] });
  const isAdmin = adminCheck?.isAdmin ?? false;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Team Intelligence</h1>
            <p className="text-sm text-zinc-500 mt-1">Productivity analytics and AI insights for your team</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-zinc-400 hover:text-white"
            onClick={() => setLocation("/dashboard/team-intelligence/settings")}
            data-testid="button-ti-settings"
          >
            <Cog className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="my-dashboard" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 mb-6" data-testid="tabs-team-intelligence">
            <TabsTrigger
              value="my-dashboard"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
              data-testid="tab-my-dashboard"
            >
              My Dashboard
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="team-dashboard"
                className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
                data-testid="tab-team-dashboard"
              >
                Team Dashboard
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger
                value="organization"
                className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
                data-testid="tab-organization"
              >
                Organization
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-dashboard">
            <EmployeeDashboard workspaceId="default" />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="team-dashboard">
              <ManagerDashboard workspaceId="default" />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="organization">
              <AdminDashboard workspaceId="default" />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
