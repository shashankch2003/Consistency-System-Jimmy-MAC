import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["Planning", "Active", "On Hold", "Completed"];
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];

interface Project {
  id: number;
  name: string;
  description?: string;
  teamId?: number;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  ownerId?: string;
  visibility?: string;
  workspaceId?: number;
}

interface Team {
  id: number;
  name: string;
}

interface ProjectSettingsProps {
  project: Project;
  onClose: () => void;
}

export function ProjectSettings({ project, onClose }: ProjectSettingsProps) {
  const { toast } = useToast();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [teamId, setTeamId] = useState(String(project.teamId || ""));
  const [status, setStatus] = useState(project.status);
  const [priority, setPriority] = useState(project.priority);
  const [startDate, setStartDate] = useState(project.startDate || "");
  const [dueDate, setDueDate] = useState(project.dueDate || "");
  const [visibility, setVisibility] = useState(project.visibility === "public");

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams", project.workspaceId],
    queryFn: () => fetch(`/api/teams?workspaceId=${project.workspaceId}`).then((r) => r.json()),
    enabled: !!project.workspaceId,
  });

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("PATCH", `/api/projects/${project.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project settings saved" });
      onClose();
    },
    onError: () => toast({ title: "Failed to save changes", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!name.trim()) return toast({ title: "Project name is required", variant: "destructive" });
    mutation.mutate({
      name: name.trim(), description: description || null,
      teamId: teamId ? parseInt(teamId) : null, status, priority,
      startDate: startDate || null, dueDate: dueDate || null,
      visibility: visibility ? "public" : "private",
    });
  };

  return (
    <div
      className="fixed right-0 top-0 h-full w-[400px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
      style={{ animation: "slideInRight 200ms ease" }}
      data-testid="project-settings-panel"
    >
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Project Settings
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-settings">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* General */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">General</p>
          <div className="space-y-2">
            <Label htmlFor="ps-name">Project Name</Label>
            <Input id="ps-name" data-testid="input-settings-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ps-desc">Description</Label>
            <Input id="ps-desc" data-testid="input-settings-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ps-start">Start Date</Label>
              <Input id="ps-start" data-testid="input-settings-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-due">Due Date</Label>
              <Input id="ps-due" data-testid="input-settings-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team</p>
          <div className="space-y-2">
            <Label>Assigned Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger data-testid="select-settings-team">
                <SelectValue placeholder="No team assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No team assigned</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="select-settings-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-settings-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Visibility */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visibility</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Public project</p>
              <p className="text-xs text-muted-foreground">Visible to all workspace members</p>
            </div>
            <Switch checked={visibility} onCheckedChange={setVisibility} data-testid="switch-visibility" />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button className="w-full" onClick={handleSave} disabled={mutation.isPending} data-testid="button-save-settings">
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
