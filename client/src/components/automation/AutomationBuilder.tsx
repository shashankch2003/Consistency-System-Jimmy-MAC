import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Plus, Play, Trash2, CheckCircle2 } from "lucide-react";

const TRIGGERS = [
  { value: "task_status_changed", label: "Task status changes" },
  { value: "task_assigned", label: "Task is assigned" },
  { value: "task_overdue", label: "Task becomes overdue" },
  { value: "subtasks_completed", label: "All subtasks completed" },
  { value: "new_member_added", label: "New member added" },
  { value: "project_progress", label: "Project progress reaches %" },
];

const CONDITIONS = [
  { value: "", label: "No condition (always run)" },
  { value: "status_equals", label: "Status equals..." },
  { value: "assignee_equals", label: "Assignee equals..." },
  { value: "priority_equals", label: "Priority equals..." },
  { value: "due_within", label: "Due within X days" },
];

const ACTIONS = [
  { value: "change_status", label: "Change status" },
  { value: "assign_to", label: "Assign to member" },
  { value: "send_notification", label: "Send notification" },
  { value: "create_task", label: "Create a task" },
  { value: "move_to_project", label: "Move to project" },
  { value: "add_tag", label: "Add tag" },
];

interface ActionRow {
  type: string;
  value: string;
}

interface AutomationBuilderProps {
  onClose?: () => void;
  initialData?: any;
}

export function AutomationBuilder({ onClose, initialData }: AutomationBuilderProps) {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();

  const [name, setName] = useState(initialData?.name ?? "");
  const [trigger, setTrigger] = useState(initialData?.triggerType ?? "");
  const [condition, setCondition] = useState(initialData?.conditions?.[0]?.type ?? "");
  const [conditionValue, setConditionValue] = useState(initialData?.conditions?.[0]?.value ?? "");
  const [actions, setActions] = useState<ActionRow[]>(
    initialData?.actions?.map((a: any) => ({ type: a.type, value: a.value ?? "" })) ?? [{ type: "", value: "" }]
  );
  const [testResult, setTestResult] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (initialData?.id) return apiRequest("PATCH", `/api/automations/${initialData.id}`, data);
      return apiRequest("POST", "/api/automations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({ title: "Automation saved" });
      onClose?.();
    },
    onError: () => toast({ title: "Failed to save automation", variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/automations/${initialData?.id}/test`),
    onSuccess: () => {
      setTestResult("Test run completed successfully!");
      toast({ title: "Test completed" });
    },
    onError: () => setTestResult("Test failed — check your trigger configuration."),
  });

  const handleSave = () => {
    if (!name.trim()) { toast({ title: "Automation name required", variant: "destructive" }); return; }
    if (!trigger) { toast({ title: "Select a trigger", variant: "destructive" }); return; }
    if (actions.length === 0 || !actions[0].type) { toast({ title: "Add at least one action", variant: "destructive" }); return; }

    saveMutation.mutate({
      workspaceId,
      name: name.trim(),
      triggerType: trigger,
      triggerConfig: { trigger },
      conditions: condition ? [{ type: condition, value: conditionValue }] : [],
      actions: actions.filter((a) => a.type).map((a) => ({ type: a.type, value: a.value })),
    });
  };

  const addAction = () => {
    if (actions.length < 5) setActions((prev) => [...prev, { type: "", value: "" }]);
  };

  const removeAction = (i: number) => setActions((prev) => prev.filter((_, j) => j !== i));

  const updateAction = (i: number, field: "type" | "value", val: string) => {
    setActions((prev) => prev.map((a, j) => j === i ? { ...a, [field]: val } : a));
  };

  const FlowBlock = ({ label, color, children }: { label: string; color: string; children: React.ReactNode }) => (
    <div className={`border-2 ${color} rounded-xl p-4 bg-card`}>
      <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${color.replace("border-", "text-")}`}>{label}</p>
      {children}
    </div>
  );

  return (
    <div className="space-y-4" data-testid="automation-builder">
      {/* Name */}
      <div>
        <Label className="text-sm font-semibold">Automation Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Notify on task assignment"
          className="mt-1"
          data-testid="input-automation-name"
        />
      </div>

      {/* Visual WHEN → IF → THEN flow */}
      <div className="flex items-stretch gap-3">
        {/* WHEN */}
        <FlowBlock label="WHEN" color="border-blue-500">
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger className="w-56" data-testid="select-trigger"><SelectValue placeholder="Select trigger..." /></SelectTrigger>
            <SelectContent>
              {TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FlowBlock>

        <div className="flex items-center"><ArrowRight className="h-5 w-5 text-muted-foreground" /></div>

        {/* IF */}
        <FlowBlock label="IF (optional)" color="border-yellow-500">
          <div className="space-y-2">
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-56" data-testid="select-condition"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {condition && (
              <Input
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="Value..."
                className="w-56"
                data-testid="input-condition-value"
              />
            )}
          </div>
        </FlowBlock>

        <div className="flex items-center"><ArrowRight className="h-5 w-5 text-muted-foreground" /></div>

        {/* THEN */}
        <FlowBlock label="THEN" color="border-green-500">
          <div className="space-y-2">
            {actions.map((action, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={action.type} onValueChange={(v) => updateAction(i, "type", v)}>
                  <SelectTrigger className="w-44" data-testid={`select-action-${i}`}><SelectValue placeholder="Select action..." /></SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  value={action.value}
                  onChange={(e) => updateAction(i, "value", e.target.value)}
                  placeholder="Value..."
                  className="w-32"
                  data-testid={`input-action-value-${i}`}
                />
                {actions.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAction(i)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            {actions.length < 5 && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={addAction} data-testid="button-add-action">
                <Plus className="h-3 w-3" />Add another action
              </Button>
            )}
          </div>
        </FlowBlock>
      </div>

      {/* Test result */}
      {testResult && (
        <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg border border-border text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          {testResult}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-automation">
          {saveMutation.isPending ? "Saving..." : "Save Automation"}
        </Button>
        {initialData?.id && (
          <Button
            variant="outline"
            className="gap-1"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            data-testid="button-test-automation"
          >
            <Play className="h-3.5 w-3.5" />Test
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" onClick={onClose} data-testid="button-cancel-automation">Cancel</Button>
        )}
      </div>
    </div>
  );
}
