import { useState } from "react";
import { Goal } from "@shared/schema";
import { useUpdateGoal, useDeleteGoal } from "@/hooks/use-goals";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function GoalCard({ goal }: { goal: Goal }) {
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [isEditing, setIsEditing] = useState(false);
  const [progress, setProgress] = useState(goal.progressPercentage || 0);

  const handleProgressUpdate = (newProgress: number) => {
    setProgress(newProgress);
    updateGoal.mutate({ id: goal.id, progressPercentage: newProgress });
  };

  if (isEditing) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6 space-y-4">
          <Input 
            defaultValue={goal.title} 
            onChange={(e) => updateGoal.mutate({ id: goal.id, title: e.target.value })}
            className="font-bold text-lg"
          />
          <Input 
            defaultValue={goal.description || ""} 
            onChange={(e) => updateGoal.mutate({ id: goal.id, description: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setIsEditing(false)}>Done</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card group hover:scale-[1.02] transition-all duration-300">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">{goal.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{goal.description}</p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 text-primary" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deleteGoal.mutate(goal.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-secondary" />
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => handleProgressUpdate(parseInt(e.target.value))}
            className="w-full mt-2 accent-primary h-1 bg-transparent appearance-none cursor-pointer"
          />
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground border-t border-white/5 pt-4">
        Target: {new Date(goal.targetDate || "").toLocaleDateString()}
      </CardFooter>
    </Card>
  );
}
