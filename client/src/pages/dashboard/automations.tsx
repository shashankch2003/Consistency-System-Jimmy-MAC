import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AutomationBuilder } from "@/components/automation/AutomationBuilder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Trash2, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const TRIGGER_LABELS: Record<string, string> = {
  task_status_changed: "Task status changes",
  task_assigned: "Task is assigned",
  task_overdue: "Task becomes overdue",
  subtasks_completed: "All subtasks completed",
  new_member_added: "New member added",
  project_progress: "Project progress reaches %",
};

const ACTION_LABELS: Record<string, string> = {
  change_status: "Change status",
  assign_to: "Assign to member",
  send_notification: "Send notification",
  create_task: "Create a task",
  move_to_project: "Move to project",
  add_tag: "Add tag",
};

export default function AutomationsPage() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: automationsList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/automations", workspaceId],
    queryFn: () => fetch(`/api/automations?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/automations/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/automations"] }),
    onError: () => toast({ title: "Failed to update automation", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/automations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/automations"] }),
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const editingAuto = editingId ? automationsList.find((a) => a.id === editingId) : null;

  if (showBuilder || editingId) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => { setShowBuilder(false); setEditingId(null); }}
            data-testid="button-back-automations"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">{editingId ? "Edit Automation" : "Create Automation"}</h1>
        </div>
        <AutomationBuilder
          initialData={editingAuto ? { ...editingAuto } : undefined}
          onClose={() => { setShowBuilder(false); setEditingId(null); }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" data-testid="automations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />Automations
          </h1>
          <p className="text-muted-foreground mt-0.5">Automate repetitive tasks and workflows</p>
        </div>
        <Button className="gap-1" onClick={() => setShowBuilder(true)} data-testid="button-create-automation">
          <Plus className="h-4 w-4" />Create Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Automations", value: automationsList.length },
          { label: "Active", value: automationsList.filter((a) => a.isActive).length, color: "text-green-400" },
          { label: "Total Runs", value: automationsList.reduce((s, a) => s + (a.triggerCount || 0), 0) },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color ?? ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Automation cards */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : automationsList.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
          <Zap className="h-12 w-12 opacity-20 mx-auto mb-3" />
          <p className="text-sm">No automations yet — create one to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automationsList.map((auto) => {
            const actions = (auto.actions as any[]) || [];
            return (
              <Card key={auto.id} className="hover:border-border/80 transition-colors" data-testid={`automation-card-${auto.id}`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${auto.isActive ? "bg-green-500/10" : "bg-muted/30"}`}>
                    <Zap className={`h-5 w-5 ${auto.isActive ? "text-green-400" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{auto.name}</p>
                      <Badge className={`text-[10px] ${auto.isActive ? "bg-green-500/20 text-green-400" : "bg-muted/40 text-muted-foreground"}`}>
                        {auto.isActive ? "ON" : "OFF"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="text-blue-400">When</span>{" "}
                      {TRIGGER_LABELS[auto.triggerType] || auto.triggerType}
                      {actions.length > 0 && (
                        <>
                          {" "}<span className="text-green-400">→ then</span>{" "}
                          {actions.slice(0, 2).map((a: any) => ACTION_LABELS[a.type] || a.type).join(", ")}
                          {actions.length > 2 && ` +${actions.length - 2} more`}
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {auto.triggerCount || 0} runs
                      {auto.lastTriggeredAt && ` · Last: ${new Date(auto.lastTriggeredAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!auto.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: auto.id, isActive: checked })}
                      data-testid={`toggle-automation-${auto.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingId(auto.id)}
                      data-testid={`button-edit-automation-${auto.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-400"
                      onClick={() => deleteMutation.mutate(auto.id)}
                      data-testid={`button-delete-automation-${auto.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
