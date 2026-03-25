import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderKanban, Plus, Building2, Search, Loader2 } from "lucide-react";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { TaskList } from "@/components/tasks/TaskList";
import { ViewSwitcher, ViewType } from "@/components/views/ViewSwitcher";
import { BoardView } from "@/components/views/BoardView";
import { ListView } from "@/components/views/ListView";
import { TimelineView } from "@/components/views/TimelineView";
import { CalendarView } from "@/components/views/CalendarView";
import { TableView } from "@/components/views/TableView";
import { DashboardView } from "@/components/views/DashboardView";
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

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "text-red-400",
  High: "text-orange-400",
  Medium: "text-yellow-400",
  Low: "text-gray-400",
};

const DEMO_PROJECTS: Project[] = [
  { id: 1, workspaceId: 1, name: "Mobile App Redesign", description: "Complete UI/UX overhaul of the iOS and Android apps with new design system", status: "Active", priority: "High", progress: 65, teamId: 3, dueDate: "2026-05-15" },
  { id: 2, workspaceId: 1, name: "Platform Infrastructure Migration", description: "Migrate all services to Kubernetes with zero-downtime deployment pipeline", status: "Active", priority: "Critical", progress: 40, teamId: 1, dueDate: "2026-06-30" },
  { id: 3, workspaceId: 1, name: "Q2 Marketing Campaign", description: "Integrated digital marketing campaign targeting SMB segment in APAC and EMEA", status: "Active", priority: "High", progress: 85, teamId: 4, dueDate: "2026-04-30" },
  { id: 4, workspaceId: 1, name: "Customer Self-Service Portal", description: "New portal allowing customers to manage accounts, billing, and support tickets", status: "Planning", priority: "Medium", progress: 10, teamId: 2, dueDate: "2026-08-01" },
  { id: 5, workspaceId: 1, name: "API v3.0 — GraphQL Migration", description: "Replace REST endpoints with GraphQL API layer, improve developer experience", status: "Active", priority: "High", progress: 55, teamId: 1, dueDate: "2026-07-15" },
  { id: 6, workspaceId: 1, name: "Sales Intelligence Dashboard", description: "Real-time pipeline visibility and AI-driven lead scoring for the sales team", status: "Completed", priority: "Medium", progress: 100, teamId: 5, dueDate: "2026-03-01" },
  { id: 7, workspaceId: 1, name: "HR System Integration", description: "Integrate BambooHR with internal tools for automated onboarding workflows", status: "On Hold", priority: "Low", progress: 30, teamId: 7, dueDate: "2026-09-01" },
  { id: 8, workspaceId: 1, name: "User Analytics Platform", description: "Build internal analytics to track engagement, retention, and feature adoption", status: "Planning", priority: "Medium", progress: 5, teamId: 2, dueDate: "2026-10-01" },
  { id: 9, workspaceId: 1, name: "SEO & Content Optimisation", description: "Restructure website content architecture and implement technical SEO improvements", status: "Active", priority: "Medium", progress: 70, teamId: 4, dueDate: "2026-04-15" },
  { id: 10, workspaceId: 1, name: "Annual Security Audit", description: "Comprehensive SOC2 Type II audit and penetration testing across all systems", status: "Completed", priority: "Critical", progress: 100, teamId: 6, dueDate: "2026-03-10" },
  { id: 11, workspaceId: 1, name: "Data Pipeline & Warehouse", description: "Build real-time event streaming pipeline feeding into Snowflake data warehouse", status: "Active", priority: "High", progress: 25, teamId: 1, dueDate: "2026-09-30" },
  { id: 12, workspaceId: 1, name: "Design System 2.0", description: "Unified component library and brand guidelines across all product surfaces", status: "Active", priority: "Medium", progress: 50, teamId: 3, dueDate: "2026-06-01" },
];

export default function ProjectsPage() {
  const { activeWorkspace, workspaceId, isSeeding } = useWorkspace();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "dueDate" | "status">("name");
  const [activeView, setActiveView] = useState<ViewType>("board");

  const { data: dbProjects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects", workspaceId],
    queryFn: () => fetch(`/api/projects?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ["/api/workspace-members", workspaceId],
    queryFn: () => fetch(`/api/workspace-members?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  // Use real data when workspace is set, demo data otherwise
  const projects = workspaceId ? dbProjects : DEMO_PROJECTS;
  const isDemo = !activeWorkspace;

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

  // Project detail view
  if (selectedProject) {
    const liveProject = projects.find((p) => p.id === selectedProject.id) ?? selectedProject;
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <ProjectHeader project={liveProject} members={members} onBack={() => setSelectedProject(null)} />
        <ViewSwitcher activeView={activeView} onViewChange={setActiveView} />
        <div className="flex-1 overflow-hidden">
          {activeView === "board" && <BoardView projectId={liveProject.id} members={members} />}
          {activeView === "list" && <ListView projectId={liveProject.id} members={members} />}
          {activeView === "timeline" && <TimelineView projectId={liveProject.id} members={members} />}
          {activeView === "calendar" && <CalendarView projectId={liveProject.id} members={members} />}
          {activeView === "table" && <TableView projectId={liveProject.id} members={members} />}
          {activeView === "dashboard" && <DashboardView projectId={liveProject.id} members={members} />}
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
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            {isDemo ? "TechNova Solutions (Demo)" : activeWorkspace?.name} · {projects.length} projects
            {isSeeding && <span className="flex items-center gap-1 text-primary text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Loading live data…</span>}
            {isDemo && !isSeeding && <Badge variant="secondary" className="text-xs">Demo Preview</Badge>}
          </p>
        </div>
        {activeWorkspace && (
          <Button onClick={() => setShowCreate(true)} data-testid="button-new-project">
            <Plus className="h-4 w-4 mr-2" />New Project
          </Button>
        )}
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
                {project.teamId ? ({1:"Engineering",2:"Product",3:"Design",4:"Marketing",5:"Sales",6:"Operations",7:"HR & Finance"} as Record<number,string>)[project.teamId] ?? `Team #${project.teamId}` : "—"}
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
