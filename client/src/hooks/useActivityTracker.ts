import { useCallback, useEffect, useRef } from "react";
import { enqueue, startAutoFlush, stopAutoFlush } from "@/lib/eventQueue";
import type { ActivityEvent } from "@/lib/eventQueue";

const SESSION_ID = crypto.randomUUID();
const DAILY_CAP = 1000;
let dailyCount = 0;

function buildEvent(
  eventType: string,
  eventData: Record<string, unknown>
): ActivityEvent {
  const now = new Date();
  return {
    eventType,
    eventData,
    sessionId: SESSION_ID,
    timestamp: now.toISOString(),
    dayOfWeek: now.getDay(),
    hourOfDay: now.getHours(),
  };
}

export function useActivityTracker() {
  const noteEditTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTracking = dailyCount < DAILY_CAP;

  useEffect(() => {
    startAutoFlush();
    return () => stopAutoFlush();
  }, []);

  const trackEvent = useCallback(
    (eventType: string, eventData: Record<string, unknown> = {}) => {
      if (dailyCount >= DAILY_CAP) return;
      if (eventType === "note_edited") {
        if (noteEditTimer.current) clearTimeout(noteEditTimer.current);
        noteEditTimer.current = setTimeout(() => {
          dailyCount++;
          enqueue(buildEvent(eventType, eventData));
        }, 30_000);
        return;
      }
      dailyCount++;
      enqueue(buildEvent(eventType, eventData));
    },
    []
  );

  return { trackEvent, isTracking };
}
