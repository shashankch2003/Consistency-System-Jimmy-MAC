import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Trash2, Building2, Mail, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WORKSPACE_ROLES = ["Owner", "Admin", "Manager", "Member", "Guest", "Observer"];

const ROLE_COLORS: Record<string, string> = {
  Owner: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Admin: "bg-red-500/20 text-red-400 border-red-500/30",
  Manager: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Member: "bg-green-500/20 text-green-400 border-green-500/30",
  Guest: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Observer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

interface WorkspaceMember {
  id: number;
  workspaceId: number;
  userId?: string;
  email: string;
  displayName?: string;
  role: string;
  teamId?: number;
  status?: string;
  invitedAt?: string;
  joinedAt?: string;
}

function InviteMemberModal({ workspaceId, onClose }: { workspaceId: number; onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/workspace-members", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspace-members"] });
      toast({ title: "Invitation sent" });
      onClose();
    },
    onError: () => toast({ title: "Failed to send invite", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast({ title: "Email is required", variant: "destructive" });
    mutation.mutate({ workspaceId, email: email.trim(), role });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Invite Member
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input id="invite-email" data-testid="input-invite-email" type="email" placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSPACE_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-invite">
                {mutation.isPending ? "Sending…" : "Send Invite"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MembersPage() {
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading } = useQuery<WorkspaceMember[]>({
    queryKey: ["/api/workspace-members", activeWorkspace?.id],
    queryFn: () => fetch(`/api/workspace-members?workspaceId=${activeWorkspace?.id}`).then((r) => r.json()),
    enabled: !!activeWorkspace?.id,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiRequest("PATCH", `/api/workspace-members/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspace-members"] });
      toast({ title: "Role updated" });
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/workspace-members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspace-members"] });
      toast({ title: "Member removed" });
    },
    onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
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

  const filtered = members.filter((m) =>
    search === "" ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    (m.displayName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const initials = (m: WorkspaceMember) => {
    if (m.displayName) return m.displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    return m.email[0].toUpperCase();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Members
          </h1>
          <p className="text-muted-foreground mt-1">{activeWorkspace.name} · {members.length} members</p>
        </div>
        <Button onClick={() => setShowInvite(true)} data-testid="button-invite-member">
          <Plus className="h-4 w-4 mr-2" />Invite Member
        </Button>
      </div>

      <Input
        placeholder="Search by name or email…"
        data-testid="input-search-members"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">{search ? "No members found" : "No members yet"}</p>
            {!search && (
              <>
                <p className="text-muted-foreground mb-4">Invite your team members to get started</p>
                <Button onClick={() => setShowInvite(true)}>
                  <Plus className="h-4 w-4 mr-2" />Invite Member
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => (
            <Card key={member.id} data-testid={`card-member-${member.id}`} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">
                      {initials(member)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.displayName || member.email}</div>
                    {member.displayName && <div className="text-sm text-muted-foreground">{member.email}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`text-xs ${ROLE_COLORS[member.role] ?? ""}`}
                    data-testid={`badge-role-${member.id}`}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {member.role}
                  </Badge>
                  <Badge variant={member.status === "active" ? "default" : "secondary"} className="text-xs" data-testid={`badge-status-${member.id}`}>
                    {member.status ?? "invited"}
                  </Badge>
                  <Select
                    value={member.role}
                    onValueChange={(r) => roleMutation.mutate({ id: member.id, role: r })}
                  >
                    <SelectTrigger className="h-8 w-32" data-testid={`select-role-${member.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKSPACE_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    data-testid={`button-remove-member-${member.id}`}
                    onClick={() => removeMutation.mutate(member.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showInvite && (
        <InviteMemberModal workspaceId={activeWorkspace.id} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}
