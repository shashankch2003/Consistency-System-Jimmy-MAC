import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Settings, Users, Trash2, MoreHorizontal, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  member: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  guest: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const ROLES = ["admin", "member", "guest"];
const WORKSPACE_ICONS = ["🏠", "🏢", "🚀", "💼", "🎯", "🔥", "⭐", "🌟", "🎨", "🔧"];

export default function PmTeamSettings() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = parseInt(params.workspaceId || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const { data: workspaces = [] } = useQuery<any[]>({
    queryKey: ["pm-workspaces"],
    queryFn: () => apiRequest("GET", "/api/pm-workspaces").then(r => r.json()),
  });

  const workspace = workspaces.find((w: any) => w.id === workspaceId);

  const [wsName, setWsName] = useState("");
  const [wsNameInit, setWsNameInit] = useState(false);
  if (workspace && !wsNameInit) { setWsName(workspace.name); setWsNameInit(true); }

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["pm-workspace-members", workspaceId],
    queryFn: () => apiRequest("GET", `/api/pm-workspaces/${workspaceId}/members`).then(r => r.json()),
    enabled: !!workspaceId,
  });

  const inviteMember = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/pm-workspaces/${workspaceId}/members`, body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-workspace-members", workspaceId] });
      setInviteOpen(false);
      setInviteEmail("");
      toast({ title: "Invite sent" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: any) => apiRequest("PATCH", `/api/pm-workspace-members/${id}`, { role }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-workspace-members", workspaceId] }),
  });

  const removeMember = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pm-workspace-members/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-workspace-members", workspaceId] }),
  });

  const updateWorkspace = useMutation({
    mutationFn: (body: any) => apiRequest("PATCH", `/api/pm-workspaces/${workspaceId}`, body).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-workspaces"] }),
  });

  const deleteWorkspace = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/pm-workspaces/${workspaceId}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-workspaces"] });
      navigate("/dashboard/pm-workspace");
    },
  });

  const acceptedMembers = (members as any[]).filter(m => m.inviteStatus === "accepted");
  const pendingMembers = (members as any[]).filter(m => m.inviteStatus === "pending");

  return (
    <div className="min-h-screen bg-background" data-testid="pm-team-settings-page">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50 px-4 sm:px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard/pm-workspace")} data-testid="button-back-workspace">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold">{workspace?.name || "Team Settings"}</span>
        <Shield className="w-4 h-4 text-muted-foreground ml-1" />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Tabs defaultValue="members">
          <TabsList className="mb-6">
            <TabsTrigger value="members" data-testid="tab-members">
              <Users className="w-4 h-4 mr-2" /> Members
            </TabsTrigger>
            <TabsTrigger value="general" data-testid="tab-general">
              <Settings className="w-4 h-4 mr-2" /> General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Members ({acceptedMembers.length})</h2>
              <Button size="sm" onClick={() => setInviteOpen(true)} data-testid="button-invite-member">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Invite Member
              </Button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden mb-6">
              {acceptedMembers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No members yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Member</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Role</th>
                      <th className="w-10 px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {acceptedMembers.map((m: any) => (
                      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/20" data-testid={`member-row-${m.id}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                              {(m.inviteEmail || m.userId || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{m.userId}</p>
                              {m.inviteEmail && <p className="text-xs text-muted-foreground">{m.inviteEmail}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[m.role] || ROLE_COLORS.member)}>
                            {m.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {m.role !== "owner" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`member-menu-${m.id}`}>
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                {ROLES.filter(r => r !== m.role).map(r => (
                                  <DropdownMenuItem key={r} onClick={() => updateRole.mutate({ id: m.id, role: r })}>
                                    Make {r}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem className="text-destructive" onClick={() => removeMember.mutate(m.id)}>
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {pendingMembers.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pending Invites ({pendingMembers.length})</h2>
                <div className="border border-border rounded-xl overflow-hidden">
                  {pendingMembers.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0" data-testid={`pending-invite-${m.id}`}>
                      <div className="flex-1">
                        <p className="text-sm">{m.inviteEmail}</p>
                        <p className="text-xs text-muted-foreground">Invited as {m.role}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">Pending</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember.mutate(m.id)}
                        data-testid={`cancel-invite-${m.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="general">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium block mb-2">Workspace Name</label>
                <Input
                  value={wsName}
                  onChange={e => setWsName(e.target.value)}
                  onBlur={() => { if (wsName.trim() && wsName !== workspace?.name) updateWorkspace.mutate({ name: wsName.trim() }); }}
                  className="max-w-sm"
                  data-testid="input-workspace-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Workspace Icon</label>
                <div className="flex flex-wrap gap-2">
                  {WORKSPACE_ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => updateWorkspace.mutate({ icon })}
                      className={cn("w-10 h-10 text-xl rounded-lg border-2 hover:border-primary transition-colors flex items-center justify-center", workspace?.icon === icon ? "border-primary bg-primary/10" : "border-border")}
                      data-testid={`icon-btn-${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-destructive/30 rounded-xl p-4 bg-destructive/5">
                <h3 className="text-sm font-semibold text-destructive mb-1">Danger Zone</h3>
                <p className="text-xs text-muted-foreground mb-3">Once you delete a workspace, there is no going back.</p>
                <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} data-testid="button-delete-workspace">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Workspace
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent data-testid="invite-dialog">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium block mb-1">Email address</label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Role</label>
              <select
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                data-testid="select-invite-role"
              >
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMember.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail.trim() || inviteMember.isPending}
              data-testid="button-send-invite"
            >
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent data-testid="delete-confirm-dialog">
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{workspace?.name}</strong> and all its data. Type the workspace name to confirm.
          </p>
          <Input
            placeholder={workspace?.name}
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
            data-testid="input-delete-confirm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteInput !== workspace?.name || deleteWorkspace.isPending}
              onClick={() => deleteWorkspace.mutate()}
              data-testid="button-confirm-delete"
            >
              Delete Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
