import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./socket-handlers";

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export async function initSocketServer(httpServer: any): Promise<SocketIOServer> {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "*",
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth?.userId;
      const userName = socket.handshake.auth?.userName;
      if (!userId) {
        return next(new Error("Unauthorized - no userId"));
      }
      socket.data.userId = userId;
      socket.data.userName = userName || "Unknown";
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    registerSocketHandlers(io!, socket);
  });

  return io;
}
