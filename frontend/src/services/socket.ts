import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./api";

// Socket.IO connects straight to the backend (the Vite /api proxy only covers
// HTTP). Override with VITE_WS_URL if the backend lives elsewhere.
const WS_URL = import.meta.env.VITE_WS_URL ?? "http://localhost:4001";

export function createAuthedSocket(): Socket {
  return io(WS_URL, {
    transports: ["websocket"],
    auth: (callback) => callback({ token: getAccessToken() }),
  });
}

// Shared socket singleton so the navbar and pages hear the same events.
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = createAuthedSocket();
  }
  return socket;
}

export function reconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}