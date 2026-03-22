import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GripVertical } from "lucide-react";

interface TeamTask {
  id: number;
  title: string;
  estimatedMinutes: number;
  status: string;
}

interface WorkloadMember {
  id: number;
  userId: string | null;
  displayName: string | null;
  email: string;
  role: string;
  weeklyCapacityHours: number | null;
  totalMinutes: number;
  capacityMinutes: number;
  utilization: number;
  assignedTasks: TeamTask[];
}

interface WorkloadViewProps {
  workloadData: WorkloadMember[];
  workspaceId: number;
}

function getUtilizationColor(pct: number) {
  if (pct > 100) return { bar: "bg-red-500", text: "text-red-400", label: "Overloaded" };
  if (pct >= 80) return { bar: "bg-orange-500", text: "text-orange-400", label: "At Capacity" };
  return { bar: "bg-green-500", text: "text-green-400", label: "Available" };
}

function minutesToHours(m: number) {
  return (m / 60).toFixed(1);
}

const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export function WorkloadView({ workloadData, workspaceId }: WorkloadViewProps) {
  const [data, setData] = useState<WorkloadMember[]>(workloadData);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reassign = useMutation({
    mutationFn: ({ taskId, assigneeId }: { taskId: number; assigneeId: string }) =>
      apiRequest("PATCH", `/api/team-tasks/${taskId}/reassign`, { assigneeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/workload"] }),
    onError: () => toast({ title: "Failed to reassign task", variant: "destructive" }),
  });

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const taskId = parseInt(draggableId);
    const fromMemberId = parseInt(source.droppableId);
    const toMemberId = parseInt(destination.droppableId);

    const newData = data.map((member) => {
      if (member.id === fromMemberId) {
        const task = member.assignedTasks.find((t) => t.id === taskId)!;
        return {
          ...member,
          assignedTasks: member.assignedTasks.filter((t) => t.id !== taskId),
          totalMinutes: member.totalMinutes - (task?.estimatedMinutes || 0),
          utilization: Math.round(((member.totalMinutes - (task?.estimatedMinutes || 0)) / member.capacityMinutes) * 100),
        };
      }
      if (member.id === toMemberId) {
        const task = data.find((m) => m.id === fromMemberId)?.assignedTasks.find((t) => t.id === taskId)!;
        return {
          ...member,
          assignedTasks: [...member.assignedTasks, task],
          totalMinutes: member.totalMinutes + (task?.estimatedMinutes || 0),
          utilization: Math.round(((member.totalMinutes + (task?.estimatedMinutes || 0)) / member.capacityMinutes) * 100),
        };
      }
      return member;
    });

    setData(newData);

    const toMember = data.find((m) => m.id === toMemberId);
    if (toMember?.userId) {
      reassign.mutate({ taskId, assigneeId: toMember.userId });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-3" data-testid="workload-view">
        {data.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            No members found. Add members to your workspace first.
          </div>
        )}
        {data.map((member) => {
          const colors = getUtilizationColor(member.utilization);
          const capacityHours = member.weeklyCapacityHours || 40;
          const assignedHours = parseFloat(minutesToHours(member.totalMinutes));
          const pct = Math.min(member.utilization, 100);

          return (
            <div
              key={member.id}
              className="border border-border rounded-xl p-4 bg-card"
              data-testid={`member-row-${member.id}`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar + info */}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {initials(member.displayName || member.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-medium text-sm">{member.displayName || member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${colors.text}`}>{member.utilization}%</span>
                      <p className="text-xs text-muted-foreground">{assignedHours}h / {capacityHours}h</p>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full transition-all ${colors.bar}`} style={{ width: `${pct}%` }} />
                  </div>

                  {/* Task pills – drag source */}
                  <Droppable droppableId={String(member.id)} direction="horizontal">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-wrap gap-1.5 min-h-[28px] rounded-lg p-1 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5 border border-primary/20" : ""}`}
                      >
                        {member.assignedTasks.map((task, i) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={i}>
                            {(drag, snapDrag) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                                data-testid={`task-pill-${task.id}`}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border bg-muted/40 cursor-grab select-none ${snapDrag.isDragging ? "shadow-lg scale-105 opacity-90" : "hover:border-primary/40"}`}
                              >
                                <GripVertical className="h-2.5 w-2.5 text-muted-foreground" />
                                <span className="truncate max-w-[100px]">{task.title}</span>
                                {task.estimatedMinutes > 0 && (
                                  <span className="text-muted-foreground">·{minutesToHours(task.estimatedMinutes)}h</span>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {member.assignedTasks.length === 0 && (
                          <span className="text-xs text-muted-foreground italic px-1">Drop tasks here</span>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Status badge */}
                <Badge className={`shrink-0 text-[10px] ${colors.text} border-current bg-transparent`}>
                  {colors.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
