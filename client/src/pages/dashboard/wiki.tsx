import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DocumentEditor } from "@/components/collaboration/DocumentEditor";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Doc {
  id: number;
  title: string;
  isWiki: boolean;
  parentDocumentId?: number;
  sortOrder?: number;
  createdAt: string;
}

export default function WikiPage() {
  const { workspaceId } = useWorkspace();
  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: docs = [] } = useQuery<Doc[]>({
    queryKey: ["/api/documents", workspaceId, "wiki"],
    queryFn: () => fetch(`/api/documents?workspaceId=${workspaceId}&isWiki=true`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/documents", { workspaceId, title: "Untitled Page", content: "", isWiki: true }),
    onSuccess: (data: Doc) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", workspaceId, "wiki"] });
      setActiveDocId(data.id);
    },
    onError: () => toast({ title: "Failed to create page", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", workspaceId, "wiki"] });
      setActiveDocId(null);
    },
  });

  if (!workspaceId) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a workspace.</div>;
  }

  return (
    <div className="flex h-full" data-testid="wiki-page">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Wiki</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            data-testid="button-new-page"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {docs.map((doc) => (
            <button
              key={doc.id}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-left transition-colors group ${
                activeDocId === doc.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
              onClick={() => setActiveDocId(doc.id)}
              data-testid={`doc-item-${doc.id}`}
            >
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{doc.title || "Untitled"}</span>
              <Trash2
                className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc.id); }}
              />
            </button>
          ))}
          {docs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-2">
              No pages yet. Create your first wiki page.
            </p>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {activeDocId ? (
          <DocumentEditor documentId={activeDocId} />
        ) : (
          <div className="flex h-full items-center justify-center flex-col gap-3 text-muted-foreground">
            <FileText className="h-12 w-12 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">Select a page</p>
              <p className="text-xs mt-1">Or create a new page to get started</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => createMutation.mutate()}
              data-testid="button-create-first-page"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />New Page
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
