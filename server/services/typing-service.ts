const typingMap = new Map<string, { userName: string; expiresAt: number }>();
const TYPING_TTL = 5000;

class TypingService {
  setTyping(userId: string, userName: string, channelId: string) {
    const key = `${channelId}:${userId}`;
    typingMap.set(key, { userName, expiresAt: Date.now() + TYPING_TTL });
    setTimeout(() => {
      const entry = typingMap.get(key);
      if (entry && entry.expiresAt <= Date.now()) typingMap.delete(key);
    }, TYPING_TTL + 500);
  }

  clearTyping(userId: string, channelId: string) {
    typingMap.delete(`${channelId}:${userId}`);
  }

  getTypingUsers(channelId: string): Array<{ userId: string; userName: string }> {
    const now = Date.now();
    const users: Array<{ userId: string; userName: string }> = [];
    for (const [key, val] of typingMap.entries()) {
      if (key.startsWith(`${channelId}:`) && val.expiresAt > now) {
        const uid = key.slice(channelId.length + 1);
        users.push({ userId: uid, userName: val.userName });
      }
    }
    return users;
  }
}

export const typingService = new TypingService();
