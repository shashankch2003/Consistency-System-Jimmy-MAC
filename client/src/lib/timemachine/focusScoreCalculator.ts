import type { SessionAnalysis } from "./sessionAnalyzer";

export function calculateFocusScore(analysis: SessionAnalysis): number {
  const { totalActiveMinutes, longestBlock, contextSwitches } = analysis;
  if (totalActiveMinutes === 0) return 0;

  const longestMinutes = longestBlock?.durationMinutes ?? 0;
  let score = (longestMinutes / totalActiveMinutes) * 100;

  const excessSwitches = Math.max(0, contextSwitches - 10);
  score -= excessSwitches * 5;

  if (totalActiveMinutes >= 45) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}
