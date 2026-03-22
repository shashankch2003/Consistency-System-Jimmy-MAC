export interface AutopilotRule {
  id: number;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  executionMode: "auto" | "suggest" | "confirm";
  isActive: boolean;
  cooldownMinutes: number;
  maxExecutionsPerDay: number;
  timesTriggered: number;
  lastTriggeredAt?: string | null;
}

interface EvaluationContext {
  rule: AutopilotRule;
  event: Record<string, unknown>;
  dailyCounts: Map<number, number>;
  depth?: number;
}

const MAX_CHAIN_DEPTH = 3;

function isCoolingDown(rule: AutopilotRule): boolean {
  if (!rule.lastTriggeredAt || rule.cooldownMinutes <= 0) return false;
  const elapsed =
    (Date.now() - new Date(rule.lastTriggeredAt).getTime()) / 60_000;
  return elapsed < rule.cooldownMinutes;
}

function isAtDailyLimit(
  rule: AutopilotRule,
  dailyCounts: Map<number, number>
): boolean {
  return (dailyCounts.get(rule.id) ?? 0) >= rule.maxExecutionsPerDay;
}

function matchesTrigger(
  rule: AutopilotRule,
  event: Record<string, unknown>
): boolean {
  if (rule.triggerType === "event") {
    const cfg = rule.triggerConfig as { eventType?: string };
    return cfg.eventType === event["eventType"];
  }
  if (rule.triggerType === "task_completed") {
    return event["eventType"] === "task_completed";
  }
  if (rule.triggerType === "time_based") {
    return event["eventType"] === "time_check";
  }
  if (rule.triggerType === "pattern") {
    return event["eventType"] === "pattern_detected";
  }
  return false;
}

export function evaluateTriggers(
  event: Record<string, unknown>,
  rules: AutopilotRule[],
  dailyCounts: Map<number, number> = new Map(),
  depth = 0
): AutopilotRule[] {
  if (depth >= MAX_CHAIN_DEPTH) return [];
  return rules.filter((rule) => {
    if (!rule.isActive) return false;
    if (!matchesTrigger(rule, event)) return false;
    if (isCoolingDown(rule)) return false;
    if (isAtDailyLimit(rule, dailyCounts)) return false;
    return true;
  });
}
