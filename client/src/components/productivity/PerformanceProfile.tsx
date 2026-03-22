import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ProductivityScore } from "./ProductivityScore";
import { calculateProductivityScore, getFactorColor } from "@/utils/productivityCalculator";
import { TrendingUp, Star, AlertCircle } from "lucide-react";

interface PerformanceProfileProps {
  userId: string;
  displayName?: string;
}

export function PerformanceProfile({ userId, displayName }: PerformanceProfileProps) {
  const { data: snapshots = [] } = useQuery<any[]>({
    queryKey: ["/api/productivity/snapshots", userId],
    queryFn: () => fetch(`/api/productivity/snapshots?userId=${userId}`).then((r) => r.json()),
    enabled: !!userId,
  });

  const latest = snapshots[0];
  const scoreData = latest ? calculateProductivityScore(latest) : null;

  const trendData = snapshots.slice(0, 30).reverse().map((s, i) => ({
    day: i + 1,
    score: s.overallScore ?? 0,
  }));

  // Heatmap — last 28 days (4 weeks x 7 days)
  const heatmap = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.now() - (27 - i) * 86400000).toISOString().split("T")[0];
    const snap = snapshots.find((s) => s.date === d);
    return { date: d, score: snap?.overallScore ?? 0 };
  });

  const heatColor = (score: number) => {
    if (score === 0) return "bg-muted/30";
    if (score >= 90) return "bg-green-500";
    if (score >= 75) return "bg-blue-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const topFactors = scoreData ? [...scoreData.factors].sort((a, b) => b.value - a.value).slice(0, 3) : [];
  const bottomFactors = scoreData ? [...scoreData.factors].sort((a, b) => a.value - b.value).slice(0, 2) : [];

  const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-4" data-testid="performance-profile">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials(displayName || userId.slice(0, 4))}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{displayName || "Team Member"}</p>
          <p className="text-xs text-muted-foreground">{userId.slice(0, 16)}</p>
        </div>
        {scoreData && (
          <div className="ml-auto text-right">
            <span className="text-2xl font-bold">{scoreData.overallScore}</span>
            <p className="text-xs" style={{ color: scoreData.color }}>{scoreData.label}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Score ring */}
        <Card>
          <CardContent className="pt-4">
            {scoreData ? (
              <ProductivityScore overallScore={scoreData.overallScore} factors={scoreData.factors} />
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {/* 30-day trend */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />30-Day Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Work output stats */}
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Tasks Done</p>
                <p className="text-xl font-bold">{latest?.tasksCompleted ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Hours</p>
                <p className="text-xl font-bold">{latest?.hoursWorked ?? 0}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Strengths */}
      {topFactors.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-yellow-400" />AI Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1">
            {topFactors.map((f) => (
              <div key={f.key} className="flex items-center justify-between text-sm">
                <span>{f.label}</span>
                <span className="font-medium" style={{ color: getFactorColor(f.value) }}>{f.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Growth Opportunities */}
      {bottomFactors.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-orange-400" />Growth Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1">
            {bottomFactors.map((f) => (
              <div key={f.key} className="flex items-center justify-between text-sm">
                <span>{f.label}</span>
                <span className="font-medium" style={{ color: getFactorColor(f.value) }}>{f.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Activity Heatmap */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs">Activity Heatmap (Last 28 Days)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-7 gap-1">
            {heatmap.map((day, i) => (
              <div
                key={i}
                className={`h-5 w-full rounded-sm ${heatColor(day.score)}`}
                title={`${day.date}: ${day.score}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted/30" />None</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-orange-500" />Low</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-yellow-500" />Mid</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500" />High</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
