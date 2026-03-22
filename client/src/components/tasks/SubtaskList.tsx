import { useState, KeyboardEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Subtask {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}

export function SubtaskList({ taskId }: { taskId: number }) {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");

  const { data: subtasks = [] } = useQuery<Subtask[]>({
    queryKey: ["/api/subtasks", taskId],
    queryFn: () => fetch(`/api/subtasks?taskId=${taskId}`).then((r) => r.json()),
    enabled: !!taskId,
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/subtasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks", taskId] });
      setNewTitle("");
    },
    onError: () => toast({ title: "Failed to add subtask", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      apiRequest("PATCH", `/api/subtasks/${id}`, { isCompleted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/subtasks", taskId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/subtasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/subtasks", taskId] }),
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTitle.trim()) {
      createMutation.mutate({ taskId, title: newTitle.trim(), sortOrder: subtasks.length });
    }
  };

  const completed = subtasks.filter((s) => s.isCompleted).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Subtasks</span>
        {subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground">{completed} of {subtasks.length} complete</span>
        )}
      </div>

      <div className="space-y-1">
        {subtasks.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 group py-1 px-2 rounded hover:bg-muted/40" data-testid={`subtask-${sub.id}`}>
            <Checkbox
              checked={sub.isCompleted}
              onCheckedChange={(checked) => toggleMutation.mutate({ id: sub.id, isCompleted: !!checked })}
              data-testid={`checkbox-subtask-${sub.id}`}
            />
            <span className={`flex-1 text-sm ${sub.isCompleted ? "line-through text-muted-foreground" : ""}`}>
              {sub.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMutation.mutate(sub.id)}
              data-testid={`button-delete-subtask-${sub.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Add subtask…"
          data-testid="input-add-subtask"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}
