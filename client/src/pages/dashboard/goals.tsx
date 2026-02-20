import { useState } from "react";
import { 
  useYearlyGoals, useCreateYearlyGoal, useUpdateYearlyGoal, useDeleteYearlyGoal,
  useMonthlyOverviewGoals, useUpsertMonthlyOverviewGoal,
  useMonthlyDynamicGoals, useCreateMonthlyDynamicGoal, useUpdateMonthlyDynamicGoal, useDeleteMonthlyDynamicGoal
} from "@/hooks/use-goals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronLeft, ChevronRight, Target, Calendar, TrendingUp, FileText, BarChart3 } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed"];

function getStatusColor(status: string) {
  switch (status) {
    case "Completed": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "In Progress": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

function RatingSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-20" data-testid="select-rating">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {[1,2,3,4,5,6,7,8,9,10].map(r => (
          <SelectItem key={r} value={String(r)}>{r}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ProgressBar({ rating }: { rating: number }) {
  const pct = rating * 10;
  const color = pct <= 30 ? "bg-red-500" : pct <= 60 ? "bg-yellow-500" : pct <= 80 ? "bg-blue-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-muted-foreground w-10 text-right">{pct}%</span>
    </div>
  );
}

function getAvgColor(avg: number) {
  if (avg <= 30) return "text-red-400";
  if (avg <= 60) return "text-yellow-400";
  if (avg <= 80) return "text-blue-400";
  return "text-green-400";
}

function AvgBadge({ label, avg, total }: { label: string; avg: number; total: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-secondary/30 rounded-lg border border-border/50">
      <BarChart3 className="w-4 h-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}:</span>
        <span className={`text-lg font-bold ${getAvgColor(avg)}`}>{avg}%</span>
        <span className="text-xs text-muted-foreground">({total} goals)</span>
      </div>
    </div>
  );
}

function DescriptionModal({ open, onOpenChange, title, description, onSave }: { 
  open: boolean; 
  onOpenChange: (v: boolean) => void; 
  title: string; 
  description: string; 
  onSave: (desc: string) => void;
}) {
  const [text, setText] = useState(description);

  const prevOpen = useState(false);
  if (open && !prevOpen[0]) {
    setText(description);
  }
  prevOpen[0] = open;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-lg">Description for: {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your detailed description here..."
            className="min-h-[300px] resize-y text-sm leading-relaxed"
            data-testid="textarea-description-modal"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-description">
              Cancel
            </Button>
            <Button onClick={() => { onSave(text); onOpenChange(false); }} data-testid="button-save-description">
              Save Description
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function YearSelector({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="outline" onClick={() => setYear(year - 1)} data-testid="button-prev-year">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-lg font-semibold min-w-[60px] text-center">{year}</span>
      <Button size="icon" variant="outline" onClick={() => setYear(year + 1)} data-testid="button-next-year">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function YearlyGoalsTable({ year }: { year: number }) {
  const { data: goals, isLoading } = useYearlyGoals(year);
  const createGoal = useCreateYearlyGoal();
  const updateGoal = useUpdateYearlyGoal();
  const deleteGoal = useDeleteYearlyGoal();
  const [newGoalName, setNewGoalName] = useState("");
  const [descModal, setDescModal] = useState<{ open: boolean; goalId: number; title: string; description: string }>({ open: false, goalId: 0, title: "", description: "" });

  const handleAdd = () => {
    if (!newGoalName.trim()) return;
    createGoal.mutate({ year, goalName: newGoalName, rating: 1 });
    setNewGoalName("");
  };

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  const avgRating = goals?.length ? Math.round(goals.reduce((acc: number, g: any) => acc + (g.rating || 1), 0) / goals.length * 10) : 0;

  return (
    <Card className="border-border/50">
      <div className="p-5 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Yearly Goals</h3>
              <p className="text-sm text-muted-foreground">Set your long-term goals for {year}</p>
            </div>
          </div>
          {goals && goals.length > 0 && (
            <AvgBadge label={`${year} Avg`} avg={avgRating} total={goals.length} />
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-[200px]">Goal Name</TableHead>
              <TableHead className="w-[200px]">Description</TableHead>
              <TableHead className="w-[100px]">Rating</TableHead>
              <TableHead className="w-[80px]">%</TableHead>
              <TableHead className="min-w-[180px]">Progress</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals?.map((goal: any) => (
              <TableRow key={goal.id} className="border-border/30">
                <TableCell>
                  <Input 
                    defaultValue={goal.goalName} 
                    className="bg-transparent border-0 p-0 h-auto focus-visible:ring-1"
                    onBlur={(e) => {
                      if (e.target.value !== goal.goalName) {
                        updateGoal.mutate({ id: goal.id, goalName: e.target.value });
                      }
                    }}
                    data-testid={`input-yearly-goal-name-${goal.id}`}
                  />
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => setDescModal({ open: true, goalId: goal.id, title: goal.goalName, description: goal.description || "" })}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left group"
                    data-testid={`button-open-desc-yearly-${goal.id}`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
                    <span className="truncate max-w-[150px]">
                      {goal.description ? goal.description : "Add description..."}
                    </span>
                  </button>
                </TableCell>
                <TableCell>
                  <RatingSelect value={goal.rating || 1} onChange={(r) => updateGoal.mutate({ id: goal.id, rating: r })} />
                </TableCell>
                <TableCell className="font-medium">{(goal.rating || 1) * 10}%</TableCell>
                <TableCell><ProgressBar rating={goal.rating || 1} /></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => deleteGoal.mutate(goal.id)} data-testid={`button-delete-yearly-goal-${goal.id}`}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-border/30">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="New goal name..." 
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    className="bg-transparent border-0 p-0 h-auto focus-visible:ring-1"
                    data-testid="input-new-yearly-goal-name"
                  />
                  <Button size="sm" onClick={handleAdd} disabled={!newGoalName.trim() || createGoal.isPending} className="shrink-0" data-testid="button-add-yearly-goal">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </TableCell>
              <TableCell colSpan={5}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <DescriptionModal 
        open={descModal.open}
        onOpenChange={(v) => setDescModal(prev => ({ ...prev, open: v }))}
        title={descModal.title}
        description={descModal.description}
        onSave={(desc) => updateGoal.mutate({ id: descModal.goalId, description: desc })}
      />
    </Card>
  );
}

function MonthlyOverviewTable({ year }: { year: number }) {
  const { data: goals, isLoading } = useMonthlyOverviewGoals(year);
  const upsertGoal = useUpsertMonthlyOverviewGoal();

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  const getGoalForMonth = (month: number) => {
    return goals?.find((g: any) => g.month === month) || null;
  };

  const goalsWithData = goals?.filter((g: any) => g.mainGoal && g.mainGoal.trim()) || [];
  const avgRating = goalsWithData.length ? Math.round(goalsWithData.reduce((acc: number, g: any) => acc + (g.rating || 1), 0) / goalsWithData.length * 10) : 0;

  return (
    <Card className="border-border/50">
      <div className="p-5 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Month-Wise Overview Goals</h3>
              <p className="text-sm text-muted-foreground">Set goals for each month of {year}</p>
            </div>
          </div>
          {goalsWithData.length > 0 && (
            <AvgBadge label={`${year} Avg`} avg={avgRating} total={goalsWithData.length} />
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-[120px]">Month</TableHead>
              <TableHead className="min-w-[200px]">Main Monthly Goal</TableHead>
              <TableHead className="w-[100px]">Rating</TableHead>
              <TableHead className="w-[80px]">%</TableHead>
              <TableHead className="min-w-[180px]">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MONTHS.map((monthName, idx) => {
              const month = idx + 1;
              const goal = getGoalForMonth(month);
              return (
                <TableRow key={month} className="border-border/30">
                  <TableCell className="font-medium">{monthName}</TableCell>
                  <TableCell>
                    <Input 
                      defaultValue={goal?.mainGoal || ""} 
                      placeholder="Enter monthly goal..."
                      className="bg-transparent border-0 p-0 h-auto focus-visible:ring-1"
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== (goal?.mainGoal || "")) {
                          upsertGoal.mutate({ year, month, mainGoal: e.target.value, rating: goal?.rating || 1 });
                        }
                      }}
                      data-testid={`input-monthly-goal-${month}`}
                    />
                  </TableCell>
                  <TableCell>
                    <RatingSelect 
                      value={goal?.rating || 1} 
                      onChange={(r) => {
                        upsertGoal.mutate({ year, month, mainGoal: goal?.mainGoal || "Untitled Goal", rating: r });
                      }} 
                    />
                  </TableCell>
                  <TableCell className="font-medium">{(goal?.rating || 1) * 10}%</TableCell>
                  <TableCell><ProgressBar rating={goal?.rating || 1} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function DynamicMonthGoalsTable({ year }: { year: number }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const { data: goals, isLoading } = useMonthlyDynamicGoals(year, selectedMonth);
  const createGoal = useCreateMonthlyDynamicGoal();
  const updateGoal = useUpdateMonthlyDynamicGoal();
  const deleteGoal = useDeleteMonthlyDynamicGoal();
  const [newTitle, setNewTitle] = useState("");
  const [descModal, setDescModal] = useState<{ open: boolean; goalId: number; title: string; description: string }>({ open: false, goalId: 0, title: "", description: "" });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createGoal.mutate({ year, month: selectedMonth, title: newTitle, rating: 1, status: "Not Started" });
    setNewTitle("");
  };

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  const avgRating = goals?.length ? Math.round(goals.reduce((acc: number, g: any) => acc + (g.rating || 1), 0) / goals.length * 10) : 0;

  return (
    <Card className="border-border/50">
      <div className="p-5 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Dynamic Month Goals</h3>
              <p className="text-sm text-muted-foreground">Detailed goals for each month</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {goals && goals.length > 0 && (
              <AvgBadge label={`${MONTHS[selectedMonth - 1]} Avg`} avg={avgRating} total={goals.length} />
            )}
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[180px]" data-testid="select-dynamic-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-[180px]">Goal Title</TableHead>
              <TableHead className="w-[180px]">Description</TableHead>
              <TableHead className="w-[100px]">Rating</TableHead>
              <TableHead className="w-[80px]">%</TableHead>
              <TableHead className="min-w-[150px]">Progress</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals?.map((goal: any) => (
              <TableRow key={goal.id} className="border-border/30">
                <TableCell>
                  <Input 
                    defaultValue={goal.title} 
                    className="bg-transparent border-0 p-0 h-auto focus-visible:ring-1"
                    onBlur={(e) => {
                      if (e.target.value !== goal.title) {
                        updateGoal.mutate({ id: goal.id, title: e.target.value });
                      }
                    }}
                    data-testid={`input-dynamic-goal-title-${goal.id}`}
                  />
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => setDescModal({ open: true, goalId: goal.id, title: goal.title, description: goal.description || "" })}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left group"
                    data-testid={`button-open-desc-dynamic-${goal.id}`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
                    <span className="truncate max-w-[150px]">
                      {goal.description ? goal.description : "Add description..."}
                    </span>
                  </button>
                </TableCell>
                <TableCell>
                  <RatingSelect value={goal.rating || 1} onChange={(r) => updateGoal.mutate({ id: goal.id, rating: r })} />
                </TableCell>
                <TableCell className="font-medium">{(goal.rating || 1) * 10}%</TableCell>
                <TableCell><ProgressBar rating={goal.rating || 1} /></TableCell>
                <TableCell>
                  <Select value={goal.status || "Not Started"} onValueChange={(v) => updateGoal.mutate({ id: goal.id, status: v })}>
                    <SelectTrigger className="h-8 text-xs border-0 p-1" data-testid={`select-dynamic-goal-status-${goal.id}`}>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(goal.status || "Not Started")}`}>
                        {goal.status || "Not Started"}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => deleteGoal.mutate(goal.id)} data-testid={`button-delete-dynamic-goal-${goal.id}`}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-border/30">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="New goal title..." 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    className="bg-transparent border-0 p-0 h-auto focus-visible:ring-1"
                    data-testid="input-new-dynamic-goal-title"
                  />
                  <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim() || createGoal.isPending} className="shrink-0" data-testid="button-add-dynamic-goal">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </TableCell>
              <TableCell colSpan={6}></TableCell>
            </TableRow>
            {goals?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No goals for {MONTHS[selectedMonth - 1]} yet. Add your first goal above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DescriptionModal 
        open={descModal.open}
        onOpenChange={(v) => setDescModal(prev => ({ ...prev, open: v }))}
        title={descModal.title}
        description={descModal.description}
        onSave={(desc) => updateGoal.mutate({ id: descModal.goalId, description: desc })}
      />
    </Card>
  );
}

export default function GoalsPage() {
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground mt-1">Track your yearly, monthly, and detailed goals</p>
        </div>
        <YearSelector year={year} setYear={setYear} />
      </div>

      <YearlyGoalsTable year={year} />
      <MonthlyOverviewTable year={year} />
      <DynamicMonthGoalsTable year={year} />
    </div>
  );
}
