import { db } from "../db";
import { eq } from "drizzle-orm";
import { connectUserPresence } from "../../shared/schema";

const presenceMap = new Map<string, { status: string; workspaceId: number | null }>();

class PresenceService {
  async setOnline(userId: string, workspaceId: string) {
    const wsId = parseInt(workspaceId) || null;
    presenceMap.set(userId, { status: "online", workspaceId: wsId });
    await db.insert(connectUserPresence).values({
      userId,
      workspaceId: wsId,
      status: "online",
      lastSeenAt: new Date(),
    }).onConflictDoUpdate({
      target: connectUserPresence.userId,
      set: { status: "online", lastSeenAt: new Date(), updatedAt: new Date() },
    });
  }

  async setOffline(userId: string) {
    const entry = presenceMap.get(userId);
    presenceMap.delete(userId);
    if (entry !== undefined) {
      await db.update(connectUserPresence)
        .set({ status: "offline", lastSeenAt: new Date(), updatedAt: new Date() })
        .where(eq(connectUserPresence.userId, userId));
    }
  }

  async setStatus(userId: string, status: string, customText?: string) {
    const entry = presenceMap.get(userId);
    if (entry) presenceMap.set(userId, { ...entry, status });
    return db.insert(connectUserPresence).values({
      userId,
      workspaceId: entry?.workspaceId ?? null,
      status,
      customText,
      lastSeenAt: new Date(),
    }).onConflictDoUpdate({
      target: connectUserPresence.userId,
      set: { status, customText, lastSeenAt: new Date(), updatedAt: new Date() },
    }).returning().then(r => r[0]);
  }

  getStatus(userId: string): string {
    return presenceMap.get(userId)?.status || "offline";
  }

  getAll(): Map<string, { status: string; workspaceId: number | null }> {
    return presenceMap;
  }
}

export const presenceService = new PresenceService();
