import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  FileText, Plus, Star, MoreHorizontal, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type PmPage = {
  id: number;
  title: string;
  icon: string | null;
  coverImage: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  parentPageId: number | null;
  updatedAt: string;
  childCount: number;
};

export default function PmWorkspacePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: pages, isLoading } = useQuery<PmPage[]>({
    queryKey: ["pm-pages"],
  });

  const createPage = useMutation({
    mutationFn: () => apiRequest("POST", "/api/pm-pages", { title: "Untitled" }),
    onSuccess: async (res) => {
      const page = await res.json();
      queryClient.invalidateQueries({ queryKey: ["pm-pages"] });
      navigate(`/dashboard/pm-editor/${page.id}`);
    },
  });

  const updatePage = useMutation({
    mutationFn: ({ id, ...updates }: Partial<PmPage> & { id: number }) =>
      apiRequest("PATCH", `/api/pm-pages/${id}`, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-pages"] }),
  });

  const deletePage = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pm-pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-pages"] });
      toast({ title: "Page deleted" });
    },
  });

  const duplicatePage = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/pm-pages/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-pages"] });
      toast({ title: "Page duplicated" });
    },
  });

  const rootPages = pages?.filter(p => p.parentPageId === null) ?? [];

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 min-h-screen" data-testid="pm-workspace-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Workspace</h1>
          <p className="text-muted-foreground text-sm mt-1">Your pages and documents</p>
        </div>
        <Button
          onClick={() => createPage.mutate()}
          disabled={createPage.isPending}
          className="gap-2"
          data-testid="create-page-btn"
        >
          {createPage.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          New Page
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : rootPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4" data-testid="pm-workspace-empty">
          <FileText className="w-12 h-12 text-muted-foreground/40" />
          <div className="text-center">
            <p className="text-base font-medium text-foreground/60">No pages yet</p>
            <p className="text-sm mt-1">Create your first page to get started</p>
          </div>
          <Button
            onClick={() => createPage.mutate()}
            disabled={createPage.isPending}
            className="gap-2 mt-2"
            data-testid="create-page-empty-btn"
          >
            <Plus className="w-4 h-4" />
            Create Page
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rootPages.map(page => (
            <div
              key={page.id}
              className="group relative rounded-2xl border border-border/50 bg-card/40 hover:border-border hover:bg-card/80 transition-all duration-200 overflow-hidden cursor-pointer"
              onClick={() => navigate(`/dashboard/pm-editor/${page.id}`)}
              data-testid={`page-card-${page.id}`}
            >
              {page.coverImage && (
                <div
                  className="h-16 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${page.coverImage})` }}
                />
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {page.icon ? (
                      <span className="text-2xl shrink-0">{page.icon}</span>
                    ) : (
                      <FileText className="w-6 h-6 text-muted-foreground/50 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{page.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Updated {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {page.isFavorite && (
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`page-menu-${page.id}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => updatePage.mutate({ id: page.id, isFavorite: !page.isFavorite })}
                          data-testid={`favorite-btn-${page.id}`}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          {page.isFavorite ? "Remove Favorite" : "Add to Favorites"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicatePage.mutate(page.id)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updatePage.mutate({ id: page.id, isArchived: true })}>
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-400"
                          onClick={() => deletePage.mutate(page.id)}
                          data-testid={`delete-btn-${page.id}`}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {page.childCount > 0 && (
                  <p className="text-xs text-muted-foreground/50 mt-3">
                    {page.childCount} sub-page{page.childCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
