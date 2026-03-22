import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/hooks/use-auth";
import { ProductivityScore } from "@/components/productivity/ProductivityScore";
import { ComparisonCards } from "@/components/productivity/ComparisonCards";
import { PerformanceProfile } from "@/components/productivity/PerformanceProfile";
import { TeamHealthDashboard } from "@/components/productivity/TeamHealthDashboard";
import { PerformerIdentification } from "@/components/productivity/PerformerIdentification";
import { calculateProductivityScore, calculateComparisons } from "@/utils/productivityCalculator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "overview" | "profiles" | "health" | "comparisons";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "profiles", label: "Individual Profiles" },
  { id: "health", label: "Team Health" },
  { id: "comparisons", label: "Comparisons" },
];

export default function ProductivityDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: snapshots = [] } = useQuery<any[]>({
    queryKey: ["/api/productivity/snapshots"],
    queryFn: () => fetch("/api/productivity/snapshots").then((r) => r.json()),
  });

  const { data: membersList = [] } = useQuery<any[]>({
    queryKey: ["/api/workspace-members", workspaceId],
    queryFn: () => fetch(`/api/workspace-members?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const snapshotMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/productivity/snapshot", { workspaceId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/productivity/snapshots"] }),
  });

  useEffect(() => {
    if (user?.id) setSelectedUserId(user.id);
  }, [user]);

  // Auto-trigger snapshot on load if no snapshot today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const hasToday = snapshots.some((s) => s.date === today);
    if (!hasToday && workspaceId) snapshotMutation.mutate();
  }, [snapshots, workspaceId]);

  const latest = snapshots[0];
  const scoreData = latest ? calculateProductivityScore(latest) : null;
  const comparisons = calculateComparisons(snapshots);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="productivity-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />Productivity Intelligence
          </h1>
          <p className="text-muted-foreground mt-0.5">AI-powered performance analytics and team insights</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          gap-1
          onClick={() => snapshotMutation.mutate()}
          disabled={snapshotMutation.isPending}
          data-testid="button-refresh-snapshot"
          className="gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${snapshotMutation.isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Score ring */}
            <div className="col-span-1 flex flex-col items-center bg-card rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Your Score</h3>
              {scoreData ? (
                <ProductivityScore overallScore={scoreData.overallScore} factors={scoreData.factors} />
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">No data yet — check back later</div>
              )}
            </div>
            {/* Comparison cards */}
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Comparisons</h3>
              <ComparisonCards comparisons={comparisons} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "profiles" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">View profile for:</span>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-48" data-testid="select-profile-user">
                <SelectValue placeholder="Select member..." />
              </SelectTrigger>
              <SelectContent>
                {user?.id && (
                  <SelectItem value={user.id}>Me ({user.firstName || "You"})</SelectItem>
                )}
                {membersList.filter((m) => m.userId && m.userId !== user?.id).map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.displayName || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUserId && (
            <PerformanceProfile
              userId={selectedUserId}
              displayName={
                selectedUserId === user?.id
                  ? (user?.firstName || "Me")
                  : membersList.find((m) => m.userId === selectedUserId)?.displayName
              }
            />
          )}

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">Team Performers</h3>
            <PerformerIdentification />
          </div>
        </div>
      )}

      {activeTab === "health" && (
        <TeamHealthDashboard />
      )}

      {activeTab === "comparisons" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Compare with:</span>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-48" data-testid="select-comparison-user">
                <SelectValue placeholder="Select member..." />
              </SelectTrigger>
              <SelectContent>
                {membersList.filter((m) => m.userId).map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.displayName || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ComparisonCards comparisons={comparisons} detailed />
        </div>
      )}
    </div>
  );
}
