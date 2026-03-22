import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { LayoutGrid, List, GanttChart, Calendar, Table, BarChart2 } from "lucide-react";

export type ViewType = "board" | "list" | "timeline" | "calendar" | "table" | "dashboard";

const VIEWS: { id: ViewType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "board", label: "Board", Icon: LayoutGrid },
  { id: "list", label: "List", Icon: List },
  { id: "timeline", label: "Timeline", Icon: GanttChart },
  { id: "calendar", label: "Calendar", Icon: Calendar },
  { id: "table", label: "Table", Icon: Table },
  { id: "dashboard", label: "Dashboard", Icon: BarChart2 },
];

interface ViewSwitcherProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  const { workspaceId } = useWorkspace();

  const mutation = useMutation({
    mutationFn: (view: string) =>
      apiRequest("PATCH", "/api/workspace-members/me/preferred-view", { view, workspaceId }),
  });

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    if (workspaceId) mutation.mutate(view);
  };

  return (
    <div className="flex items-center gap-0 border-b border-border px-4 bg-card" data-testid="view-switcher">
      {VIEWS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => handleViewChange(id)}
          data-testid={`view-tab-${id}`}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
            activeView === id
              ? "border-primary text-primary font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
