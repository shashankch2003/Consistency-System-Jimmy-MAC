import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/context/WorkspaceContext";
import { WorkloadView } from "@/components/workload/WorkloadView";
import { CapacityPlanner } from "@/components/workload/CapacityPlanner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "workload" | "capacity";

export default function WorkloadPage() {
  const { workspaceId } = useWorkspace();
  const [activeTab, setActiveTab] = useState<Tab>("workload");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", workspaceId],
    queryFn: () => fetch(`/api/teams?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const { data: workloadData = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/workload", workspaceId, teamFilter],
    queryFn: () => {
      const params = new URLSearchParams({ workspaceId: String(workspaceId) });
      if (teamFilter !== "all") params.set("teamId", teamFilter);
      return fetch(`/api/workload?${params}`).then((r) => r.json());
    },
    enabled: !!workspaceId,
  });

  const totalCapacity = workloadData.reduce((s: number, m: any) => s + (m.weeklyCapacityHours || 40), 0);
  const totalCommitted = workloadData.reduce((s: number, m: any) => s + m.totalMinutes / 60, 0);
  const overloaded = workloadData.filter((m: any) => m.utilization > 100).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="workload-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />Workload & Resources
          </h1>
          <p className="text-muted-foreground mt-0.5">Balance team capacity and manage availability</p>
        </div>

        {/* Team selector */}
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-48" data-testid="select-team-filter">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t: any) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: workloadData.length },
          { label: "Total Capacity", value: `${totalCapacity}h/wk` },
          { label: "Committed", value: `${Math.round(totalCommitted)}h` },
          { label: "Overloaded", value: overloaded, danger: overloaded > 0 },
        ].map(({ label, value, danger }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${danger ? "text-red-400" : ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([["workload", "Current Workload"], ["capacity", "Capacity Planning"]] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${activeTab === id ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            data-testid={`tab-${id}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : activeTab === "workload" ? (
        <WorkloadView workloadData={workloadData} workspaceId={workspaceId!} />
      ) : (
        <CapacityPlanner members={workloadData} />
      )}
    </div>
  );
}
