import { useState } from "react";
import { format } from "date-fns";
import { useTaskBankItems, useCreateTaskBankItem, useDeleteTaskBankItem, useAssignTaskBankItem } from "@/hooks/use-task-bank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, CalendarPlus, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function TaskBankPage() {
  const [newTitle, setNewTitle] = useState("");
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignDate, setAssignDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: items, isLoading } = useTaskBankItems();
  const createItem = useCreateTaskBankItem();
  const deleteItem = useDeleteTaskBankItem();
  const assignItem = useAssignTaskBankItem();
  const { toast } = useToast();

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createItem.mutate({ title: newTitle.trim() }, {
      onSuccess: () => setNewTitle(""),
    });
  };

  const handleAssign = (id: number) => {
    assignItem.mutate({ id, date: assignDate }, {
      onSuccess: () => {
        setAssigningId(null);
        toast({ title: "Task assigned", description: `Moved to ${format(new Date(assignDate + "T00:00:00"), "MMMM d, yyyy")}` });
      },
    });
  };

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-task-bank-title">Task Bank</h1>
        <p className="text-muted-foreground mt-1 text-sm">Capture task ideas instantly. Assign them to a specific day when you're ready.</p>
      </div>

      <div className="bg-card/50 border border-border rounded-xl p-4 flex items-center gap-3" data-testid="task-bank-input-area">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-white/70" />
        </div>
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Quick capture — type any task idea..."
          className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground/50"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          data-testid="input-task-bank-title"
        />
        <Button
          onClick={handleAdd}
          disabled={!newTitle.trim() || createItem.isPending}
          size="sm"
          className="shrink-0"
          data-testid="button-add-task-bank"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !items || items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/60" data-testid="text-task-bank-empty">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No ideas yet</p>
          <p className="text-sm mt-1">Whenever a task idea pops up, capture it here instantly.</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="task-bank-list">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-card/40 border border-border/60 rounded-lg p-3 flex items-start gap-3 group hover:border-border transition-colors"
              data-testid={`row-task-bank-${item.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" data-testid={`text-task-bank-title-${item.id}`}>{item.title}</p>
                {item.createdAt && (
                  <p className="text-xs text-muted-foreground/50 mt-0.5">
                    Added {format(new Date(item.createdAt), "MMM d, yyyy")}
                  </p>
                )}

                {assigningId === item.id && (
                  <div className="flex items-center gap-2 mt-2" data-testid={`assign-panel-${item.id}`}>
                    <input
                      type="date"
                      value={assignDate}
                      onChange={(e) => setAssignDate(e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1 text-xs"
                      data-testid={`input-assign-date-${item.id}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => handleAssign(item.id)}
                      disabled={assignItem.isPending}
                      data-testid={`button-confirm-assign-${item.id}`}
                    >
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => setAssigningId(null)}
                      data-testid={`button-cancel-assign-${item.id}`}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className={cn("flex items-center gap-1", assigningId === item.id ? "hidden" : "")}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-50 hover:opacity-100"
                  onClick={() => { setAssigningId(item.id); setAssignDate(format(new Date(), "yyyy-MM-dd")); }}
                  data-testid={`button-assign-${item.id}`}
                  title="Assign to a day"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-50 hover:opacity-100 hover:text-red-400"
                  onClick={() => deleteItem.mutate(item.id)}
                  data-testid={`button-delete-task-bank-${item.id}`}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items && items.length > 0 && (
        <p className="text-xs text-muted-foreground/40 text-center">
          {items.length} idea{items.length !== 1 ? "s" : ""} in your task bank
        </p>
      )}
    </div>
  );
}
