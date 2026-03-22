import type { TaskItem } from "./predictionEngine";
import type { TaskSequence } from "./predictionEngine";

interface CompletedTask extends TaskItem {
  completedAt: string;
}

function titleSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/));
  const wb = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wa].filter((w) => wb.has(w));
  return intersection.length / Math.max(wa.size, wb.size, 1);
}

export function learnSequences(tasks30d: CompletedTask[]): TaskSequence[] {
  const sorted = [...tasks30d].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  const pairCounts: Map<string, { count: number; aTitle: string; bTitle: string }> = new Map();

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const aTime = new Date(a.completedAt).getTime();
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      const bTime = new Date(b.completedAt).getTime();
      const gapH = (bTime - aTime) / 3_600_000;
      if (gapH > 24) break;
      if (titleSimilarity(a.title, b.title) > 0.8) continue;
      const key = `${a.title.toLowerCase().slice(0, 40)}||${b.title.toLowerCase().slice(0, 40)}`;
      const existing = pairCounts.get(key) ?? { count: 0, aTitle: a.title, bTitle: b.title };
      pairCounts.set(key, { ...existing, count: existing.count + 1 });
    }
  }

  const sequences: TaskSequence[] = [];
  let id = 1;
  pairCounts.forEach(({ count, aTitle, bTitle }) => {
    if (count < 3) return;
    const confidence = Math.min(0.5 + count * 0.05, 0.98);
    if (confidence < 0.6) return;
    const words = aTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    sequences.push({
      id: id++,
      precedingTaskPattern: { titleContains: aTitle.slice(0, 20), keywords: words.slice(0, 3) },
      followingTaskPattern: { title: bTitle, dueOffset: 1 },
      occurrences: count,
      confidence,
    });
  });
  return sequences;
}

export function predictSprintTasks(recentSequences: TaskSequence[]): string[] {
  return recentSequences
    .filter((s) => s.confidence >= 0.7)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map((s) => s.followingTaskPattern.title);
}
