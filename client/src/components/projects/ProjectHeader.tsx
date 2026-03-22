import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, MoreHorizontal, Plus, CalendarDays, ChevronLeft } from "lucide-react";
import { ProjectSettings } from "./ProjectSettings";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["Planning", "Active", "On Hold", "Completed"];

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-500/20 text-green-400 border-green-500/30",
  Planning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "On Hold": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Completed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "text-red-400",
  High: "text-orange-400",
  Medium: "text-yellow-400",
  Low: "text-green-400",
};

interface Project {
  id: number;
  name: string;
  description?: string;
  teamId?: number;
  status: string;
  priority: string;
  dueDate?: string;
  workspaceId?: number;
}

interface WorkspaceMember {
  id: number;
  userId?: string;
  email: string;
  displayName?: string;
}

interface ProjectHeaderProps {
  project: Project;
  members: WorkspaceMember[];
  onBack: () => void;
}

export function ProjectHeader({ project, members, onBack }: ProjectHeaderProps) {
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/projects/${project.id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Status updated" });
    },
  });

  const initials = (m: WorkspaceMember) => (m.displayName || m.email)[0].toUpperCase();

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card" data-testid="project-header">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} data-testid="button-back-projects">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <h1 className="text-[20px] font-bold truncate" data-testid="text-project-name">{project.name}</h1>

          {/* Status — clickable dropdown */}
          <Select value={project.status} onValueChange={(v) => statusMutation.mutate(v)}>
            <SelectTrigger className={`h-7 text-xs px-2 border rounded-full w-auto min-w-0 ${STATUS_COLORS[project.status] ?? ""}`} data-testid="select-project-status-header">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Priority indicator */}
          <span className={`text-xs font-medium ${PRIORITY_COLORS[project.priority] ?? ""}`} data-testid="text-project-priority">
            {project.priority}
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Team member avatars */}
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m) => (
              <Avatar key={m.id} className="h-7 w-7 border-2 border-card" title={m.displayName || m.email}>
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials(m)}</AvatarFallback>
              </Avatar>
            ))}
            {members.length > 4 && (
              <Avatar className="h-7 w-7 border-2 border-card">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">+{members.length - 4}</AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Due date */}
          {project.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="text-project-due-header">
              <CalendarDays className="h-3 w-3" />
              {project.dueDate}
            </div>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(true)} data-testid="button-project-settings">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-project-menu">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowCreateTask(true)} data-testid="button-create-task-header">
            <Plus className="h-4 w-4 mr-1" />Create Task
          </Button>
        </div>
      </div>

      {showSettings && <ProjectSettings project={project} onClose={() => setShowSettings(false)} />}
      {showCreateTask && <CreateTaskModal projectId={project.id} members={members} onClose={() => setShowCreateTask(false)} />}
    </>
  );
}
