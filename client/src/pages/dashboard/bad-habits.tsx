import { useState } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { useBadHabits, useCreateBadHabit, useDeleteBadHabit, useBadHabitEntries, useToggleBadHabitEntry } from "@/hooks/use-bad-habits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BadHabitsPage() {
  const [currentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const { data: habits } = useBadHabits();
  const { data: entries } = useBadHabitEntries(format(currentDate, "yyyy-MM"));
  
  const createHabit = useCreateBadHabit();
  const deleteHabit = useDeleteBadHabit();
  const toggleEntry = useToggleBadHabitEntry();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createHabit.mutate({ name: formData.get("name") as string }, {
      onSuccess: () => e.currentTarget.reset()
    });
  };

  const hasOccurred = (habitId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return entries?.some(e => e.habitId === habitId && e.date === dateStr && e.occurred);
  };

  const handleToggle = (habitId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const occurred = !hasOccurred(habitId, date);
    toggleEntry.mutate({ habitId, date: dateStr, occurred });
  };

  return (
    <div className="p-8 max-w-[100vw] overflow-x-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-destructive/90">Bad Habits</h1>
        <p className="text-muted-foreground">Track slips and maintain streaks.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {/* Habits Column */}
          <div className="w-64 shrink-0 space-y-2 pt-12">
            {habits?.map(habit => (
              <div key={habit.id} className="h-10 flex items-center justify-between px-2 group">
                <span className="font-medium truncate">{habit.name}</span>
                <button 
                  onClick={() => deleteHabit.mutate(habit.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <form onSubmit={handleCreate} className="flex gap-2 pt-2">
              <Input name="name" placeholder="Habit to break..." className="h-9" />
              <Button type="submit" variant="destructive" size="icon" className="h-9 w-9 shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Grid */}
          <div className="flex gap-1 pt-2 pb-4">
            {days.map(day => (
              <div key={day.toISOString()} className="flex flex-col gap-2 w-8 shrink-0">
                <div className="h-10 flex flex-col items-center justify-end text-xs text-muted-foreground">
                  <span>{format(day, "EEEEE")}</span>
                  <span className={cn("font-bold", isSameDay(day, new Date()) && "text-primary")}>
                    {format(day, "d")}
                  </span>
                </div>
                {habits?.map(habit => {
                  const failed = hasOccurred(habit.id, day);
                  return (
                    <button
                      key={`${habit.id}-${day}`}
                      onClick={() => handleToggle(habit.id, day)}
                      className={cn(
                        "h-10 w-8 rounded-md border flex items-center justify-center transition-all",
                        failed
                          ? "bg-red-500 border-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]" 
                          : "bg-card/50 border-border hover:bg-accent/50"
                      )}
                    >
                      {failed && <X className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
