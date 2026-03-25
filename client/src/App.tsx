import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Component, type ErrorInfo, type ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message || "Unknown error" }; }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error("React render error:", e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fafafa", padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "#999", fontSize: 13, maxWidth: 500, marginBottom: 20 }}>{this.state.error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 20px", background: "#fafafa", color: "#0a0a0a", borderRadius: 6, fontWeight: 600, cursor: "pointer", border: "none" }}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
import AutopilotPanel from "@/pages/autopilot/AutopilotPanel";
import TimeMachine from "@/pages/analytics/TimeMachine";
import DailyPlanner from "@/pages/planner/DailyPlanner";
import MyDayPage from "@/pages/dashboard/my-day";
import AiHabitsPage from "@/pages/dashboard/ai-habits";
import FocusCoachPage from "@/pages/dashboard/focus-coach";
import AiAgentsPage from "@/pages/dashboard/ai-agents";
import AiWorkflowsPage from "@/pages/dashboard/ai-workflows";
import ProjectManagerPage from "@/pages/dashboard/project-manager";
import TaskIntelPage from "@/pages/dashboard/task-intel";
import DatabaseAiPage from "@/pages/dashboard/database-ai";
import MeetingsPage from "@/pages/dashboard/meetings";
import DocGeneratorPage from "@/pages/dashboard/doc-generator";
import MessagingAiPage from "@/pages/dashboard/messaging-ai";
import EmailPage from "@/pages/dashboard/email";
import OkrSystemPage from "@/pages/dashboard/okr-system";
import CalendarOptimizerPage from "@/pages/dashboard/calendar-optimizer";
import TimeTrackingPage from "@/pages/dashboard/time-tracking";
import NotificationsCenterPage from "@/pages/dashboard/notifications-center";
import AiTemplateEnginePage from "@/pages/dashboard/ai-template-engine";
import VoicePage from "@/pages/dashboard/voice";
import CommandCenterPage from "@/pages/dashboard/command-center";
import TeamInsightsPage from "@/pages/dashboard/team-insights";
import IntegrationsPage from "@/pages/dashboard/integrations";
import OnboardingPage from "@/pages/dashboard/onboarding";
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
      <Route path="/dashboard/autopilot">
        <DashboardLayout>
          <AutopilotPanel />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/time-machine">
        <DashboardLayout>
          <TimeMachine />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/daily-planner">
        <DashboardLayout>
          <DailyPlanner />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/my-day">
        <DashboardLayout>
          <MyDayPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/ai-habits">
        <DashboardLayout>
          <AiHabitsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/focus-coach">
        <DashboardLayout>
          <FocusCoachPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/ai-agents">
        <DashboardLayout>
          <AiAgentsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/ai-workflows">
        <DashboardLayout>
          <AiWorkflowsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/project-manager">
        <DashboardLayout>
          <ProjectManagerPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/task-intel">
        <DashboardLayout>
          <TaskIntelPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/database-ai">
        <DashboardLayout>
          <DatabaseAiPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/meetings">
        <DashboardLayout>
          <MeetingsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/doc-generator">
        <DashboardLayout>
          <DocGeneratorPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/messaging-ai">
        <DashboardLayout>
          <MessagingAiPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/email">
        <DashboardLayout>
          <EmailPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/okr-system">
        <DashboardLayout>
          <OkrSystemPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/calendar-optimizer">
        <DashboardLayout>
          <CalendarOptimizerPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/time-tracking">
        <DashboardLayout>
          <TimeTrackingPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/notifications-center">
        <DashboardLayout>
          <NotificationsCenterPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/ai-template-engine">
        <DashboardLayout>
          <AiTemplateEnginePage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/voice">
        <DashboardLayout>
          <VoicePage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/command-center">
        <DashboardLayout>
          <CommandCenterPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/team-insights">
        <DashboardLayout>
          <TeamInsightsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/integrations">
        <DashboardLayout>
          <IntegrationsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/onboarding">
        <DashboardLayout>
          <OnboardingPage />
        </DashboardLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
