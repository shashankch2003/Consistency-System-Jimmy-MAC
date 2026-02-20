import { useGoals } from "@/hooks/use-goals";
import { CreateGoalDialog } from "@/components/CreateGoalDialog";
import { GoalCard } from "@/components/GoalCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export default function GoalsPage() {
  const { data: goals, isLoading, error } = useGoals();

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-destructive">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold">Failed to load goals</h2>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Goals</h1>
          <p className="text-muted-foreground">Track your yearly and monthly objectives.</p>
        </div>
        <CreateGoalDialog />
      </div>

      {goals?.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <h3 className="text-lg font-medium text-muted-foreground">No goals yet</h3>
          <p className="text-sm text-muted-foreground/60 mb-4">Create your first goal to get started</p>
          <CreateGoalDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals?.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
