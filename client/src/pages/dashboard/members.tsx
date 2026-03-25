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
import { Users, Plus, Trash2, Building2, Mail, Shield, Search, Crown, UserCog, User, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WORKSPACE_ROLES = ["Owner", "Admin", "Manager", "Member", "Guest", "Observer"];

const ROLE_CONFIG: Record<string, { color: string; border: string; bg: string; icon: any }> = {
  Owner:    { color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/10", icon: Crown },
  Admin:    { color: "text-red-400",    border: "border-red-500/30",    bg: "bg-red-500/10",    icon: Shield },
  Manager:  { color: "text-blue-400",   border: "border-blue-500/30",   bg: "bg-blue-500/10",   icon: UserCog },
  Member:   { color: "text-green-400",  border: "border-green-500/30",  bg: "bg-green-500/10",  icon: User },
  Guest:    { color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10", icon: User },
  Observer: { color: "text-gray-400",   border: "border-gray-500/30",   bg: "bg-gray-500/10",   icon: Eye },
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
  "bg-teal-500", "bg-amber-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface WorkspaceMember {
  id: number; workspaceId: number; userId?: string; email: string;
  displayName?: string; role: string; teamId?: number; status?: string;
  invitedAt?: string; joinedAt?: string;
}

function InviteMemberModal({ workspaceId, onClose }: { workspaceId: number; onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState(""); const [role, setRole] = useState("Member");

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/workspace-members", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspace-members"] });
      toast({ title: "✓ Invitation sent" }); onClose();
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
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Invite Member</h2>
          <p className="text-sm text-muted-foreground mb-4">They'll receive an invitation to join this workspace.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input id="invite-email" data-testid="input-invite-email" type="email" placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-member-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORKSPACE_ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      <div className="flex flex-col">
                        <span>{r}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === "Owner" && "Full control — can delete workspace"}
                {role === "Admin" && "Manage teams, members, and settings"}
                {role === "Manager" && "Create and manage team tasks and projects"}
                {role === "Member" && "Standard access — can create and edit their own work"}
                {role === "Guest" && "Limited access — invited collaborators from outside"}
                {role === "Observer" && "View-only — can see but cannot edit anything"}
              </p>
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

function initials(m: WorkspaceMember) {
  if (m.displayName) return m.displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return m.email[0].toUpperCase();
}

export default function MembersPage() {
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const { data: members = [], isLoading } = useQuery<WorkspaceMember[]>({
    queryKey: ["/api/workspace-members", activeWorkspace?.id],
    queryFn: () => fetch(`/api/workspace-members?workspaceId=${activeWorkspace?.id}`).then(r => r.json()),
    enabled: !!activeWorkspace?.id,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => apiRequest("PATCH", `/api/workspace-members/${id}/role`, { role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/workspace-members"] }); toast({ title: "Role updated" }); },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/workspace-members/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/workspace-members"] }); toast({ title: "Member removed" }); },
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

  const filtered = members.filter(m => {
    const matchSearch = search === "" ||
      (m.displayName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = WORKSPACE_ROLES.reduce((acc, r) => {
    acc[r] = members.filter(m => m.role === r).length;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = members.filter(m => m.status === "active").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Members</h1>
          <p className="text-muted-foreground mt-1">{activeWorkspace.name} · {members.length} people</p>
        </div>
        <Button onClick={() => setShowInvite(true)} data-testid="button-invite-member">
          <Plus className="h-4 w-4 mr-2" /> Invite Member
        </Button>
      </div>

      {/* Stats row */}
      {members.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Members", value: members.length, color: "text-primary" },
            { label: "Active", value: activeCount, color: "text-green-400" },
            { label: "Managers & Above", value: (roleCounts.Owner ?? 0) + (roleCounts.Admin ?? 0) + (roleCounts.Manager ?? 0), color: "text-blue-400" },
            { label: "Guests & Observers", value: (roleCounts.Guest ?? 0) + (roleCounts.Observer ?? 0), color: "text-purple-400" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-3 text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email…" data-testid="input-search-members"
            value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["All", ...WORKSPACE_ROLES].map(r => (
            <Button key={r} size="sm" variant={roleFilter === r ? "default" : "outline"}
              onClick={() => setRoleFilter(r)} data-testid={`filter-role-${r}`}
              className="h-8 text-xs">
              {r} {r !== "All" && roleCounts[r] ? `(${roleCounts[r]})` : ""}
            </Button>
          ))}
        </div>
      </div>

      {/* Member list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Card key={i} className="animate-pulse h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">{search || roleFilter !== "All" ? "No members found" : "No members yet"}</p>
            {!search && roleFilter === "All" && (
              <>
                <p className="text-muted-foreground mb-4">Invite team members or load a demo company from Workspace Setup</p>
                <Button onClick={() => setShowInvite(true)}><Plus className="h-4 w-4 mr-2" /> Invite Member</Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((member) => {
            const cfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.Member;
            const RoleIcon = cfg.icon;
            const avatarColor = getAvatarColor(member.displayName ?? member.email);
            return (
              <Card key={member.id} data-testid={`card-member-${member.id}`}
                className="hover:border-primary/30 transition-colors">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  {/* Left: avatar + name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className={`text-sm font-semibold text-white ${avatarColor}`}>
                        {initials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{member.displayName || member.email}</div>
                      {member.displayName && <div className="text-xs text-muted-foreground truncate">{member.email}</div>}
                    </div>
                  </div>

                  {/* Right: role badge + status + change role + remove */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs hidden md:flex items-center gap-1 ${cfg.color} ${cfg.border} ${cfg.bg}`}
                      data-testid={`badge-role-${member.id}`}>
                      <RoleIcon className="h-3 w-3" /> {member.role}
                    </Badge>

                    <Badge variant={member.status === "active" ? "default" : "secondary"}
                      className="text-xs" data-testid={`badge-status-${member.id}`}>
                      {member.status === "active" ? "● Active" : member.status ?? "Invited"}
                    </Badge>

                    <Select value={member.role} onValueChange={r => roleMutation.mutate({ id: member.id, role: r })}>
                      <SelectTrigger className="h-7 w-28 text-xs" data-testid={`select-role-${member.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>{WORKSPACE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>

                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      data-testid={`button-remove-member-${member.id}`}
                      onClick={() => removeMutation.mutate(member.id)}
                      disabled={removeMutation.isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Role guide */}
      {members.length > 0 && (
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Role Guide</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { role: "Owner", desc: "Full control of the workspace" },
                { role: "Admin", desc: "Manage teams, members & settings" },
                { role: "Manager", desc: "Run teams and assign tasks" },
                { role: "Member", desc: "Standard member, creates own work" },
                { role: "Guest", desc: "External collaborator, limited access" },
                { role: "Observer", desc: "View only — no editing allowed" },
              ].map(({ role, desc }) => {
                const cfg = ROLE_CONFIG[role];
                const Icon = cfg.icon;
                return (
                  <div key={role} className="flex items-start gap-2">
                    <Icon className={`h-3.5 w-3.5 mt-0.5 ${cfg.color}`} />
                    <div>
                      <span className={`text-xs font-medium ${cfg.color}`}>{role}</span>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {showInvite && <InviteMemberModal workspaceId={activeWorkspace.id} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
