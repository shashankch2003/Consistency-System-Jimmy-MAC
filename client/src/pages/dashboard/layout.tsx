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
      // If running inside an iframe (canvas preview), do NOT auto-redirect —
      // the OAuth flow won't work inside an iframe. Instead we show the Sign In screen.
      const isInIframe = window.self !== window.top;
      if (!isInIframe) {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/api/login?returnTo=${returnTo}`;
      }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading Consistency System…</p>
      </div>
    );
  }

  if (!user) {
    const isInIframe = window.self !== window.top;
    const returnTo = encodeURIComponent(window.location.pathname);
    const loginUrl = `/api/login?returnTo=${returnTo}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Session Expired</h2>
          <p className="text-muted-foreground text-sm">
            {isInIframe ? "Please open the app in a new tab to sign in." : "You need to sign in to continue."}
          </p>
        </div>
        <a
          href={loginUrl}
          target={isInIframe ? "_blank" : "_self"}
          rel="noreferrer"
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {isInIframe ? "Open App & Sign In" : "Sign In"}
        </a>
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
