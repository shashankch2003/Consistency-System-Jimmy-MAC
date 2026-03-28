import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { TimeTracker } from "@/components/time/TimeTracker";
import { AICommandBar } from "@/components/ai/AICommandBar";
import { AICoach } from "@/components/ai/AICoach";
import { SmartSearch } from "@/components/ai/SmartSearch";
import QuickNavModal from "@/components/pm/QuickNavModal";
import { useEffect } from "react";

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
    <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
        return;
      }
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
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", background: "#0a0a0a", color: "#fafafa" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #666", borderTopColor: "#fafafa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#888", fontSize: 14 }}>Loading Consistency System…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    const isInIframe = window.self !== window.top;
    const returnTo = encodeURIComponent(window.location.pathname);
    const loginUrl = `/api/login?returnTo=${returnTo}`;
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", background: "#0a0a0a", color: "#fafafa" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Sign In Required</h2>
          <p style={{ color: "#888", fontSize: 14, margin: 0 }}>
            {isInIframe ? "Please open the app in a new tab to sign in." : "Please sign in to access your dashboard."}
          </p>
        </div>
        <a
          href={loginUrl}
          target={isInIframe ? "_blank" : "_self"}
          rel="noreferrer"
          style={{ padding: "10px 28px", background: "#fafafa", color: "#0a0a0a", borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: "none", display: "inline-block" }}
        >
          {isInIframe ? "Open App & Sign In" : "Sign In with Replit"}
        </a>
      </div>
    );
  }

  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background overflow-hidden">
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
        <QuickNavModal />
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
