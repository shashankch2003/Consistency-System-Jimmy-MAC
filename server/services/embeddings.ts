// server/services/embeddings.ts
// Embedding generation with in-memory Map caching (NO Redis)

import { aiService } from "./ai-service";
import crypto from "crypto";

const CACHE_TTL = 86400 * 1000; // 24 hours in ms
const CACHE_PREFIX = "emb_";

// In-memory Map cache
const embeddingCache = new Map<string, { embedding: number[]; expiresAt: number }>();

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function pruneExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of embeddingCache.entries()) {
    if (value.expiresAt < now) {
      embeddingCache.delete(key);
    }
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  const cacheKey = `${CACHE_PREFIX}${hashText(text)}`;

  const cached = embeddingCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.embedding;
  }

  const result = await aiService.generateEmbedding(text);
  embeddingCache.set(cacheKey, {
    embedding: result.embedding,
    expiresAt: Date.now() + CACHE_TTL,
  });

  // Prune cache periodically (every 100 insertions)
  if (embeddingCache.size % 100 === 0) {
    pruneExpiredCache();
  }

  return result.embedding;
}

export async function getEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const cacheKey = `${CACHE_PREFIX}${hashText(texts[i])}`;
    const cached = embeddingCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      results[i] = cached.embedding;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(texts[i]);
    }
  }

  if (uncachedTexts.length > 0) {
    for (let batch = 0; batch < uncachedTexts.length; batch += 20) {
      const batchTexts = uncachedTexts.slice(batch, batch + 20);
      const batchResults = await aiService.generateEmbeddingBatch(batchTexts);

      for (let j = 0; j < batchResults.length; j++) {
        const originalIndex = uncachedIndices[batch + j];
        results[originalIndex] = batchResults[j].embedding;

        const cacheKey = `${CACHE_PREFIX}${hashText(batchTexts[j])}`;
        embeddingCache.set(cacheKey, {
          embedding: batchResults[j].embedding,
          expiresAt: Date.now() + CACHE_TTL,
        });
      }
    }
  }

  return results as number[][];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
