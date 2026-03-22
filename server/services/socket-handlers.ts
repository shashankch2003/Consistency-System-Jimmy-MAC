import { Server as SocketIOServer, Socket } from "socket.io";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  connectMessages,
  connectChannels,
  connectChannelMembers,
  connectConversationMembers,
  connectMessageReactions,
} from "../../shared/schema";
import { presenceService } from "./presence-service";
import { typingService } from "./typing-service";
import { unreadService } from "./unread-service";

export function registerSocketHandlers(io: SocketIOServer, socket: Socket) {
  const userId = socket.data.userId as string;
  const userName = socket.data.userName as string;

  socket.join(`user:${userId}`);

  socket.on("join_workspace", async (data: { workspaceId?: string }) => {
    if (data.workspaceId) {
      socket.join(`workspace:${data.workspaceId}`);
    }
    try {
      await presenceService.setOnline(userId, data.workspaceId || "0");
      io.to(`workspace:${data.workspaceId || "0"}`).emit("presence_update", {
        userId,
        status: "online",
        lastSeenAt: new Date().toISOString(),
      });

      const memberships = await db
        .select({ channelId: connectChannelMembers.channelId })
        .from(connectChannelMembers)
        .where(eq(connectChannelMembers.userId, userId));
      for (const m of memberships) {
        socket.join(`channel:${m.channelId}`);
      }

      const convos = await db
        .select({ conversationId: connectConversationMembers.conversationId })
        .from(connectConversationMembers)
        .where(eq(connectConversationMembers.userId, userId));
      for (const c of convos) {
        socket.join(`conversation:${c.conversationId}`);
      }
    } catch (err) {
      socket.emit("error", { message: "Failed to join workspace" });
    }
  });

  socket.on("disconnect", async () => {
    setTimeout(async () => {
      try {
        const currentSockets = await io.in(`user:${userId}`).fetchSockets();
        if (currentSockets.length === 0) {
          await presenceService.setOffline(userId);
        }
      } catch (err) {
      }
    }, 30000);
  });

  socket.on(
    "message_send",
    async (data: {
      channelId: string;
      content: string;
      contentHtml?: string;
      threadParentId?: string;
      mentionedUserIds?: string[];
      tempId: string;
    }) => {
      try {
        const [membership] = await db
          .select()
          .from(connectChannelMembers)
          .where(
            and(
              eq(connectChannelMembers.channelId, data.channelId),
              eq(connectChannelMembers.userId, userId)
            )
          );
        if (!membership) {
          socket.emit("message_error", {
            tempId: data.tempId,
            error: "Not a member of this channel",
          });
          return;
        }

        const [message] = await db
          .insert(connectMessages)
          .values({
            channelId: data.channelId,
            authorId: userId,
            content: data.content,
            contentHtml: data.contentHtml,
            threadParentId: data.threadParentId,
            mentionedUserIds: data.mentionedUserIds || [],
          })
          .returning();

        await db
          .update(connectChannels)
          .set({
            messageCount: sql`${connectChannels.messageCount} + 1`,
            lastMessageAt: new Date(),
            lastMessagePreview: data.content.slice(0, 200),
            updatedAt: new Date(),
          })
          .where(eq(connectChannels.id, data.channelId));

        if (data.threadParentId) {
          await db
            .update(connectMessages)
            .set({
              threadReplyCount: sql`${connectMessages.threadReplyCount} + 1`,
              threadLastReplyAt: new Date(),
              threadParticipantIds: sql`array_append(${connectMessages.threadParticipantIds}, ${userId})`,
            })
            .where(eq(connectMessages.id, data.threadParentId));
        }

        io.to(`channel:${data.channelId}`).emit("message_new", {
          ...message,
          tempId: data.tempId,
          authorName: userName,
        });

        await unreadService.incrementUnread(data.channelId, userId);
      } catch (error: any) {
        socket.emit("message_error", {
          tempId: data.tempId,
          error: error.message,
        });
      }
    }
  );

  socket.on(
    "message_edit",
    async (data: {
      messageId: string;
      content: string;
      contentHtml?: string;
    }) => {
      try {
        const [msg] = await db
          .select()
          .from(connectMessages)
          .where(eq(connectMessages.id, data.messageId));
        if (!msg || msg.authorId !== userId) {
          socket.emit("error", { message: "Cannot edit this message" });
          return;
        }
        const [updated] = await db
          .update(connectMessages)
          .set({
            content: data.content,
            contentHtml: data.contentHtml,
            isEdited: true,
            editedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(connectMessages.id, data.messageId))
          .returning();
        io.to(`channel:${msg.channelId}`).emit("message_updated", updated);
      } catch (error: any) {
        socket.emit("error", { message: error.message });
      }
    }
  );

  socket.on("message_delete", async (data: { messageId: string }) => {
    try {
      const [msg] = await db
        .select()
        .from(connectMessages)
        .where(eq(connectMessages.id, data.messageId));
      if (!msg) return;
      const [membership] = await db
        .select()
        .from(connectChannelMembers)
        .where(
          and(
            eq(connectChannelMembers.channelId, msg.channelId),
            eq(connectChannelMembers.userId, userId)
          )
        );
      if (
        msg.authorId !== userId &&
        !["owner", "admin"].includes(membership?.role || "")
      ) {
        socket.emit("error", { message: "Cannot delete this message" });
        return;
      }
      await db
        .update(connectMessages)
        .set({ deletedAt: new Date() })
        .where(eq(connectMessages.id, data.messageId));
      io.to(`channel:${msg.channelId}`).emit("message_deleted", {
        messageId: data.messageId,
        channelId: msg.channelId,
      });
    } catch (error: any) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("typing_start", (data: { channelId: string }) => {
    typingService.setTyping(userId, userName, data.channelId);
    socket.to(`channel:${data.channelId}`).emit("typing", {
      channelId: data.channelId,
      userId,
      userName,
      isTyping: true,
    });
  });

  socket.on("typing_stop", (data: { channelId: string }) => {
    typingService.clearTyping(userId, data.channelId);
    socket.to(`channel:${data.channelId}`).emit("typing", {
      channelId: data.channelId,
      userId,
      isTyping: false,
    });
  });

  socket.on(
    "mark_read",
    async (data: { channelId: string; messageId: string }) => {
      try {
        await db
          .update(connectChannelMembers)
          .set({
            lastReadAt: new Date(),
            lastReadMessageId: data.messageId,
          })
          .where(
            and(
              eq(connectChannelMembers.channelId, data.channelId),
              eq(connectChannelMembers.userId, userId)
            )
          );
        unreadService.clearUnread(data.channelId, userId);
        socket.emit("unread_updated", {
          channelId: data.channelId,
          unreadCount: 0,
        });
      } catch (error: any) {
        socket.emit("error", { message: error.message });
      }
    }
  );

  socket.on(
    "reaction_add",
    async (data: { messageId: string; emoji: string; channelId: string }) => {
      try {
        await db.insert(connectMessageReactions).values({
          messageId: data.messageId,
          userId,
          emoji: data.emoji,
        }).onConflictDoNothing();
        io.to(`channel:${data.channelId}`).emit("reaction_updated", {
          messageId: data.messageId,
          userId,
          emoji: data.emoji,
          action: "add",
        });
      } catch (error: any) {
        socket.emit("error", { message: error.message });
      }
    }
  );

  socket.on(
    "reaction_remove",
    async (data: { messageId: string; emoji: string; channelId: string }) => {
      try {
        await db
          .delete(connectMessageReactions)
          .where(
            and(
              eq(connectMessageReactions.messageId, data.messageId),
              eq(connectMessageReactions.userId, userId),
              eq(connectMessageReactions.emoji, data.emoji)
            )
          );
        io.to(`channel:${data.channelId}`).emit("reaction_updated", {
          messageId: data.messageId,
          userId,
          emoji: data.emoji,
          action: "remove",
        });
      } catch (error: any) {
        socket.emit("error", { message: error.message });
      }
    }
  );
}
