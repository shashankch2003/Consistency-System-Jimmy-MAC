import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { TimeTracker } from "@/components/time/TimeTracker";
import { AICommandBar } from "@/components/ai/AICommandBar";
import { AICoach } from "@/components/ai/AICoach";
import { SmartSearch } from "@/components/ai/SmartSearch";

function DashboardContent({
  children,
  onOpenCommand,
  onOpenSearch,
  onOpenCoach,
}: {
  children: React.ReactNode;
  onOpenCommand: () => void;
  onOpenSearch: () => void;
  onOpenCoach: () => void;
}) {
  const { state } = useSidebar();

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
      {state === "collapsed" && (
        <div className="fixed top-2 left-1 z-20">
          <SidebarTrigger
            className="bg-card/90 backdrop-blur-sm border border-border shadow-lg rounded-lg"
            data-testid="button-sidebar-reopen"
          />
        </div>
      )}
      {children}
    </main>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [user, isLoading]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+K → AI Command Bar
      if (ctrl && e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
        return;
      }

      // Ctrl+Shift+F → Smart Search
      if (ctrl && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar
            onOpenCommand={() => setCommandOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenCoach={() => setCoachOpen((prev) => !prev)}
          />
          <DashboardContent
            onOpenCommand={() => setCommandOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenCoach={() => setCoachOpen((prev) => !prev)}
          >
            {children}
          </DashboardContent>
          <TimeTracker />
        </div>

        {/* Global overlays */}
        <AICommandBar open={commandOpen} onClose={() => setCommandOpen(false)} />
        <SmartSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        <AICoach open={coachOpen} onClose={() => setCoachOpen(false)} />
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
