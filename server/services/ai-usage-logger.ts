// server/services/ai-usage-logger.ts
// Logs all AI usage for analytics. Called after every AI operation.

import { db } from "../db";
import { aiUsageLogs } from "../../shared/schema";

interface LogAiUsageParams {
  userId: string;
  feature: string;
  action: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs?: number;
  success?: boolean;
  error?: string;
}

export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  try {
    await db.insert(aiUsageLogs).values({
      userId: params.userId,
      feature: params.feature,
      action: params.action,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      durationMs: params.durationMs,
      success: params.success ?? true,
      error: params.error,
    });
  } catch (err) {
    // Never throw from logging — don't break the feature because logging failed
  }
}
