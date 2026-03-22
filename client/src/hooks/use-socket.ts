import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

let globalSocket: Socket | null = null;

export function useSocket(userId?: string, userName?: string, workspaceId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      return;
    }

    const socket = io(window.location.origin, {
      path: "/api/socket",
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: {
        userId,
        userName,
      },
    });

    socket.on("connect", () => {
      socket.emit("join_workspace", { workspaceId });
    });

    socket.on("message_new", (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", data.channelId] });
      queryClient.invalidateQueries({ queryKey: ["/api/connect/channels"] });
    });

    socket.on("message_updated", (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", data.channelId] });
    });

    socket.on("message_deleted", (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", data.channelId] });
    });

    socket.on("disconnect", () => {});

    globalSocket = socket;
    socketRef.current = socket;

    return () => {};
  }, [userId, userName, workspaceId, queryClient]);

  const sendMessage = useCallback((data: any) => {
    socketRef.current?.emit("message_send", data);
  }, []);

  const editMessage = useCallback((data: any) => {
    socketRef.current?.emit("message_edit", data);
  }, []);

  const deleteMessage = useCallback((data: any) => {
    socketRef.current?.emit("message_delete", data);
  }, []);

  const startTyping = useCallback((channelId: string) => {
    socketRef.current?.emit("typing_start", { channelId });
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    socketRef.current?.emit("typing_stop", { channelId });
  }, []);

  const markRead = useCallback((channelId: string, messageId: string) => {
    socketRef.current?.emit("mark_read", { channelId, messageId });
  }, []);

  const addReaction = useCallback((messageId: string, emoji: string, channelId: string) => {
    socketRef.current?.emit("reaction_add", { messageId, emoji, channelId });
  }, []);

  const removeReaction = useCallback((messageId: string, emoji: string, channelId: string) => {
    socketRef.current?.emit("reaction_remove", { messageId, emoji, channelId });
  }, []);

  const getSocket = useCallback(() => socketRef.current, []);

  return {
    socket: socketRef.current,
    sendMessage,
    editMessage,
    deleteMessage,
    startTyping,
    stopTyping,
    markRead,
    addReaction,
    removeReaction,
    getSocket,
  };
}
