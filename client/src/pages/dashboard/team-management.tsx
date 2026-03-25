import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UsersRound, Plus, Users, ChevronRight, Building2, Code2, Megaphone, ShoppingCart, Settings, HeartHandshake, PenTool, Layers, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TEAM_TYPES = ["Engineering", "Product", "Design", "Marketing", "Sales", "Operations", "HR", "Finance", "Support", "Other"];

const TEAM_TYPE_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  Engineering: { color: "text-blue-400", bg: "bg-blue-500/10", icon: Code2 },
  Product:     { color: "text-purple-400", bg: "bg-purple-500/10", icon: Layers },
  Design:      { color: "text-pink-400", bg: "bg-pink-500/10", icon: PenTool },
  Marketing:   { color: "text-orange-400", bg: "bg-orange-500/10", icon: Megaphone },
  Sales:       { color: "text-green-400", bg: "bg-green-500/10", icon: ShoppingCart },
  Operations:  { color: "text-cyan-400", bg: "bg-cyan-500/10", icon: Settings },
  HR:          { color: "text-yellow-400", bg: "bg-yellow-500/10", icon: HeartHandshake },
  Finance:     { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Building2 },
  Support:     { color: "text-rose-400", bg: "bg-rose-500/10", icon: HeartHandshake },
  Other:       { color: "text-gray-400", bg: "bg-gray-500/10", icon: Users },
};

interface Team {
  id: number; workspaceId: number; name: string; teamType: string;
  department?: string; description?: string; parentTeamId?: number; memberCount: number; createdAt?: string;
}

const DEMO_TEAMS: Team[] = [
  { id: 1, workspaceId: 1, name: "Engineering", teamType: "Engineering", department: "Technology", description: "Core product engineering — backend, frontend, and infrastructure", memberCount: 15 },
  { id: 2, workspaceId: 1, name: "Product", teamType: "Product", department: "Product", description: "Product strategy, roadmap, and user research", memberCount: 8 },
  { id: 3, workspaceId: 1, name: "Design", teamType: "Design", department: "Product", description: "UX/UI design, brand identity, and design systems", memberCount: 6 },
  { id: 4, workspaceId: 1, name: "Marketing", teamType: "Marketing", department: "Marketing", description: "Growth, content strategy, and brand marketing", memberCount: 7 },
  { id: 5, workspaceId: 1, name: "Sales", teamType: "Sales", department: "Revenue", description: "Enterprise and SMB sales, account management", memberCount: 8 },
  { id: 6, workspaceId: 1, name: "Operations", teamType: "Operations", department: "Operations", description: "Infrastructure, logistics, and internal tools", memberCount: 4 },
  { id: 7, workspaceId: 1, name: "HR & Finance", teamType: "HR", department: "People & Finance", description: "People operations, talent acquisition, and finance", memberCount: 2 },
];

