import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, CheckSquare, FileText, Users, MessageSquare } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "tasks", label: "Tasks" },
  { id: "documents", label: "Documents" },
  { id: "members", label: "People" },
];

interface SmartSearchProps {
  open: boolean;
  onClose: () => void;
}

export function SmartSearch({ open, onClose }: SmartSearchProps) {
  const { workspaceId } = useWorkspace();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(""); setCategory("all"); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data: results, isLoading } = useQuery<{ tasks: any[]; documents: any[]; members: any[] }>({
    queryKey: ["/api/search", workspaceId, query],
    queryFn: () => fetch(`/api/search?workspaceId=${workspaceId}&q=${encodeURIComponent(query)}`).then((r) => r.json()),
    enabled: !!workspaceId && query.length >= 2,
  });

  const tasks = results?.tasks ?? [];
  const documents = results?.documents ?? [];
  const members = results?.members ?? [];

  const allResults = [
    ...tasks.map((t) => ({ ...t, _type: "task" })),
    ...documents.map((d) => ({ ...d, _type: "document" })),
    ...members.map((m) => ({ ...m, _type: "member" })),
  ];

  const filtered = category === "all" ? allResults
    : category === "tasks" ? allResults.filter((r) => r._type === "task")
    : category === "documents" ? allResults.filter((r) => r._type === "document")
    : allResults.filter((r) => r._type === "member");

  const total = tasks.length + documents.length + members.length;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="smart-search-overlay"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" data-testid="smart-search">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, documents, people..."
            className="h-[52px] border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid="input-smart-search"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-search">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${category === cat.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}
              data-testid={`search-tab-${cat.id}`}
            >
              {cat.label}
            </button>
          ))}
          {total > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px]">{total} results</Badge>
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.length < 2 && (
            <p className="text-center py-8 text-sm text-muted-foreground">Type at least 2 characters to search</p>
          )}
          {query.length >= 2 && isLoading && (
            <p className="text-center py-8 text-sm text-muted-foreground">Searching...</p>
          )}
          {query.length >= 2 && !isLoading && filtered.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">No results found for &quot;{query}&quot;</p>
          )}
          {filtered.map((item, i) => (
            <div
              key={`${item._type}-${item.id || i}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
              data-testid={`search-result-${item._type}-${i}`}
            >
              {item._type === "task" && <CheckSquare className="h-4 w-4 text-blue-400 shrink-0" />}
              {item._type === "document" && <FileText className="h-4 w-4 text-green-400 shrink-0" />}
              {item._type === "member" && <Users className="h-4 w-4 text-purple-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.title || item.displayName || item.email}</p>
                {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
              </div>
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{item._type}</Badge>
            </div>
          ))}
        </div>

        <div className="px-4 pb-3 pt-1 text-[10px] text-muted-foreground/60">
          Ctrl+Shift+F to toggle · Escape to close
        </div>
      </div>
    </div>
  );
}
