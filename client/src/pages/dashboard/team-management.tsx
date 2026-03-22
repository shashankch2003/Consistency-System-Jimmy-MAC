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
import { UsersRound, Plus, Users, ChevronRight, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TEAM_TYPES = ["Engineering", "Product", "Design", "Marketing", "Sales", "Operations", "HR", "Finance", "Support", "Other"];

interface Team {
  id: number;
  workspaceId: number;
  name: string;
  teamType: string;
  department?: string;
  description?: string;
  parentTeamId?: number;
  memberCount: number;
  createdAt?: string;
}

function CreateTeamModal({ workspaceId, teams, onClose }: { workspaceId: number; teams: Team[]; onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [teamType, setTeamType] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [parentTeamId, setParentTeamId] = useState("");

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team created" });
      onClose();
    },
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
        <CardHeader>
          <CardTitle>Create Team</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name *</Label>
              <Input id="team-name" data-testid="input-team-name" placeholder="e.g. Frontend Engineering" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Team Type *</Label>
              <Select value={teamType} onValueChange={setTeamType}>
                <SelectTrigger data-testid="select-team-type">
                  <SelectValue placeholder="Select team type" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-department">Department</Label>
              <Input id="team-department" data-testid="input-team-department" placeholder="e.g. Technology" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description</Label>
              <Input id="team-description" data-testid="input-team-description" placeholder="Brief description of the team" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {teams.length > 0 && (
              <div className="space-y-2">
                <Label>Parent Team (optional)</Label>
                <Select value={parentTeamId} onValueChange={setParentTeamId}>
                  <SelectTrigger data-testid="select-parent-team">
                    <SelectValue placeholder="No parent team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent team</SelectItem>
                    {teams.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
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

export default function TeamManagementPage() {
  const { activeWorkspace } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);

  const { data: allTeams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams", activeWorkspace?.id],
    queryFn: () => fetch(`/api/teams?workspaceId=${activeWorkspace?.id}`).then((r) => r.json()),
    enabled: !!activeWorkspace?.id,
  });

  if (!activeWorkspace) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium text-lg">No workspace selected</p>
          <p className="text-muted-foreground">Go to Workspace Setup to create or select a workspace first.</p>
        </div>
      </div>
    );
  }

  const rootTeams = allTeams.filter((t) => !t.parentTeamId);
  const subTeams = (parentId: number) => allTeams.filter((t) => t.parentTeamId === parentId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersRound className="h-6 w-6 text-primary" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">{activeWorkspace.name} · {allTeams.length} teams</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-new-team">
          <Plus className="h-4 w-4 mr-2" />New Team
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-20" />)}
        </div>
      ) : allTeams.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <UsersRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No teams yet</p>
            <p className="text-muted-foreground mb-4">Create your first team structure</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rootTeams.map((team) => (
            <div key={team.id}>
              <Card className="hover:border-primary/40 transition-colors" data-testid={`card-team-${team.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{team.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{team.teamType}</Badge>
                        {team.department && <span>{team.department}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{team.memberCount ?? 0} members</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
              {subTeams(team.id).map((sub) => (
                <Card key={sub.id} className="ml-8 mt-2 border-dashed hover:border-primary/40 transition-colors" data-testid={`card-team-${sub.id}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{sub.name}</div>
                        <Badge variant="outline" className="text-xs">{sub.teamType}</Badge>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{sub.memberCount ?? 0} members</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTeamModal
          workspaceId={activeWorkspace.id}
          teams={allTeams}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
