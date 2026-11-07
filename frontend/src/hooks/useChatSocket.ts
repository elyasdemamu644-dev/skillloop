import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { Message } from "@/types/messaging";
import { getSocket } from "@/services/socket";

export interface ChatSocketHandlers {
  onMessageNew: (payload: { conversationId: string; message: Message }) => void;
  onConversationUpdate: (payload: {
    conversationId: string;
    message: Message | null;
    conversation: unknown;
  }) => void;
  onRead: (payload: { conversationId: string }) => void;
}

// Wires the chat events onto the shared socket. Handlers live in a ref so a
// re-render never tears the connection down.
//
// Reconnection is deliberately left to Socket.IO: each attempt re-invokes the
// auth callback in services/socket.ts, which re-reads the in-memory access
// token, so a rotated token is picked up without us forcing a reconnect (which
// could loop when the token is not available yet).
export function useChatSocket(enabled: boolean, handlers: ChatSocketHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return undefined;

    const socket: Socket = getSocket();

    const onMessageNew = (payload: { conversationId: string; message: Message }) =>
      handlersRef.current.onMessageNew(payload);
    const onConversationUpdate = (payload: {
      conversationId: string;
      message: Message | null;
      conversation: unknown;
    }) => handlersRef.current.onConversationUpdate(payload);
    const onRead = (payload: { conversationId: string }) => handlersRef.current.onRead(payload);

    socket.on("message:new", onMessageNew);
    socket.on("conversation:update", onConversationUpdate);
    socket.on("conversation:read", onRead);

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("conversation:update", onConversationUpdate);
      socket.off("conversation:read", onRead);
    };
  }, [enabled]);
}
