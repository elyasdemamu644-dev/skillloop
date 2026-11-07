import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./api";

// Socket.IO connects straight to the backend (the Vite /api proxy only covers
// HTTP). In development that is localhost:4001; in production, when the API is
// reverse-proxied on the same origin, `window.location.origin` is correct.
// Override with VITE_WS_URL when the API lives elsewhere.
const WS_URL =
  import.meta.env.VITE_WS_URL?.replace(/\/+$/, "") ||
  (import.meta.env.DEV ? "http://localhost:4001" : window.location.origin);

export function createAuthedSocket(): Socket {
  return io(WS_URL, {
    transports: ["websocket"],
    // A callback (not a fixed value) so every reconnect picks up the current
    // token, including one minted by a silent refresh.
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

// Drops the current connection and forgets it, so the next getSocket() opens
// a fresh one with whatever token is current. Called on login and logout so an
// authenticated socket never outlives the session that created it.
export function reconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
