import { useState } from "react";
import { useCreateGoal } from "@/hooks/use-goals";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

export function CreateGoalDialog() {
  const [open, setOpen] = useState(false);
  const createGoal = useCreateGoal();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createGoal.mutate({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      targetDate: formData.get("targetDate") as string,
      progressPercentage: 0,
    }, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all">
          <Plus className="w-4 h-4" /> Add Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Create New Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input id="title" name="title" placeholder="e.g. Master TypeScript" required className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Why is this important?" className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input id="targetDate" name="targetDate" type="date" required className="bg-background/50" />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createGoal.isPending}>
              {createGoal.isPending ? "Creating..." : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
