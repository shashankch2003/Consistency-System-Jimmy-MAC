import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Table2, Columns, Calendar, GanttChart, List } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DatabaseTableView from "./DatabaseTableView";
import DatabaseBoardView from "./DatabaseBoardView";
import DatabaseCalendarView from "./DatabaseCalendarView";
import DatabaseTimelineView from "./DatabaseTimelineView";
import DatabaseListView from "./DatabaseListView";

const VIEW_ICONS: Record<string, any> = {
  table: Table2,
  board: Columns,
  calendar: Calendar,
  timeline: GanttChart,
  list: List,
};

const VIEW_TYPES = [
  { type: "table", label: "Table" },
  { type: "board", label: "Board" },
  { type: "calendar", label: "Calendar" },
  { type: "timeline", label: "Timeline" },
  { type: "list", label: "List" },
];

interface Props {
  databaseId: number;
}

export default function DatabaseViewContainer({ databaseId }: Props) {
  const [activeViewId, setActiveViewId] = useState<number | null>(null);
  const [newViewOpen, setNewViewOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewType, setNewViewType] = useState("table");
  const [contextMenu, setContextMenu] = useState<{ viewId: number; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const contextMenuRef = useRef<HTMLDivElement>(null);

  const { data: views = [] } = useQuery<any[]>({
    queryKey: ["pm-database-views", databaseId],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}/views`).then(r => r.json()),
  });

  useEffect(() => {
    if (views.length && !activeViewId) setActiveViewId(views[0].id);
  }, [views, activeViewId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const createView = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/pm-databases/${databaseId}/views`, body).then(r => r.json()),
    onSuccess: (view: any) => {
      queryClient.invalidateQueries({ queryKey: ["pm-database-views", databaseId] });
      setActiveViewId(view.id);
      setNewViewOpen(false);
      setNewViewName("");
    },
  });

  const updateView = useMutation({
    mutationFn: ({ id, ...body }: any) => apiRequest("PATCH", `/api/pm-database-views/${id}`, body).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database-views", databaseId] }),
  });

  const deleteView = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pm-database-views/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-database-views", databaseId] });
      setActiveViewId(views.find(v => v.id !== contextMenu?.viewId)?.id || null);
    },
  });

  const duplicateView = useMutation({
    mutationFn: ({ id, ...body }: any) => apiRequest("POST", `/api/pm-databases/${databaseId}/views`, body).then(r => r.json()),
    onSuccess: (view: any) => {
      queryClient.invalidateQueries({ queryKey: ["pm-database-views", databaseId] });
      setActiveViewId(view.id);
    },
  });

  const activeView = views.find(v => v.id === activeViewId);

  const handleContextMenu = (e: React.MouseEvent, viewId: number) => {
    e.preventDefault();
    setContextMenu({ viewId, x: e.clientX, y: e.clientY });
  };

  const handleRename = (view: any) => {
    setRenamingId(view.id);
    setRenameValue(view.name);
    setContextMenu(null);
  };

  const handleDuplicate = (view: any) => {
    duplicateView.mutate({ name: view.name + " (Copy)", type: view.type, config: view.config });
    setContextMenu(null);
  };

  const handleDelete = (viewId: number) => {
    deleteView.mutate(viewId);
    setContextMenu(null);
  };

  const renderView = () => {
    if (!activeView) return null;
    const config = (activeView.config as any) || {};
    switch (activeView.type) {
      case "table":
        return <DatabaseTableView databaseId={databaseId} />;
      case "board":
        return <DatabaseBoardView databaseId={databaseId} viewConfig={config} />;
      case "calendar":
        return <DatabaseCalendarView databaseId={databaseId} viewConfig={config} />;
      case "timeline":
        return <DatabaseTimelineView databaseId={databaseId} viewConfig={config} />;
      case "list":
        return <DatabaseListView databaseId={databaseId} viewConfig={config} />;
      default:
        return <DatabaseTableView databaseId={databaseId} />;
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center border-b border-border bg-muted/20 overflow-x-auto">
        {views.map((view: any) => {
          const Icon = VIEW_ICONS[view.type] || Table2;
          const isActive = view.id === activeViewId;
          return (
            <div key={view.id} className="relative">
              {renamingId === view.id ? (
                <div className="flex items-center gap-1 px-3 py-2">
                  <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <input
                    autoFocus
                    className="text-xs bg-transparent outline-none border-b border-primary w-24"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => { if (renameValue.trim()) updateView.mutate({ id: view.id, name: renameValue.trim() }); setRenamingId(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { if (renameValue.trim()) updateView.mutate({ id: view.id, name: renameValue.trim() }); setRenamingId(null); } if (e.key === "Escape") setRenamingId(null); }}
                  />
                </div>
              ) : (
                <button
                  className={cn("flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap", isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
                  onClick={() => setActiveViewId(view.id)}
                  onContextMenu={e => handleContextMenu(e, view.id)}
                  data-testid={`view-tab-${view.id}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {view.name}
                </button>
              )}
            </div>
          );
        })}
        <Popover open={newViewOpen} onOpenChange={setNewViewOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center px-2.5 py-2.5 text-muted-foreground hover:text-foreground transition-colors shrink-0" data-testid="add-view-btn">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <p className="text-xs font-medium mb-2">New view</p>
            <Input className="h-7 text-xs mb-2" placeholder="View name" value={newViewName} onChange={e => setNewViewName(e.target.value)} />
            <div className="space-y-1 mb-3">
              {VIEW_TYPES.map(({ type, label }) => {
                const Icon = VIEW_ICONS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setNewViewType(type)}
                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors", newViewType === type && "bg-muted")}
                    data-testid={`new-view-type-${type}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => {
                if (!newViewName.trim()) return;
                createView.mutate({ name: newViewName.trim(), type: newViewType });
              }}
              disabled={!newViewName.trim() || createView.isPending}
            >
              Create
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      <div>{renderView()}</div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 w-36"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {(() => {
            const view = views.find(v => v.id === contextMenu.viewId);
            if (!view) return null;
            return (
              <>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted" onClick={() => handleRename(view)}>Rename</button>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted" onClick={() => handleDuplicate(view)}>Duplicate</button>
                <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-destructive" onClick={() => handleDelete(view.id)}>Delete</button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
