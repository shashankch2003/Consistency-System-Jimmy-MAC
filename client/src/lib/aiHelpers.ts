import { z } from "zod";

const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  CACHE.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function callOpenAI(prompt: string, retries = 1): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.content ?? json.text ?? "";
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return "";
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function generateStructured<T>(
  prompt: string,
  schema: z.ZodType<T>
): Promise<T> {
  const cacheKey = `structured:${prompt.slice(0, 100)}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const augmented = `${prompt}\n\nRespond with valid JSON only. No markdown, no explanation.`;
  const raw = await callOpenAI(augmented);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  const result = schema.parse(parsed);
  setCache(cacheKey, result);
  return result;
}

export async function generateWithContext(
  prompt: string,
  contextData: Record<string, unknown>
): Promise<string> {
  const contextStr = JSON.stringify(contextData, null, 2);
  const _ = estimateTokens(contextStr);
  const cacheKey = `ctx:${prompt.slice(0, 80)}:${contextStr.slice(0, 80)}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const fullPrompt = `Context:\n${contextStr}\n\nTask: ${prompt}`;
  const result = await callOpenAI(fullPrompt);
  setCache(cacheKey, result);
  return result;
}

export async function batchGenerate(prompts: string[]): Promise<string[]> {
  const MAX_CONCURRENT = 3;
  const results: string[] = new Array(prompts.length).fill("");
  for (let i = 0; i < prompts.length; i += MAX_CONCURRENT) {
    const batch = prompts.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.all(
      batch.map((p) => callOpenAI(p).catch(() => ""))
    );
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
  }
  return results;
}
