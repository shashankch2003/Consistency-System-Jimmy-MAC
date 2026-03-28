import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { X, History, Eye, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface HistoryPanelProps {
  pageId: number;
  onClose: () => void;
  previewVersion: any | null;
  onSetPreviewVersion: (v: any | null) => void;
}

export default function HistoryPanel({ pageId, onClose, previewVersion, onSetPreviewVersion }: HistoryPanelProps) {
  const { toast } = useToast();
  const [restoreTarget, setRestoreTarget] = useState<any | null>(null);

  const { data: versions = [], isLoading } = useQuery<any[]>({
    queryKey: ["pm-page-versions", pageId],
    queryFn: () => fetch(`/api/pm-pages/${pageId}/versions`).then(r => r.json()),
  });

  const fetchVersionDetail = async (id: number) => {
    const res = await fetch(`/api/pm-page-versions/${id}`);
    return res.json();
  };

  const restore = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/pm-page-versions/${id}/restore`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-blocks", pageId] });
      queryClient.invalidateQueries({ queryKey: ["pm-page-versions", pageId] });
      onSetPreviewVersion(null);
      setRestoreTarget(null);
      toast({ title: "Page restored successfully" });
    },
    onError: () => toast({ title: "Failed to restore version", variant: "destructive" }),
  });

  const handlePreview = async (version: any) => {
    const detail = await fetchVersionDetail(version.id);
    onSetPreviewVersion(detail);
  };

  return (
    <div className="w-80 shrink-0 border-l border-border bg-card flex flex-col h-full overflow-hidden" data-testid="history-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Version History</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1 p-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
        {!isLoading && versions.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">No versions saved yet</div>
        )}
        {versions.map((v: any) => (
          <div key={v.id} className="rounded-lg border border-border p-3 hover:border-primary/40 transition-colors space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">v{v.versionNumber}</span>
              <span className="text-[10px] text-muted-foreground">{timeAgo(v.createdAt)}</span>
            </div>
            <p className="text-xs font-medium truncate">{v.title}</p>
            {v.changeDescription && (
              <p className="text-[10px] text-muted-foreground">{v.changeDescription}</p>
            )}
            <div className="flex items-center gap-1.5 pt-0.5">
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] gap-1"
                onClick={() => handlePreview(v)}
              >
                <Eye className="w-3 h-3" /> Preview
              </Button>
              <Button
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={() => setRestoreTarget(v)}
              >
                <RotateCcw className="w-3 h-3" /> Restore
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!restoreTarget} onOpenChange={open => { if (!open) setRestoreTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will restore the page to version {restoreTarget?.versionNumber}. A backup of the current state will be saved automatically. Continue?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>Cancel</Button>
            <Button
              disabled={restore.isPending}
              onClick={() => restore.mutate(restoreTarget.id)}
            >
              {restore.isPending ? "Restoring…" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function VersionPreviewBanner({ version, onRestore, onClose, isRestoring }: { version: any; onRestore: () => void; onClose: () => void; isRestoring: boolean }) {
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-3">
      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
        Viewing v{version.versionNumber} — {version.changeDescription || version.title}
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <Button size="sm" className="h-6 text-[10px]" onClick={onRestore} disabled={isRestoring}>
          <RotateCcw className="w-3 h-3 mr-1" /> Restore
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={onClose}>
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to current
        </Button>
      </div>
    </div>
  );
}
