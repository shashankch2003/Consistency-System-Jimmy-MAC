import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeDashboard from "@/components/team-intelligence/EmployeeDashboard";
import ManagerDashboard from "@/components/team-intelligence/ManagerDashboard";
import AdminDashboard from "@/components/team-intelligence/AdminDashboard";

export default function TeamIntelligencePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 border-b border-border/50">
        <h1 className="text-2xl font-bold text-white">Team Intelligence</h1>
        <p className="text-sm text-zinc-500 mt-1">Productivity analytics and AI insights for your team</p>
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
            <TabsTrigger
              value="team-dashboard"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
              data-testid="tab-team-dashboard"
            >
              Team Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="organization"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
              data-testid="tab-organization"
            >
              Organization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-dashboard">
            <EmployeeDashboard />
          </TabsContent>

          <TabsContent value="team-dashboard">
            <ManagerDashboard />
          </TabsContent>

          <TabsContent value="organization">
            <AdminDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
