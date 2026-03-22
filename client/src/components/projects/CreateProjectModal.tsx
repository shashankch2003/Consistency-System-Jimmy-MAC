import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FolderKanban } from "lucide-react";

const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const TEMPLATES = ["Start from scratch", "Software Sprint", "Marketing Campaign", "Product Launch", "Client Project"];

interface Team {
  id: number;
  name: string;
}

interface CreateProjectModalProps {
  workspaceId: number;
  onClose: () => void;
}

export function CreateProjectModal({ workspaceId, onClose }: CreateProjectModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [template, setTemplate] = useState("Start from scratch");

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams", workspaceId],
    queryFn: () => fetch(`/api/teams?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created" });
      onClose();
    },
    onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast({ title: "Project name is required", variant: "destructive" });
    mutation.mutate({
      workspaceId, name: name.trim(), description: description || null,
      teamId: teamId ? parseInt(teamId) : null, startDate: startDate || null,
      dueDate: dueDate || null, priority, template,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className="w-full max-w-[560px] mx-4 max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            Create New Project
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Project Name *</Label>
              <Input id="proj-name" data-testid="input-project-name" placeholder="e.g. Website Redesign Q2" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-desc">Description</Label>
              <Input id="proj-desc" data-testid="input-project-description" placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger data-testid="select-project-team">
                  <SelectValue placeholder="No team assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No team assigned</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proj-start">Start Date</Label>
                <Input id="proj-start" data-testid="input-project-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-due">Due Date</Label>
                <Input id="proj-due" data-testid="input-project-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-project-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger data-testid="select-project-template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-project">
                {mutation.isPending ? "Creating…" : "Create Project"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
