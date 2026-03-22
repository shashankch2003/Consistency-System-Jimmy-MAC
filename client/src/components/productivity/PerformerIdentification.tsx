import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, AlertTriangle, ShieldCheck } from "lucide-react";
import { getScoreColor, getScoreLabel } from "@/utils/productivityCalculator";

interface Performer {
  userId: string;
  score: number;
  label: string;
  tasksCompleted: number;
  hoursWorked: number;
}

export function PerformerIdentification() {
  const { workspaceId } = useWorkspace();

  const { data } = useQuery<{ top: Performer[]; needsAttention: Performer[] }>({
    queryKey: ["/api/productivity/performers", workspaceId],
    queryFn: () => fetch(`/api/productivity/performers?workspaceId=${workspaceId}`).then((r) => r.json()),
    enabled: !!workspaceId,
  });

  const top = data?.top ?? [];
  const needsAttention = data?.needsAttention ?? [];

  const initials = (userId: string) => userId.slice(0, 2).toUpperCase();

  const GOLD_COLORS = ["#fbbf24", "#94a3b8", "#f97316"];

  return (
    <div className="space-y-4" data-testid="performer-identification">
      <div className="grid grid-cols-2 gap-6">
        {/* Top performers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-semibold">Top Performers</h3>
          </div>
          <div className="space-y-3">
            {top.length > 0 ? top.map((p, i) => (
              <Card key={p.userId} className="border-border" data-testid={`top-performer-${i}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="font-semibold text-sm bg-yellow-500/10">
                        {initials(p.userId)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: GOLD_COLORS[i] + "33", color: GOLD_COLORS[i], border: `1px solid ${GOLD_COLORS[i]}` }}
                    >
                      #{i + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.userId.slice(0, 12)}</p>
                    <p className="text-xs" style={{ color: getScoreColor(p.score) }}>{p.label}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold" style={{ color: GOLD_COLORS[i] }}>{p.score}</span>
                    <p className="text-[10px] text-muted-foreground">{p.tasksCompleted} tasks</p>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Needs attention */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-semibold">Needs Attention</h3>
          </div>
          <div className="space-y-3">
            {needsAttention.length > 0 ? needsAttention.map((p, i) => (
              <Card key={p.userId} className="border-orange-500/20" data-testid={`attention-${i}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="font-semibold text-sm bg-orange-500/10 text-orange-400">
                      {initials(p.userId)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.userId.slice(0, 12)}</p>
                    <p className="text-xs" style={{ color: getScoreColor(p.score) }}>{p.label}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-orange-400">{p.score}</span>
                    <p className="text-[10px] text-muted-foreground">{p.hoursWorked}h worked</p>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                No data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 p-3 bg-muted/20 rounded-lg border border-border">
        <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Performance data is used for team improvement only. Scores are based on productivity metrics and are not a reflection of individual worth.
          This information is visible only to workspace admins and managers.
        </p>
      </div>
    </div>
  );
}
