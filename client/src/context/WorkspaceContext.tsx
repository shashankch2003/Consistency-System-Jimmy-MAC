import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Workspace {
  id: number;
  name: string;
  industry?: string;
  companySize?: string;
  createdBy?: string;
  createdAt?: string;
}

interface WorkspaceContextValue {
  activeWorkspace: Workspace | null;
  workspaceId: number | null;
  setActiveWorkspace: (ws: Workspace | null) => void;
  workspaces: Workspace[];
  isLoading: boolean;
  isSeeding: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  activeWorkspace: null,
  workspaceId: null,
  setActiveWorkspace: () => {},
  workspaces: [],
  isLoading: false,
  isSeeding: false,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const seededRef = useRef(false);
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

  // Auto-seed demo data the first time we detect no workspaces exist
  useEffect(() => {
    if (!isLoading && workspaces.length === 0 && !seededRef.current) {
      seededRef.current = true;
      setIsSeeding(true);
      apiRequest("POST", "/api/seed-team-demo", {})
        .then(async (res) => {
          if (!res.ok) throw new Error("seed failed");
          await queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/workspace-members"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        })
        .catch(() => { /* silently fail — user can manually create workspace */ })
        .finally(() => setIsSeeding(false));
    }
  }, [isLoading, workspaces.length, queryClient]);

  // Set first workspace as active once loaded
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) {
      const savedId = localStorage.getItem("activeWorkspaceId");
      const found = savedId ? workspaces.find((w) => w.id === parseInt(savedId)) : null;
      setActiveWorkspaceState(found ?? workspaces[0]);
    }
  }, [workspaces, activeWorkspace]);

  const setActiveWorkspace = (ws: Workspace | null) => {
    setActiveWorkspaceState(ws);
    if (ws) localStorage.setItem("activeWorkspaceId", String(ws.id));
  };

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, workspaceId: activeWorkspace?.id ?? null, setActiveWorkspace, workspaces, isLoading, isSeeding }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
