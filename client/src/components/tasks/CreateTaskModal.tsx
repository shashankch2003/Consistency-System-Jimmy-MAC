import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList } from "lucide-react";

interface WorkspaceMember {
  id: number;
  userId?: string;
  email: string;
  displayName?: string;
}

interface CreateTaskModalProps {
  projectId: number;
  members: WorkspaceMember[];
  onClose: () => void;
}

const PRIORITIES = ["Urgent", "High", "Medium", "Low"];

export function CreateTaskModal({ projectId, members, onClose }: CreateTaskModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [estimatedMins, setEstimatedMins] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/team-tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", projectId] });
      toast({ title: "Task created" });
      onClose();
    },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast({ title: "Task name is required", variant: "destructive" });
    const estimatedMinutes = (parseInt(estimatedHours || "0") * 60) + parseInt(estimatedMins || "0") || null;
    mutation.mutate({
      projectId, title: title.trim(), description: description || null,
      assigneeId: assigneeId || null, priority, dueDate: dueDate || null,
      estimatedMinutes, tags,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className="w-full max-w-[520px] mx-4 max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Create Task
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Task Name *</Label>
              <Input id="task-name" data-testid="input-task-name" placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <Input id="task-desc" data-testid="input-task-description" placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger data-testid="select-task-assignee">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.userId || m.email}>
                        {m.displayName || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Due Date</Label>
              <Input id="task-due" data-testid="input-task-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estimated Time</Label>
              <div className="flex gap-2">
                <Input data-testid="input-task-est-hours" placeholder="Hours" type="number" min="0" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} className="w-24" />
                <Input data-testid="input-task-est-mins" placeholder="Mins" type="number" min="0" max="59" value={estimatedMins} onChange={(e) => setEstimatedMins(e.target.value)} className="w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input data-testid="input-task-tag" placeholder="Type tag + Enter" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs cursor-pointer" onClick={() => removeTag(t)}>
                      {t} ×
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-task">
                {mutation.isPending ? "Creating…" : "Create Task"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
