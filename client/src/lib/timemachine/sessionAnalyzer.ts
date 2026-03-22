import type { ActivityEvent } from "@/lib/eventQueue";

export interface ActivityBlock {
  type: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  eventCount: number;
}

export interface SessionAnalysis {
  blocks: ActivityBlock[];
  totalActiveMinutes: number;
  totalIdleMinutes: number;
  contextSwitches: number;
  longestBlock: ActivityBlock | null;
  topActivityType: string;
}

const GAP_THRESHOLD_MS = 5 * 60 * 1000;

export function analyzeSession(events: ActivityEvent[]): SessionAnalysis {
  if (events.length === 0) {
    return {
      blocks: [],
      totalActiveMinutes: 0,
      totalIdleMinutes: 0,
      contextSwitches: 0,
      longestBlock: null,
      topActivityType: "none",
    };
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const blocks: ActivityBlock[] = [];
  let blockStart = new Date(sorted[0].timestamp);
  let blockType = sorted[0].eventType;
  let blockCount = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].timestamp);
    const curr = new Date(sorted[i].timestamp);
    const gap = curr.getTime() - prev.getTime();
    const sameType = sorted[i].eventType === blockType;

    if (gap > GAP_THRESHOLD_MS || !sameType) {
      blocks.push({
        type: blockType,
        startTime: blockStart.toISOString(),
        endTime: prev.toISOString(),
        durationMinutes: Math.round((prev.getTime() - blockStart.getTime()) / 60_000),
        eventCount: blockCount,
      });
      blockStart = curr;
      blockType = sorted[i].eventType;
      blockCount = 1;
    } else {
      blockCount++;
    }
  }
  const lastEvent = new Date(sorted[sorted.length - 1].timestamp);
  blocks.push({
    type: blockType,
    startTime: blockStart.toISOString(),
    endTime: lastEvent.toISOString(),
    durationMinutes: Math.max(1, Math.round((lastEvent.getTime() - blockStart.getTime()) / 60_000)),
    eventCount: blockCount,
  });

  const totalActiveMinutes = blocks.reduce((s, b) => s + b.durationMinutes, 0);
  const contextSwitches = blocks.reduce((s, b, i) => {
    if (i === 0) return s;
    return blocks[i - 1].type !== b.type ? s + 1 : s;
  }, 0);
  const longestBlock = blocks.reduce<ActivityBlock | null>(
    (best, b) => (!best || b.durationMinutes > best.durationMinutes ? b : best),
    null
  );

  const typeCounts: Record<string, number> = {};
  blocks.forEach((b) => { typeCounts[b.type] = (typeCounts[b.type] ?? 0) + b.durationMinutes; });
  const topActivityType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  return {
    blocks,
    totalActiveMinutes,
    totalIdleMinutes: 0,
    contextSwitches,
    longestBlock,
    topActivityType,
  };
}
