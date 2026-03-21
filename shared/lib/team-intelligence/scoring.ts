import { ScoreBreakdown } from "./types";

function stdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function calculateTaskCompletionRate(completed: number, assigned: number): number {
  if (assigned === 0) return 0;
  return Math.min(100, Math.round((completed / assigned) * 100));
}

export function calculateFocusScore(
  deepWorkMin: number,
  avgSessionMin: number,
  contextSwitches: number,
  targetDeepWorkMin: number = 240
): number {
  const raw = (deepWorkMin / targetDeepWorkMin) * 60
    + (avgSessionMin / 45) * 20
    + Math.max(0, (1 - contextSwitches / 20) * 20);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function calculateConsistencyScore(dailyScores: number[]): number {
  if (dailyScores.length < 3) return 50;
  const mean = dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length;
  if (mean === 0) return 0;
  const sd = stdDev(dailyScores);
  return Math.max(0, Math.min(100, Math.round(100 - (sd / mean * 100))));
}

export function calculateExecutionScore(
  deadlineAdherence: number,
  estimateAccuracy: number,
  firstPassQuality: number
): number {
  const raw = deadlineAdherence * 0.4 + estimateAccuracy * 0.3 + firstPassQuality * 0.3;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function calculateCollaborationScore(
  responseTimeScore: number,
  reviewActivity: number,
  handoffScore: number
): number {
  return Math.min(100, Math.round(responseTimeScore * 0.4 + reviewActivity * 0.3 + handoffScore * 0.3));
}

export function calculateProductivityScore(
  components: Omit<ScoreBreakdown, 'total'>
): ScoreBreakdown {
  const raw = components.taskCompletion * 0.25
    + components.focus * 0.20
    + components.deadlineAdherence * 0.15
    + components.consistency * 0.15
    + components.execution * 0.15
    + components.collaboration * 0.10;
  const total = Math.max(0, Math.min(100, Math.round(raw)));
  return { ...components, total };
}

export function calculateRiskScore(
  overdueCount: number,
  trendSlope: number,
  workloadRatio: number,
  engagementLevel: number
): number {
  const overdueNorm = Math.min(100, overdueCount * 20);
  const declineNorm = trendSlope < 0 ? Math.min(100, Math.abs(trendSlope) * 10) : 0;
  const overloadNorm = workloadRatio > 1 ? Math.min(100, (workloadRatio - 1) * 200) : 0;
  const disengageNorm = Math.max(0, 100 - engagementLevel);
  const raw = overdueNorm * 0.30
    + declineNorm * 0.25
    + overloadNorm * 0.20
    + disengageNorm * 0.20
    + (overdueNorm * 0.5) * 0.10;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function calculateTeamHealthScore(
  avgMemberScore: number,
  workloadVariance: number,
  velocityTrend: number,
  deadlineRate: number
): number {
  const workloadBalanceScore = Math.max(0, 100 - workloadVariance * 5);
  const velocityScore = Math.min(100, Math.max(0, 50 + velocityTrend * 10));
  const raw = avgMemberScore * 0.25
    + workloadBalanceScore * 0.20
    + velocityScore * 0.20
    + deadlineRate * 0.15
    + avgMemberScore * 0.10
    + workloadBalanceScore * 0.10;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function getRiskLevel(score: number): import("./types").RiskLevel {
  if (score > 70) return 'at_risk';
  if (score > 40) return 'needs_attention';
  return 'on_track';
}

export function getTrendDirection(
  current: number,
  previous: number,
  threshold: number = 2
): import("./types").TrendDirection {
  if (current > previous + threshold) return 'up';
  if (current < previous - threshold) return 'down';
  return 'stable';
}
