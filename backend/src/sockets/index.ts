import type { Server } from "socket.io";
import { verifyAccessToken } from "../services/token.service";
import { registerChatHandlers } from "./chat";

let socketServer: Server | null = null;

// Names the room a user's sockets join, so we can emit to them by userId.
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

// Broadcast a payload to every online socket belonging to a user. No-op when
// the socket server hasn't been started (e.g. during tests).
export function pushToUser(userId: string, event: string, payload: unknown): void {
  if (!socketServer) return;
  socketServer.to(userRoom(userId)).emit(event, payload);
}

export function setupSocketServer(io: Server): void {
  socketServer = io;

  // Authenticate every connection with the same Bearer access token the REST
  // API uses. Once inside, each socket joins user:<id> for targeted delivery.
  io.use((socket, next) => {
    const auth = socket.handshake.auth as { token?: string } | undefined;
    try {
      const payload = verifyAccessToken(auth?.token ?? "");
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId: string = socket.data.userId;
    socket.join(userRoom(userId));
    console.log(`🔌 Socket connected: ${socket.id} (user ${userId})`);

    registerChatHandlers(io, socket, userId);

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}