import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, FileText, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT_TYPE_CONTENT_TYPES: Record<string, string> = {
  pageTitle: "Page",
  blockText: "Block",
  databaseTitle: "Database",
  databaseCellText: "Cell",
};

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export default function QuickNavModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const { data: recentPages = [] } = useQuery<any[]>({
    queryKey: ["/api/pm-pages"],
    enabled: open,
  });

  const { data: searchResults = [] } = useQuery<any[]>({
    queryKey: ["pm-search", debouncedQuery],
    queryFn: () => fetch(`/api/pm-search?q=${encodeURIComponent(debouncedQuery)}`).then(r => r.json()),
    enabled: open && debouncedQuery.length >= 2,
  });

  const recentSorted = [...recentPages]
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 10);

  const isSearching = debouncedQuery.length >= 2;

  const items: { pageId: number; icon?: string; title: string; preview?: string; contentType?: string }[] = isSearching
    ? searchResults.map((r: any) => ({
        pageId: r.pageId,
        icon: r.pageIcon,
        title: r.pageTitle,
        preview: r.searchText?.replace(/\*\*/g, "").slice(0, 60),
        contentType: r.contentType,
      }))
    : recentSorted.map((p: any) => ({
        pageId: p.id,
        icon: p.icon,
        title: p.title || "Untitled",
      }));

  const goToPage = useCallback((pageId: number) => {
    navigate(`/dashboard/pm-editor/${pageId}`);
    setOpen(false);
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && items[activeIndex]) {
      goToPage(items[activeIndex].pageId);
    }
  };

  useEffect(() => { setActiveIndex(0); }, [debouncedQuery]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
      data-testid="quick-nav-modal"
    >
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search pages..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="quick-nav-input"
          />
          <kbd className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto py-1">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {isSearching ? "No results found" : "No recent pages"}
            </div>
          )}
          {!isSearching && items.length > 0 && (
            <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Pages</p>
          )}
          {isSearching && items.length > 0 && (
            <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Results</p>
          )}
          {items.map((item, i) => (
            <button
              key={`${item.pageId}-${i}`}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                i === activeIndex ? "bg-muted" : "hover:bg-muted/50"
              )}
              onClick={() => goToPage(item.pageId)}
              onMouseEnter={() => setActiveIndex(i)}
              data-testid={`quick-nav-result-${i}`}
            >
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 text-base">
                {item.icon ? <span>{item.icon}</span> : <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title || "Untitled"}</p>
                {item.preview && (
                  <p className="text-xs text-muted-foreground truncate">{item.preview}</p>
                )}
              </div>
              {item.contentType && item.contentType !== "pageTitle" && (
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                  {TEXT_TYPE_CONTENT_TYPES[item.contentType] || item.contentType}
                </span>
              )}
              {!item.contentType && (
                <Hash className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span><kbd className="bg-muted rounded px-1 font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="bg-muted rounded px-1 font-mono">↵</kbd> open</span>
          <span><kbd className="bg-muted rounded px-1 font-mono">Ctrl+P</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
