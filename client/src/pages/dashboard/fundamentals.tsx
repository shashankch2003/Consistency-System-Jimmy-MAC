import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FUNDAMENTALS_LIST } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Circle, CheckCircle2, Save, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import RichEditor from "@/components/rich-editor";

type FundamentalEntry = {
  id: number;
  userId: string;
  fundamentalKey: string;
  content: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

function getCompletionStatus(content: string | null | undefined): "empty" | "partial" | "detailed" {
  if (!content || content.trim().length === 0 || content === "<p></p>") return "empty";
  const textLength = content.replace(/<[^>]*>/g, "").trim().length;
  if (textLength < 50) return "partial";
  return "detailed";
}

export default function FundamentalsPage() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const { toast } = useToast();
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const { data: allEntries = [] } = useQuery<FundamentalEntry[]>({ queryKey: ["/api/fundamentals"] });

  const { data: currentEntry, isLoading: isLoadingEntry } = useQuery<FundamentalEntry | null>({
    queryKey: ["/api/fundamentals", selectedKey],
    enabled: !!selectedKey,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, content }: { key: string; content: string }) => {
      const res = await apiRequest("PUT", `/api/fundamentals/${key}`, { content });
      return res.json();
    },
    onSuccess: () => {
      setHasUnsaved(false);
      queryClient.invalidateQueries({ queryKey: ["/api/fundamentals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fundamentals", selectedKey] });
    },
  });

  useEffect(() => {
    if (currentEntry !== undefined && !isLoadingEntry) {
      setEditorContent(currentEntry?.content || "");
      setHasUnsaved(false);
    }
  }, [currentEntry, isLoadingEntry]);

  const handleContentChange = useCallback((content: string) => {
    setEditorContent(content);
    setHasUnsaved(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (selectedKey) {
        saveMutation.mutate({ key: selectedKey, content });
      }
    }, 2000);
  }, [selectedKey]);

  const handleManualSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (selectedKey) {
      saveMutation.mutate({ key: selectedKey, content: editorContent }, {
        onSuccess: () => {
          toast({ title: "Saved", description: "Your notes have been saved." });
        },
      });
    }
  };

  const handleBack = () => {
    if (hasUnsaved && selectedKey) {
      saveMutation.mutate({ key: selectedKey, content: editorContent });
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSelectedKey(null);
    setEditorContent("");
    setHasUnsaved(false);
  };

  const getEntryForKey = (key: string) => allEntries.find(e => e.fundamentalKey === key);
  const completedCount = FUNDAMENTALS_LIST.filter(f => getCompletionStatus(getEntryForKey(f.key)?.content) !== "empty").length;

  const selectedFundamental = FUNDAMENTALS_LIST.find(f => f.key === selectedKey);

  if (selectedKey && selectedFundamental) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-4"
      >
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={handleBack} data-testid="button-back-fundamentals">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {hasUnsaved && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            {saveMutation.isPending && <span className="text-xs text-muted-foreground">Saving...</span>}
            {!hasUnsaved && !saveMutation.isPending && currentEntry?.content && <span className="text-xs text-green-400">Saved</span>}
            <Button variant="outline" className="gap-2" onClick={handleManualSave} disabled={!hasUnsaved || saveMutation.isPending} data-testid="button-save-fundamental">
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-fundamental-title">{selectedFundamental.title}</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-fundamental-description">{selectedFundamental.description}</p>
          {currentEntry?.updatedAt && (
            <p className="text-xs text-muted-foreground/60" data-testid="text-fundamental-updated">
              Last updated: {new Date(currentEntry.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        <div className="bg-card/50 border border-border rounded-xl p-4 min-h-[400px]" data-testid="fundamental-editor">
          {isLoadingEntry ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <RichEditor
              content={editorContent}
              onChange={handleContentChange}
              placeholder="Start writing your thoughts here..."
            />
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="p-4 pt-14 sm:p-8 sm:pt-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-fundamentals-title">
          <Trophy className="w-7 h-7 text-amber-400" />
          Successful Fundamentals
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Deep clarity on business and personal success foundations.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 bg-card/30 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / FUNDAMENTALS_LIST.length) * 100}%` }}
            data-testid="progress-bar"
          />
        </div>
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap" data-testid="text-progress">
          {completedCount}/{FUNDAMENTALS_LIST.length} completed
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2" data-testid="fundamentals-list">
        {FUNDAMENTALS_LIST.map((fundamental, index) => {
          const entry = getEntryForKey(fundamental.key);
          const status = getCompletionStatus(entry?.content);

          return (
            <motion.button
              key={fundamental.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={cn(
                "w-full text-left bg-card/40 hover:bg-card/70 border border-border/50 hover:border-border rounded-xl p-4 flex items-start gap-4 transition-all duration-150 group cursor-pointer",
              )}
              onClick={() => setSelectedKey(fundamental.key)}
              data-testid={`fundamental-card-${fundamental.key}`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-muted-foreground text-sm font-mono shrink-0 mt-0.5">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm group-hover:text-white transition-colors" data-testid={`text-fundamental-name-${fundamental.key}`}>
                    {fundamental.title}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{fundamental.description}</p>
              </div>
              <div className="shrink-0 mt-1">
                {status === "detailed" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" data-testid={`status-detailed-${fundamental.key}`} />
                ) : status === "partial" ? (
                  <Check className="w-5 h-5 text-amber-400" data-testid={`status-partial-${fundamental.key}`} />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/30" data-testid={`status-empty-${fundamental.key}`} />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
