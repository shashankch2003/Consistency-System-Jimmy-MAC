import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { LayoutTemplate, Plus, Trash2, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "project", label: "Project" },
  { value: "meeting", label: "Meeting" },
  { value: "docs", label: "Docs" },
  { value: "engineering", label: "Engineering" },
  { value: "marketing", label: "Marketing" },
  { value: "hr", label: "HR" },
  { value: "personal", label: "Personal" },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  project: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  meeting: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  docs: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  engineering: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  marketing: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  hr: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  personal: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

export default function PmTemplates() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPageId, setCreatePageId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createCategory, setCreateCategory] = useState("general");

  useQuery({
    queryKey: ["pm-templates-seed"],
    queryFn: () => apiRequest("POST", "/api/pm-templates/seed-system").then(r => r.json()),
    staleTime: Infinity,
  });

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["pm-templates", selectedCategory],
    queryFn: () => {
      const param = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      return fetch(`/api/pm-templates${param}`).then(r => r.json());
    },
  });

  const { data: pages = [] } = useQuery<any[]>({
    queryKey: ["/api/pm-pages"],
  });

  const createTemplate = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/pm-templates", body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-templates"] });
      setCreateOpen(false);
      setCreatePageId("");
      setCreateName("");
      setCreateDesc("");
      setCreateCategory("general");
      toast({ title: "Template created" });
    },
    onError: () => toast({ title: "Failed to create template", variant: "destructive" }),
  });

  const useTemplate = useMutation({
    mutationFn: ({ id }: { id: number }) => apiRequest("POST", `/api/pm-templates/${id}/use`, {}).then(r => r.json()),
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-pages"] });
      navigate(`/dashboard/pm-editor/${newPage.id}`);
    },
    onError: () => toast({ title: "Failed to use template", variant: "destructive" }),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pm-templates/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: () => toast({ title: "Failed to delete template", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto" data-testid="pm-templates-page">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutTemplate className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Templates</h1>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2"
          data-testid="create-template-btn"
        >
          <Plus className="w-4 h-4" /> Create Template
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              selectedCategory === cat.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
            data-testid={`category-filter-${cat.value}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-5 space-y-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20">
          <LayoutTemplate className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No templates yet. Create one from an existing page or browse system templates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl: any) => (
            <div
              key={tpl.id}
              className="group rounded-xl border border-border bg-card hover:border-primary/40 transition-all p-5 flex flex-col gap-3"
              data-testid={`template-card-${tpl.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{tpl.icon || "📄"}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-snug truncate">{tpl.name}</p>
                    {tpl.isSystemTemplate && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-[10px] text-muted-foreground">System</span>
                      </div>
                    )}
                  </div>
                </div>
                {!tpl.isSystemTemplate && (
                  <button
                    onClick={() => deleteTemplate.mutate(tpl.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    data-testid={`delete-template-${tpl.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {tpl.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{tpl.description}</p>
              )}

              <div className="flex items-center justify-between mt-auto pt-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[10px] px-2 py-0.5", CATEGORY_COLORS[tpl.category] || CATEGORY_COLORS.general)}>
                    {tpl.category}
                  </Badge>
                  {tpl.usageCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">{tpl.usageCount} uses</span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => useTemplate.mutate({ id: tpl.id })}
                  disabled={useTemplate.isPending}
                  data-testid={`use-template-${tpl.id}`}
                >
                  <Zap className="w-3 h-3" /> Use
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Source Page</label>
              <select
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                value={createPageId}
                onChange={e => setCreatePageId(e.target.value)}
                data-testid="select-template-page"
              >
                <option value="">Select a page...</option>
                {(pages as any[]).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ""}{p.title || "Untitled"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Template Name</label>
              <Input
                placeholder="My Template..."
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                data-testid="input-template-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
              <Input
                placeholder="Describe this template..."
                value={createDesc}
                onChange={e => setCreateDesc(e.target.value)}
                data-testid="input-template-desc"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
              <select
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                value={createCategory}
                onChange={e => setCreateCategory(e.target.value)}
                data-testid="select-template-category"
              >
                {CATEGORIES.filter(c => c.value !== "all").map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!createPageId || !createName.trim() || createTemplate.isPending}
              onClick={() => createTemplate.mutate({ pageId: parseInt(createPageId), name: createName, description: createDesc, category: createCategory })}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
