// server/services/knowledge-indexer.ts
// Indexes notes, tasks, and messages for AI knowledge search (Feature 2)

import { db } from "../db";
import { knowledgeIndex, notes, tasks } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { getEmbedding, getEmbeddingBatch } from "./embeddings";

// ============================================================
// INDEX A SINGLE NOTE
// ============================================================
export async function indexNote(noteId: number, userId: string): Promise<void> {
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
  if (!note) return;

  const content = [note.title, note.content].filter(Boolean).join("\n");
  if (!content.trim()) return;

  const embedding = await getEmbedding(content.slice(0, 8000));
  const chunks = content.length > 2000 ? chunkText(content, 500) : null;

  await db
    .insert(knowledgeIndex)
    .values({
      userId,
      sourceType: "page",
      sourceId: String(noteId),
      title: note.title || "Untitled",
      content,
      contentChunks: chunks,
      embedding,
      metadata: {
        authorId: userId,
        createdDate: note.createdAt,
      },
      accessLevel: "workspace",
      isStale: false,
    })
    .onConflictDoUpdate({
      target: knowledgeIndex.sourceId,
      set: {
        title: sql`EXCLUDED.title`,
        content: sql`EXCLUDED.content`,
        contentChunks: sql`EXCLUDED.content_chunks`,
        embedding: sql`EXCLUDED.embedding`,
        metadata: sql`EXCLUDED.metadata`,
        lastIndexedAt: sql`NOW()`,
        isStale: false,
        updatedAt: sql`NOW()`,
      },
    });
}

// ============================================================
// INDEX A SINGLE TASK
// ============================================================
export async function indexTask(taskId: number, userId: string): Promise<void> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) return;

  const content = [task.title, task.description].filter(Boolean).join("\n");
  const embedding = await getEmbedding(content.slice(0, 8000));

  await db
    .insert(knowledgeIndex)
    .values({
      userId,
      sourceType: "task",
      sourceId: String(taskId),
      title: task.title,
      content,
      embedding,
      metadata: {
        authorId: task.userId,
        createdDate: task.date,
      },
      accessLevel: "workspace",
      isStale: false,
    })
    .onConflictDoUpdate({
      target: knowledgeIndex.sourceId,
      set: {
        title: sql`EXCLUDED.title`,
        content: sql`EXCLUDED.content`,
        embedding: sql`EXCLUDED.embedding`,
        metadata: sql`EXCLUDED.metadata`,
        lastIndexedAt: sql`NOW()`,
        isStale: false,
        updatedAt: sql`NOW()`,
      },
    });
}

// ============================================================
// INDEX MESSAGES IN BATCH
// ============================================================
export async function indexMessageBatch(
  messages: {
    id: string;
    content: string;
    channelId: string;
    authorId: string;
    authorName: string;
    createdAt: Date;
  }[],
  userId: string
): Promise<void> {
  if (messages.length === 0) return;

  const texts = messages.map((m) => m.content);
  const embeddings = await getEmbeddingBatch(texts);

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    await db
      .insert(knowledgeIndex)
      .values({
        userId,
        sourceType: "message",
        sourceId: msg.id,
        title: msg.content.slice(0, 100),
        content: msg.content,
        embedding: embeddings[i],
        metadata: {
          authorId: msg.authorId,
          authorName: msg.authorName,
          channelId: msg.channelId,
          createdDate: msg.createdAt,
        },
        accessLevel: "channel_members",
        isStale: false,
      })
      .onConflictDoNothing();
  }
}

// ============================================================
// MARK ALL AS STALE (for full reindex)
// ============================================================
export async function markAllStale(userId: string): Promise<void> {
  await db
    .update(knowledgeIndex)
    .set({ isStale: true, updatedAt: new Date() })
    .where(eq(knowledgeIndex.userId, userId));
}

// ============================================================
// SEMANTIC SEARCH — text-based cosine similarity
// ============================================================
export async function searchKnowledge(
  query: string,
  userId: string,
  limit = 10
): Promise<Array<{ sourceType: string; sourceId: string; title: string; content: string; score: number }>> {
  const queryEmbedding = await getEmbedding(query);

  const allItems = await db
    .select()
    .from(knowledgeIndex)
    .where(eq(knowledgeIndex.userId, userId));

  const { cosineSimilarity } = await import("./embeddings");

  const scored = allItems
    .filter((item) => item.embedding)
    .map((item) => ({
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      title: item.title,
      content: item.content.slice(0, 500),
      score: cosineSimilarity(queryEmbedding, item.embedding as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function chunkText(text: string, chunkSize: number): { chunkIndex: number; text: string }[] {
  const chunks: { chunkIndex: number; text: string }[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";
  let index = 0;

  for (const sentence of sentences) {
    if (current.length + sentence.length > chunkSize && current.length > 0) {
      chunks.push({ chunkIndex: index++, text: current.trim() });
      current = "";
    }
    current += sentence + " ";
  }

  if (current.trim()) {
    chunks.push({ chunkIndex: index, text: current.trim() });
  }

  return chunks;
}
