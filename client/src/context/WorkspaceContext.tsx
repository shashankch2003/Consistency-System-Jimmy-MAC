import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

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
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  activeWorkspace: null,
  workspaceId: null,
  setActiveWorkspace: () => {},
  workspaces: [],
  isLoading: false,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

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
    <WorkspaceContext.Provider value={{ activeWorkspace, workspaceId: activeWorkspace?.id ?? null, setActiveWorkspace, workspaces, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
