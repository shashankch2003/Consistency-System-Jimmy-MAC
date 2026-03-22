import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Input } from "@/components/ui/input";
import { Loader2, X, Zap, Search, Plus, Navigation } from "lucide-react";

const SUGGESTIONS = [
  { icon: Plus, label: "Create a new task" },
  { icon: Navigation, label: "Go to Productivity dashboard" },
  { icon: Search, label: "Search for recent tasks" },
  { icon: Zap, label: "Show team workload" },
];

interface AICommandBarProps {
  open: boolean;
  onClose: () => void;
}

export function AICommandBar({ open, onClose }: AICommandBarProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { workspaceId } = useWorkspace();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResult(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const commandMutation = useMutation({
    mutationFn: (q: string) =>
      apiRequest("POST", "/api/ai/command", {
        query: q,
        context: { workspaceId, currentPath: window.location.pathname },
      }),
    onSuccess: (data: any) => {
      if (data.action === "navigate" && data.payload?.url) {
        setLocation(data.payload.url);
        onClose();
      } else {
        setResult(data.message || "Done!");
      }
    },
    onError: () => setResult("Sorry, I couldn't process that. Try again."),
  });

  const handleSubmit = (q: string) => {
    if (!q.trim()) return;
    commandMutation.mutate(q);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="ai-command-bar-overlay"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Command panel */}
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" data-testid="ai-command-bar">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          {commandMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          ) : (
            <Zap className="h-5 w-5 text-primary shrink-0" />
          )}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setResult(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(query); }}
            placeholder="Ask AI or type a command..."
            className="h-[50px] border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid="input-ai-command"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="button-close-command-bar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Result or suggestions */}
        <div className="p-4">
          {result ? (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">{result}</div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-2">Suggestions</p>
              {SUGGESTIONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 text-sm text-left transition-colors"
                  onClick={() => { setQuery(label); handleSubmit(label); }}
                  data-testid={`suggestion-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-3 text-[10px] text-muted-foreground/60">
          Press Enter to run · Escape to close · Ctrl+K to toggle
        </div>
      </div>
    </div>
  );
}
