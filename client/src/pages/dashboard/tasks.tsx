import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLUMNS = [
  { label: "Not Done", value: 0, color: "bg-red-500/10 border-red-500/20 text-red-500" },
  { label: "25%", value: 25, color: "bg-orange-500/10 border-orange-500/20 text-orange-500" },
  { label: "50%", value: 50, color: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" },
  { label: "75%", value: 75, color: "bg-blue-500/10 border-blue-500/20 text-blue-500" },
  { label: "Done", value: 100, color: "bg-green-500/10 border-green-500/20 text-green-500" },
];

export default function TasksPage() {
  const [date, setDate] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  
  const { data: tasks, isLoading } = useTasks(dateStr);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    createTask.mutate({
      title: formData.get("title") as string,
      date: dateStr,
      completionPercentage: 0
    }, {
      onSuccess: () => form.reset()
    });
  };

  const averageCompletion = tasks?.length 
    ? Math.round(tasks.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / tasks.length)
    : 0;

  return (
    <div className="p-8 h-[calc(100vh-4rem)] flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Daily Tasks</h1>
          <p className="text-muted-foreground">Kanban board for {format(date, "MMMM do, yyyy")}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card p-2 rounded-lg border border-border">
          <Button variant="ghost" size="icon" onClick={() => setDate(subDays(date, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-mono font-medium min-w-[100px] text-center">
            {format(date, "MMM dd")}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm text-muted-foreground">Daily Avg: </span>
          <span className="text-lg font-bold text-primary">{averageCompletion}%</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="grid grid-cols-5 gap-4 min-w-[1000px] h-full">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.value} className="flex flex-col h-full bg-card/30 rounded-xl border border-border/50">
              <div className={cn("p-4 border-b border-border/50 font-bold flex justify-between", col.color)}>
                {col.label}
                <span className="text-xs opacity-70 bg-background/50 px-2 py-0.5 rounded-full">
                  {tasks?.filter(t => (t.completionPercentage || 0) === col.value).length || 0}
                </span>
              </div>
              
              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                {col.value === 0 && (
                  <form onSubmit={handleCreate} className="mb-4">
                    <div className="flex gap-2">
                      <Input name="title" placeholder="Add task..." className="h-9 text-sm" autoComplete="off" />
                      <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                )}

                {tasks?.filter(t => (t.completionPercentage || 0) === col.value).map(task => (
                  <Card key={task.id} className="p-3 bg-card border-border hover:border-primary/50 group transition-all shadow-sm hover:shadow-md">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      <button 
                        onClick={() => deleteTask.mutate(task.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between mt-3 pt-2 border-t border-border/50">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-[10px] hover:bg-red-500/10 hover:text-red-500"
                        disabled={task.completionPercentage === 0}
                        onClick={() => updateTask.mutate({ id: task.id, completionPercentage: Math.max(0, (task.completionPercentage || 0) - 25) })}
                      >
                        <ChevronLeft className="w-3 h-3 mr-1" /> Prev
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-[10px] hover:bg-green-500/10 hover:text-green-500"
                        disabled={task.completionPercentage === 100}
                        onClick={() => updateTask.mutate({ id: task.id, completionPercentage: Math.min(100, (task.completionPercentage || 0) + 25) })}
                      >
                        Next <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
