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
