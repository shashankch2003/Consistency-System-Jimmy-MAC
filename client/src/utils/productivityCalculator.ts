export interface FactorScore {
  label: string;
  key: string;
  value: number;
  weight: number;
}

export interface ProductivityResult {
  overallScore: number;
  label: string;
  color: string;
  factors: FactorScore[];
  tasksCompleted: number;
  hoursWorked: number;
}

export interface ComparisonResult {
  todayVsYesterday: { current: number; previous: number; delta: number };
  thisWeekVsLast: { current: number; previous: number; delta: number };
  thisMonthVsLast: { current: number; previous: number; delta: number };
  avgCompletionTime: number;
  hoursWorked: number;
}

export interface PerformerResult {
  userId: string;
  score: number;
  label: string;
  tasksCompleted: number;
  hoursWorked: number;
}

const FACTOR_WEIGHTS: FactorScore[] = [
  { label: "Task Completion", key: "taskCompletionRate", value: 0, weight: 25 },
  { label: "Quality", key: "qualityScore", value: 0, weight: 20 },
  { label: "Collaboration", key: "collaborationScore", value: 0, weight: 15 },
  { label: "Estimation Accuracy", key: "estimationAccuracy", value: 0, weight: 10 },
  { label: "Initiative", key: "initiativeScore", value: 0, weight: 10 },
  { label: "Consistency", key: "consistencyScore", value: 0, weight: 10 },
  { label: "Impact", key: "impactWeight", value: 0, weight: 10 },
];

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "High Performer";
  if (score >= 60) return "Steady";
  if (score >= 40) return "Needs Attention";
  return "At Risk";
}

export function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#3b82f6";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

export function getFactorColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#3b82f6";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

export function calculateProductivityScore(snapshot: Record<string, number>): ProductivityResult {
  const factors = FACTOR_WEIGHTS.map((f) => ({
    ...f,
    value: snapshot[f.key] ?? 60,
  }));

  const overallScore = Math.round(
    factors.reduce((sum, f) => sum + (f.value * f.weight) / 100, 0)
  );

  return {
    overallScore,
    label: getScoreLabel(overallScore),
    color: getScoreColor(overallScore),
    factors,
    tasksCompleted: snapshot.tasksCompleted ?? 0,
    hoursWorked: snapshot.hoursWorked ?? 0,
  };
}

export function calculateComparisons(snapshots: any[]): ComparisonResult {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const getWeekAvg = (daysAgo: number) => {
    const start = new Date(Date.now() - daysAgo * 86400000);
    const end = new Date(Date.now() - (daysAgo - 7) * 86400000);
    const snaps = snapshots.filter((s) => {
      const d = new Date(s.date);
      return d >= start && d < end;
    });
    return snaps.length ? Math.round(snaps.reduce((a, s) => a + (s.overallScore ?? 0), 0) / snaps.length) : 0;
  };

  const getMonthAvg = (monthsAgo: number) => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const targetEnd = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
    const snaps = snapshots.filter((s) => {
      const d = new Date(s.date);
      return d >= target && d <= targetEnd;
    });
    return snaps.length ? Math.round(snaps.reduce((a, s) => a + (s.overallScore ?? 0), 0) / snaps.length) : 0;
  };

  const todaySnap = snapshots.find((s) => s.date === today);
  const yesterdaySnap = snapshots.find((s) => s.date === yesterday);

  return {
    todayVsYesterday: {
      current: todaySnap?.overallScore ?? 0,
      previous: yesterdaySnap?.overallScore ?? 0,
      delta: (todaySnap?.overallScore ?? 0) - (yesterdaySnap?.overallScore ?? 0),
    },
    thisWeekVsLast: {
      current: getWeekAvg(0),
      previous: getWeekAvg(7),
      delta: getWeekAvg(0) - getWeekAvg(7),
    },
    thisMonthVsLast: {
      current: getMonthAvg(0),
      previous: getMonthAvg(1),
      delta: getMonthAvg(0) - getMonthAvg(1),
    },
    avgCompletionTime: snapshots.length
      ? Math.round(snapshots.reduce((a, s) => a + (s.hoursWorked ?? 0), 0) / snapshots.length)
      : 0,
    hoursWorked: snapshots
      .filter((s) => s.date === today)
      .reduce((a, s) => a + (s.hoursWorked ?? 0), 0),
  };
}

export function identifyPerformers(snapshots: any[]): { top: PerformerResult[]; needsAttention: PerformerResult[] } {
  const grouped: Record<string, any[]> = {};
  snapshots.forEach((s) => {
    if (!grouped[s.userId]) grouped[s.userId] = [];
    grouped[s.userId].push(s);
  });

  const aggregated: PerformerResult[] = Object.entries(grouped).map(([userId, snaps]) => {
    const avg = Math.round(snaps.reduce((a, s) => a + (s.overallScore ?? 0), 0) / snaps.length);
    return {
      userId,
      score: avg,
      label: getScoreLabel(avg),
      tasksCompleted: snaps.reduce((a, s) => a + (s.tasksCompleted ?? 0), 0),
      hoursWorked: snaps.reduce((a, s) => a + (s.hoursWorked ?? 0), 0),
    };
  });

  const sorted = aggregated.sort((a, b) => b.score - a.score);
  return {
    top: sorted.slice(0, 3),
    needsAttention: sorted.slice(-3).reverse(),
  };
}
