import type { Server, Socket } from "socket.io";
import { ApiError } from "../middleware/error.middleware";
import { getConversationForUser, getOrCreateConversation, markConversationRead, sendMessage } from "../services/messaging.service";
import { userRoom } from "./index";

interface Ack {
  ok: boolean;
  error?: string;
  data?: unknown;
}

function ackOk(ack: ((response: Ack) => void) | undefined, data?: unknown): void {
  ack?.({ ok: true, data });
}

function ackError(ack: ((response: Ack) => void) | undefined, err: unknown): void {
  const message = err instanceof ApiError ? err.message : "Something went wrong";
  ack?.({ ok: false, error: message });
}

// Real-time messaging: start a conversation (with optional first message),
// send messages, and mark conversations read. Every message is persisted and
// mirrored over REST (/api/conversations) for offline/retry scenarios.
export function registerChatHandlers(io: Server, socket: Socket, userId: string): void {
  socket.on("conversation:start", async (payload: unknown, ack?: (response: Ack) => void) => {
    try {
      const input = payload as { participantId?: string; exchangeId?: string; body?: string };
      if (!input.participantId) throw new ApiError(422, "participantId is required");
      const conversation = await getOrCreateConversation(userId, {
        participantId: input.participantId,
        exchangeId: input.exchangeId,
      });

      let message: unknown = null;
      if (input.body) {
        message = await sendMessage(userId, conversation.id, { body: input.body });
        const thread = await getConversationForUser(userId, conversation.id);
        io.to(userRoom(userId))
          .to(userRoom(input.participantId))
          .emit("conversation:update", { conversationId: conversation.id, conversation: thread, message });
      }
      ackOk(ack, { conversationId: conversation.id, message });
    } catch (err) {
      ackError(ack, err);
    }
  });

  socket.on("message:send", async (payload: unknown, ack?: (response: Ack) => void) => {
    try {
      const input = payload as { conversationId?: string; body?: string };
      if (!input.conversationId || !input.body) throw new ApiError(422, "conversationId and body are required");
      const message = await sendMessage(userId, input.conversationId, { body: input.body });
      io.to(userRoom(userId)).emit("message:new", { conversationId: input.conversationId, message });
      ackOk(ack, message);

      // Tell the other participant(s) of the conversation about the new message.
      const conversation = await getConversationForUser(userId, input.conversationId);
      io.to(userRoom(conversation.otherUser.id)).emit("message:new", {
        conversationId: input.conversationId,
        message,
      });
      io.to(userRoom(conversation.otherUser.id)).emit("conversation:update", {
        conversationId: input.conversationId,
        conversation,
      });
    } catch (err) {
      ackError(ack, err);
    }
  });

  socket.on("conversation:read", async (payload: unknown, ack?: (response: Ack) => void) => {
    try {
      const input = payload as { conversationId?: string };
      if (!input.conversationId) throw new ApiError(422, "conversationId is required");
      const result = await markConversationRead(userId, input.conversationId);
      ackOk(ack, result);
    } catch (err) {
      ackError(ack, err);
    }
  });
}