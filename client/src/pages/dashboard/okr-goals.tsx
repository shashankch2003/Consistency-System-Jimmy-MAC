import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/context/WorkspaceContext";
import { OKRTree } from "@/components/goals/OKRTree";
import { CreateGoalModal } from "@/components/goals/CreateGoalModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODS = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026", "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"];
type TabId = "company" | "team" | "individual";
const TABS: { id: TabId; label: string }[] = [
  { id: "company", label: "Company Goals" },
  { id: "team", label: "Team Goals" },
  { id: "individual", label: "My Goals" },
];

export default function OKRGoalsPage() {
  const { workspaceId } = useWorkspace();
  const [period, setPeriod] = useState("Q1 2026");
  const [activeTab, setActiveTab] = useState<TabId>("company");
  const [showCreate, setShowCreate] = useState(false);

  const { data: goals = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/okr-goals", workspaceId, period],
    queryFn: () => fetch(`/api/okr-goals?workspaceId=${workspaceId}&period=${encodeURIComponent(period)}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const FILTER_MAP: Record<TabId, string> = {
    company: "company",
    team: "team",
    individual: "individual",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" data-testid="okr-goals-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />Goals & OKRs
          </h1>
          <p className="text-muted-foreground mt-0.5">Track company, team, and individual objectives</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="gap-1" onClick={() => setShowCreate(true)} data-testid="button-add-goal">
            <Plus className="h-4 w-4" />Add Goal
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Goals", value: goals.length },
          { label: "On Track", value: goals.filter((g) => g.confidence === "on_track").length, color: "text-green-400" },
          { label: "At Risk", value: goals.filter((g) => g.confidence === "at_risk").length, color: "text-orange-400" },
          { label: "Off Track", value: goals.filter((g) => g.confidence === "off_track").length, color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color ?? ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OKR Tree */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <OKRTree goals={goals} filterType={FILTER_MAP[activeTab]} />
      )}

      {/* Create Goal Modal */}
      {workspaceId && (
        <CreateGoalModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          period={period}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