function CreateTeamModal({ workspaceId, teams, onClose }: { workspaceId: number; teams: Team[]; onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(""); const [teamType, setTeamType] = useState("");
  const [department, setDepartment] = useState(""); const [description, setDescription] = useState("");
  const [parentTeamId, setParentTeamId] = useState("");

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/teams", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/teams"] }); toast({ title: "Team created" }); onClose(); },
    onError: () => toast({ title: "Failed to create team", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamType) return toast({ title: "Name and team type are required", variant: "destructive" });
    mutation.mutate({ workspaceId, name: name.trim(), teamType, department, description, parentTeamId: parentTeamId ? parseInt(parentTeamId) : null });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader><CardTitle>Create Team</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name *</Label>
              <Input id="team-name" data-testid="input-team-name" placeholder="e.g. Frontend Engineering" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Team Type *</Label>
              <Select value={teamType} onValueChange={setTeamType}>
                <SelectTrigger data-testid="select-team-type"><SelectValue placeholder="Select team type" /></SelectTrigger>
                <SelectContent>{TEAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-department">Department</Label>
              <Input id="team-department" data-testid="input-team-department" placeholder="e.g. Technology" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description</Label>
              <Input id="team-description" data-testid="input-team-description" placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {teams.length > 0 && (
              <div className="space-y-2">
                <Label>Parent Team (optional)</Label>
                <Select value={parentTeamId} onValueChange={setParentTeamId}>
                  <SelectTrigger data-testid="select-parent-team"><SelectValue placeholder="No parent team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent team</SelectItem>
                    {teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-team">
                {mutation.isPending ? "Creating…" : "Create Team"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamCard({ team, subTeams }: { team: Team; subTeams: Team[] }) {
  const cfg = TEAM_TYPE_CONFIG[team.teamType] ?? TEAM_TYPE_CONFIG.Other;
  const Icon = cfg.icon;
  return (
    <Card className="hover:border-primary/40 transition-all hover:shadow-sm" data-testid={`card-team-${team.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl ${cfg.bg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${cfg.color}`} />
            </div>
            <div>
              <div className="font-semibold text-base">{team.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={`text-xs ${cfg.color}`}>{team.teamType}</Badge>
                {team.department && <span className="text-xs text-muted-foreground">{team.department}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{team.memberCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">members</div>
          </div>
        </div>
        {team.description && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{team.description}</p>
        )}
        {subTeams.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">{subTeams.length} sub-team{subTeams.length > 1 ? "s" : ""}</p>
            <div className="flex flex-wrap gap-1">
              {subTeams.map(s => <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TeamManagementPage() {
  const { activeWorkspace, isSeeding } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");

  const { data: dbTeams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams", activeWorkspace?.id],
    queryFn: () => fetch(`/api/teams?workspaceId=${activeWorkspace?.id}`).then(r => r.json()),
    enabled: !!activeWorkspace?.id,
  });

  // Use real DB data if workspace active, otherwise show demo data
  const allTeams = activeWorkspace ? dbTeams : DEMO_TEAMS;
  const displayName = activeWorkspace?.name ?? "TechNova Solutions (Demo)";
  const isDemo = !activeWorkspace;

  const types = ["All", ...Array.from(new Set(allTeams.map(t => t.teamType)))];
  const rootTeams = allTeams.filter(t => !t.parentTeamId && (typeFilter === "All" || t.teamType === typeFilter));
  const subTeams = (parentId: number) => allTeams.filter(t => t.parentTeamId === parentId);
  const totalMembers = allTeams.reduce((sum, t) => sum + (t.memberCount ?? 0), 0);

  const deptGroups: Record<string, Team[]> = {};
  for (const t of rootTeams) {
    const dept = t.department || "Other";
    if (!deptGroups[dept]) deptGroups[dept] = [];
    deptGroups[dept].push(t);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersRound className="h-6 w-6 text-primary" /> Team Management
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            {displayName}
            {isSeeding && <span className="flex items-center gap-1 text-primary text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Loading live data…</span>}
            {isDemo && !isSeeding && <Badge variant="secondary" className="text-xs">Demo Preview</Badge>}
          </p>
        </div>
        {activeWorkspace && (
          <Button onClick={() => setShowCreate(true)} data-testid="button-new-team">
            <Plus className="h-4 w-4 mr-2" /> New Team
          </Button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Teams", value: allTeams.length, icon: Layers, color: "text-primary" },
          { label: "Total Members", value: totalMembers, icon: Users, color: "text-green-400" },
          { label: "Departments", value: Object.keys(deptGroups).length, icon: Building2, color: "text-purple-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {types.map(t => (
          <Button key={t} size="sm" variant={typeFilter === t ? "default" : "outline"}
            onClick={() => setTypeFilter(t)} data-testid={`filter-type-${t}`}>
            {t}
          </Button>
        ))}
      </div>

      {/* Teams by department */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-28" />)}</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(deptGroups).map(([dept, teams]) => (
            <div key={dept}>
              <div className="flex items-center gap-2 mb-3">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{dept}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{teams.length} team{teams.length > 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map(team => <TeamCard key={team.id} team={team} subTeams={subTeams(team.id)} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && activeWorkspace && (
        <CreateTeamModal workspaceId={activeWorkspace.id} teams={allTeams} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
