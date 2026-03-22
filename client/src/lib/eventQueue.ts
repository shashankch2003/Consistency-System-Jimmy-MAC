export interface ActivityEvent {
  eventType: string;
  eventData: Record<string, unknown>;
  sessionId: string;
  timestamp: string;
  dayOfWeek: number;
  hourOfDay: number;
}

const queue: ActivityEvent[] = [];
const MAX_QUEUE = 200;
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function enqueue(event: ActivityEvent): void {
  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push(event);
}

export function getQueue(): ActivityEvent[] {
  return [...queue];
}

export async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    await fetch("/api/autopilot/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    batch.forEach((e) => queue.unshift(e));
  }
}

export function startAutoFlush(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flush, 10_000);
  window.addEventListener("beforeunload", flush);
}

export function stopAutoFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  window.removeEventListener("beforeunload", flush);
}
