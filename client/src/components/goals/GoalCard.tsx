import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OkrGoal {
  id: number;
  title: string;
  description: string | null;
  confidence: string | null;
  currentValue: string | null;
  targetValue: string | null;
  measurementUnit: string | null;
  dueDate: string | null;
  ownerId: string | null;
  goalType: string | null;
  workspaceId: number | null;
}

interface GoalCardProps {
  goal: OkrGoal;
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  on_track: { label: "On Track", color: "bg-green-500", badge: "bg-green-500/20 text-green-400 border-green-500/30" },
  at_risk: { label: "At Risk", color: "bg-orange-500", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  off_track: { label: "Off Track", color: "bg-red-500", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const GOAL_TYPE_COLORS: Record<string, string> = {
  "company_objective": "border-l-blue-500",
  "department_key_result": "border-l-purple-500",
  "team_goal": "border-l-green-500",
  "individual": "border-l-yellow-500",
};

function progressPct(current: string | null, target: string | null) {
  const c = parseFloat(current || "0");
  const t = parseFloat(target || "100");
  if (t === 0) return 0;
  return Math.min(Math.round((c / t) * 100), 100);
}

const initials = (id: string) => id.slice(0, 2).toUpperCase();

export function GoalCard({ goal, depth = 0, hasChildren, isExpanded, onToggle }: GoalCardProps) {
  const { toast } = useToast();
  const [editingValue, setEditingValue] = useState(false);
  const [newValue, setNewValue] = useState(goal.currentValue ?? "0");

  const confidence = goal.confidence || "on_track";
  const conf = CONFIDENCE_CONFIG[confidence] || CONFIDENCE_CONFIG.on_track;
  const pct = progressPct(goal.currentValue, goal.targetValue);
  const borderColor = GOAL_TYPE_COLORS[goal.goalType || "individual"] || "border-l-gray-500";

  const updateMutation = useMutation({
    mutationFn: (data: Partial<OkrGoal>) => apiRequest("PATCH", `/api/okr-goals/${goal.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/okr-goals"] });
      setEditingValue(false);
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/okr-goals/${goal.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/okr-goals"] }),
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  return (
    <Card
      className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow`}
      data-testid={`goal-card-${goal.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Expand toggle */}
          {hasChildren && (
            <button
              onClick={onToggle}
              className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`button-expand-${goal.id}`}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <div className="flex-1 min-w-0 space-y-2">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">{goal.title}</p>
                {goal.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{goal.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Confidence badge — clickable dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge
                      className={`cursor-pointer border text-[10px] ${conf.badge}`}
                      data-testid={`confidence-${goal.id}`}
                    >
                      {conf.label}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {Object.entries(CONFIDENCE_CONFIG).map(([key, val]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => updateMutation.mutate({ confidence: key })}
                        data-testid={`confidence-option-${key}`}
                      >
                        {val.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Actions */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setEditingValue(true)}
                  data-testid={`button-edit-value-${goal.id}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-red-400"
                  onClick={() => deleteMutation.mutate()}
                  data-testid={`button-delete-${goal.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                {editingValue ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="h-5 w-16 text-xs px-1"
                      data-testid={`input-current-value-${goal.id}`}
                    />
                    <span className="text-muted-foreground">{goal.measurementUnit}</span>
                    <Button
                      size="sm"
                      className="h-5 px-1.5 text-[10px]"
                      onClick={() => updateMutation.mutate({ currentValue: newValue })}
                      data-testid={`button-save-value-${goal.id}`}
                    >Save</Button>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => setEditingValue(false)}>×</Button>
                  </div>
                ) : (
                  <span className="font-medium">
                    {goal.currentValue ?? "0"} / {goal.targetValue ?? "100"} {goal.measurementUnit}
                    <span className="text-muted-foreground ml-1">({pct}%)</span>
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${conf.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              {goal.ownerId && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10">{initials(goal.ownerId)}</AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-muted-foreground">{goal.ownerId.slice(0, 10)}</span>
                </div>
              )}
              {goal.dueDate && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(goal.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
