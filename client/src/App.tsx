import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LandingPage from "@/pages/landing";
import DashboardLayout from "@/pages/dashboard/layout";
import GoalsPage from "@/pages/dashboard/goals";
import TasksPage from "@/pages/dashboard/tasks";
import GoodHabitsPage from "@/pages/dashboard/good-habits";
import BadHabitsPage from "@/pages/dashboard/bad-habits";
import HourlyPage from "@/pages/dashboard/hourly";
import TaskBankPage from "@/pages/dashboard/task-bank";
import DailyScorePage from "@/pages/dashboard/daily-score";
import NotesPage from "@/pages/dashboard/notes";
import CommunityPage from "@/pages/dashboard/community";
import AdminPage from "@/pages/dashboard/admin";
import JournalPage from "@/pages/dashboard/journal";
import FundamentalsPage from "@/pages/dashboard/fundamentals";
import SettingsPage from "@/pages/dashboard/settings";
import MoneyTrackingPage from "@/pages/dashboard/money-tracking";
import KnowMorePage from "@/pages/dashboard/know-more";
import GrowTogetherPage from "@/pages/dashboard/grow-together";
import TeamIntelligencePage from "@/pages/dashboard/team-intelligence";
import TeamIntelligenceSettingsPage from "@/pages/dashboard/team-intelligence-settings";
import WorkspaceSetupPage from "@/pages/dashboard/workspace-setup";
import TeamManagementPage from "@/pages/dashboard/team-management";
import MembersPage from "@/pages/dashboard/members";
import ProjectsPage from "@/pages/dashboard/projects";
import MessagesPage from "@/pages/dashboard/messages";
import WikiPage from "@/pages/dashboard/wiki";
import TimesheetsPage from "@/pages/dashboard/timesheets";
import ProductivityDashboard from "@/pages/dashboard/productivity";
import WorkloadPage from "@/pages/dashboard/workload";
import ReportsPage from "@/pages/dashboard/reports";
import OKRGoalsPage from "@/pages/dashboard/okr-goals";
import AutomationsPage from "@/pages/dashboard/automations";
import ConnectPage from "@/pages/dashboard/connect";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard">
        <DashboardLayout>
          <GoalsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/goals">
        <DashboardLayout>
          <GoalsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/tasks">
        <DashboardLayout>
          <TasksPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/task-bank">
        <DashboardLayout>
          <TaskBankPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/daily-score">
        <DashboardLayout>
          <DailyScorePage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/good-habits">
        <DashboardLayout>
          <GoodHabitsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/bad-habits">
        <DashboardLayout>
          <BadHabitsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/hourly">
        <DashboardLayout>
          <HourlyPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/notes">
        <DashboardLayout>
          <NotesPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/community">
        <DashboardLayout>
          <CommunityPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/journal">
        <DashboardLayout>
          <JournalPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/fundamentals">
        <DashboardLayout>
          <FundamentalsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/money">
        <DashboardLayout>
          <MoneyTrackingPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/know-more">
        <DashboardLayout>
          <KnowMorePage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/grow-together">
        <DashboardLayout>
          <GrowTogetherPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/settings">
        <DashboardLayout>
          <SettingsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/admin">
        <DashboardLayout>
          <AdminPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/team-intelligence/settings">
        <DashboardLayout>
          <TeamIntelligenceSettingsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/team-intelligence">
        <DashboardLayout>
          <TeamIntelligencePage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/workspace-setup">
        <DashboardLayout>
          <WorkspaceSetupPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/team-management">
        <DashboardLayout>
          <TeamManagementPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/members">
        <DashboardLayout>
          <MembersPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/projects">
        <DashboardLayout>
          <ProjectsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/messages">
        <DashboardLayout>
          <MessagesPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/wiki">
        <DashboardLayout>
          <WikiPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/timesheets">
        <DashboardLayout>
          <TimesheetsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/productivity">
        <DashboardLayout>
          <ProductivityDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/workload">
        <DashboardLayout>
          <WorkloadPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/reports">
        <DashboardLayout>
          <ReportsPage />
        </DashboardLayout>
      </Route>

      <Route path="/dashboard/okr-goals">
        <DashboardLayout>
          <OKRGoalsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/automations">
        <DashboardLayout>
          <AutomationsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/connect">
        <DashboardLayout>
          <ConnectPage />
        </DashboardLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
