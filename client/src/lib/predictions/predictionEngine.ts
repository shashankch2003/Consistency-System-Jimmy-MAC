export interface TaskItem {
  id: number;
  title: string;
  description?: string;
}

export interface TaskSequence {
  id: number;
  precedingTaskPattern: { titleContains?: string; keywords?: string[] };
  followingTaskPattern: { title: string; description?: string; priority?: string; dueOffset?: number };
  occurrences: number;
  confidence: number;
}

export interface Prediction {
  id: string;
  title: string;
  description?: string;
  reasoning: string;
  confidence: number;
  dueOffset?: number;
  triggerTaskId?: number;
}

function titleSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/));
  const wb = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wa].filter((w) => wb.has(w));
  return intersection.length / Math.max(wa.size, wb.size);
}

function isDuplicate(title: string, existing: Prediction[]): boolean {
  return existing.some((p) => titleSimilarity(p.title, title) >= 0.8);
}

export function predictFollowUpTasks(
  task: TaskItem,
  sequences: TaskSequence[]
): Prediction[] {
  const predictions: Prediction[] = [];
  const titleLower = task.title.toLowerCase();

  for (const seq of sequences) {
    if (seq.confidence < 0.7) continue;
    const pattern = seq.precedingTaskPattern;
    const keywords = pattern.keywords ?? [];
    const titleContains = pattern.titleContains?.toLowerCase();

    const matches =
      (titleContains && titleLower.includes(titleContains)) ||
      keywords.some((k) => titleLower.includes(k.toLowerCase()));

    if (!matches) continue;

    const followTitle = seq.followingTaskPattern.title;
    if (isDuplicate(followTitle, predictions)) continue;

    predictions.push({
      id: crypto.randomUUID(),
      title: followTitle,
      description: seq.followingTaskPattern.description,
      reasoning: `Based on ${seq.occurrences} times you followed "${task.title}" with this task`,
      confidence: seq.confidence,
      dueOffset: seq.followingTaskPattern.dueOffset,
      triggerTaskId: task.id,
    });

    if (predictions.length >= 5) break;
  }

  return predictions;
}
