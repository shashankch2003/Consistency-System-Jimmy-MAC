import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderKanban, Plus, Building2, Search } from "lucide-react";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { TaskList } from "@/components/tasks/TaskList";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: number;
  workspaceId: number;
  name: string;
  description?: string;
  teamId?: number;
  status: string;
  priority: string;
  dueDate?: string;
  startDate?: string;
  ownerId?: string;
  visibility?: string;
  progress: number;
  createdAt?: string;
}

interface WorkspaceMember {
  id: number;
  userId?: string;
  email: string;
  displayName?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-500/20 text-green-400 border-green-500/30",
  Planning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "On Hold": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Completed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function ProjectsPage() {
  const { activeWorkspace, workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "dueDate" | "status">("name");

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects", workspaceId],
    queryFn: () => fetch(`/api/projects?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ["/api/workspace-members", workspaceId],
    queryFn: () => fetch(`/api/workspace-members?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const filtered = projects
    .filter((p) => {
      const matchesSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "dueDate") return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

  if (!activeWorkspace) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium text-lg">No workspace selected</p>
          <p className="text-muted-foreground">Go to Workspace Setup to create or select a workspace first.</p>
        </div>
      </div>
    );
  }

  // Project detail view
  if (selectedProject) {
    const liveProject = projects.find((p) => p.id === selectedProject.id) ?? selectedProject;
    return (
      <div className="h-full flex flex-col">
        <ProjectHeader project={liveProject} members={members} onBack={() => setSelectedProject(null)} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Tasks</h2>
            </div>
            <TaskList projectId={liveProject.id} members={members} />
          </div>
        </div>
      </div>
    );
  }

  // Project list view
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">Manage all your team projects</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-new-project">
          <Plus className="h-4 w-4 mr-2" />New Project
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            data-testid="input-search-projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-56"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Planning">Planning</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-14" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">{search || statusFilter !== "All" ? "No projects match your filters" : "No projects yet"}</p>
            {!search && statusFilter === "All" && (
              <>
                <p className="text-muted-foreground mb-4">Create your first project to get started</p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />Create Project
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <button className="text-left hover:text-foreground" onClick={() => setSortBy("name")} data-testid="sort-by-name">
              Project Name {sortBy === "name" && "↑"}
            </button>
            <button className="text-left hover:text-foreground" onClick={() => setSortBy("status")} data-testid="sort-by-status">
              Status {sortBy === "status" && "↑"}
            </button>
            <span>Team</span>
            <span>Progress</span>
            <button className="text-left hover:text-foreground" onClick={() => setSortBy("dueDate")} data-testid="sort-by-due">
              Due Date {sortBy === "dueDate" && "↑"}
            </button>
            <span>Owner</span>
          </div>

          {/* Rows */}
          {filtered.map((project) => (
            <div
              key={project.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-t border-border hover:bg-muted/20 cursor-pointer items-center"
              onClick={() => setSelectedProject(project)}
              data-testid={`row-project-${project.id}`}
            >
              <div>
                <div className="font-medium text-sm" data-testid={`text-project-name-${project.id}`}>{project.name}</div>
                {project.description && (
                  <div className="text-xs text-muted-foreground truncate">{project.description}</div>
                )}
              </div>

              <div>
                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[project.status] ?? ""}`} data-testid={`badge-status-${project.id}`}>
                  {project.status}
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                {project.teamId ? `Team #${project.teamId}` : "—"}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${project.progress ?? 0}%` }}
                    data-testid={`progress-bar-${project.id}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8" data-testid={`text-progress-${project.id}`}>
                  {project.progress ?? 0}%
                </span>
              </div>

              <div className="text-sm text-muted-foreground" data-testid={`text-due-${project.id}`}>
                {project.dueDate || "—"}
              </div>

              <div className="text-sm text-muted-foreground text-xs">
                {project.ownerId ? project.ownerId.slice(0, 8) + "…" : "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal workspaceId={activeWorkspace.id} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
