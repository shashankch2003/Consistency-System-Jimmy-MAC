import { db } from "../db";
import { eq, and, ne } from "drizzle-orm";
import { connectChannelMembers } from "../../shared/schema";

const unreadMap = new Map<string, number>();

class UnreadService {
  async incrementUnread(channelId: string, senderUserId: string) {
    const members = await db
      .select({ userId: connectChannelMembers.userId })
      .from(connectChannelMembers)
      .where(
        and(
          eq(connectChannelMembers.channelId, channelId),
          ne(connectChannelMembers.userId, senderUserId)
        )
      );
    for (const member of members) {
      const key = `${member.userId}:${channelId}`;
      unreadMap.set(key, (unreadMap.get(key) || 0) + 1);
    }
  }

  clearUnread(channelId: string, userId: string) {
    unreadMap.delete(`${userId}:${channelId}`);
  }

  getUnreadCount(userId: string, channelId: string): number {
    return unreadMap.get(`${userId}:${channelId}`) || 0;
  }

  getAllUnreadCounts(userId: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [key, count] of unreadMap.entries()) {
      if (key.startsWith(`${userId}:`) && count > 0) {
        const channelId = key.slice(userId.length + 1);
        counts[channelId] = count;
      }
    }
    return counts;
  }
}

export const unreadService = new UnreadService();
