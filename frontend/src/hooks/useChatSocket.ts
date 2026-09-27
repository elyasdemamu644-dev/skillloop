import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { Message } from "@/types/messaging";
import { getSocket, reconnectSocket } from "@/services/socket";

export interface ChatSocketHandlers {
  onMessageNew: (payload: { conversationId: string; message: Message }) => void;
  onConversationUpdate: (payload: {
    conversationId: string;
    message: Message | null;
    conversation: unknown;
  }) => void;
  onRead: (payload: { conversationId: string }) => void;
}

// Connects an authenticated Socket.IO client once and wires the chat events.
// Reconnects on 401-unauthorized (e.g. after token rotation) with a fresh
// access token. Handlers are read from a ref so the connection never resets
// just because a component re-rendered.
export function useChatSocket(enabled: boolean, handlers: ChatSocketHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return undefined;

    const bind = (socket: Socket) => {
      socket.off("message:new");
      socket.off("conversation:update");
      socket.off("conversation:read");

      socket.on("message:new", (payload) => handlersRef.current.onMessageNew(payload));
      socket.on("conversation:update", (payload) => handlersRef.current.onConversationUpdate(payload));
      socket.on("conversation:read", (payload) => handlersRef.current.onRead(payload));
    };

    let socket = getSocket();
    bind(socket);

    const onConnectError = () => {
      reconnectSocket();
      socket = getSocket();
      bind(socket);
    };
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect_error", onConnectError);
      socket.off("message:new");
      socket.off("conversation:update");
      socket.off("conversation:read");
    };
  }, [enabled]);
}