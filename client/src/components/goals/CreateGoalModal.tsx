import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const GOAL_TYPES = [
  { value: "company_objective", label: "Company Objective" },
  { value: "department_key_result", label: "Department Key Result" },
  { value: "team_goal", label: "Team Goal" },
  { value: "individual", label: "Individual Goal" },
];

interface CreateGoalModalProps {
  open: boolean;
  onClose: () => void;
  period: string;
  workspaceId: number;
}

interface FormValues {
  title: string;
  description: string;
  goalType: string;
  parentGoalId: string;
  ownerId: string;
  dueDate: string;
  targetValue: string;
  currentValue: string;
  measurementUnit: string;
}

export function CreateGoalModal({ open, onClose, period, workspaceId }: CreateGoalModalProps) {
  const { toast } = useToast();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: "", description: "", goalType: "individual",
      parentGoalId: "", ownerId: "", dueDate: "",
      targetValue: "100", currentValue: "0", measurementUnit: "%",
    },
  });

  const { data: allGoals = [] } = useQuery<any[]>({
    queryKey: ["/api/okr-goals", workspaceId],
    queryFn: () => fetch(`/api/okr-goals?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/workspace-members", workspaceId],
    queryFn: () => fetch(`/api/workspace-members?workspaceId=${workspaceId}`).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/okr-goals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/okr-goals"] });
      toast({ title: "Goal created" });
      reset();
      onClose();
    },
    onError: () => toast({ title: "Failed to create goal", variant: "destructive" }),
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      ...values,
      workspaceId,
      period,
      parentGoalId: values.parentGoalId ? parseInt(values.parentGoalId) : null,
      ownerId: values.ownerId || null,
      targetValue: values.targetValue || null,
      currentValue: values.currentValue || "0",
      dueDate: values.dueDate || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" data-testid="create-goal-modal">
        <DialogHeader>
          <DialogTitle>Create Goal / OKR</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label className="text-sm">Goal Title *</Label>
            <Input {...register("title", { required: true })} placeholder="e.g. Increase customer satisfaction" className="mt-1" data-testid="input-goal-title" />
            {errors.title && <p className="text-xs text-red-400 mt-0.5">Required</p>}
          </div>

          <div>
            <Label className="text-sm">Description</Label>
            <Textarea {...register("description")} placeholder="What does success look like?" className="mt-1 h-20" data-testid="input-goal-description" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Type</Label>
              <Select defaultValue="individual" onValueChange={(v) => setValue("goalType", v)}>
                <SelectTrigger className="mt-1" data-testid="select-goal-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Parent Goal</Label>
              <Select onValueChange={(v) => setValue("parentGoalId", v)}>
                <SelectTrigger className="mt-1" data-testid="select-parent-goal"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {allGoals.map((g: any) => <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Owner</Label>
              <Select onValueChange={(v) => setValue("ownerId", v)}>
                <SelectTrigger className="mt-1" data-testid="select-goal-owner"><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  {members.map((m: any) => <SelectItem key={m.userId || m.email} value={m.userId || m.email}>{m.displayName || m.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Due Date</Label>
              <Input type="date" {...register("dueDate")} className="mt-1" data-testid="input-goal-due-date" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-sm">Target Value</Label>
              <Input type="number" {...register("targetValue")} className="mt-1" data-testid="input-goal-target" />
            </div>
            <div>
              <Label className="text-sm">Current Value</Label>
              <Input type="number" {...register("currentValue")} className="mt-1" data-testid="input-goal-current" />
            </div>
            <div>
              <Label className="text-sm">Unit</Label>
              <Input {...register("measurementUnit")} placeholder="%, tasks, $..." className="mt-1" data-testid="input-goal-unit" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-goal">
              {createMutation.isPending ? "Creating..." : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
