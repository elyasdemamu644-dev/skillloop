import { api } from "./api";
import type { Pagination } from "@/types/skill";
import type { Conversation, CreateConversationInput, Message, SendMessageInput } from "@/types/messaging";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function fetchMyConversations(): Promise<Conversation[]> {
  const { data } = await api.get<ApiEnvelope<Conversation[]>>("/conversations");
  return data.data;
}

export async function getOrCreateConversation(input: CreateConversationInput): Promise<{ id: string }> {
  const { data } = await api.post<ApiEnvelope<{ id: string }>>("/conversations", input);
  return data.data;
}

export async function fetchConversation(id: string): Promise<Conversation> {
  const { data } = await api.get<ApiEnvelope<Conversation>>(`/conversations/${id}`);
  return data.data;
}

export async function fetchMessages(
  conversationId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ items: Message[]; pagination: Pagination }> {
  const { data } = await api.get<ApiEnvelope<{ items: Message[]; pagination: Pagination }>>(
    `/conversations/${conversationId}/messages`,
    { params }
  );
  return data.data;
}

export async function sendMessage(conversationId: string, input: SendMessageInput): Promise<Message> {
  const { data } = await api.post<ApiEnvelope<Message>>(`/conversations/${conversationId}/messages`, input);
  return data.data;
}

export async function markConversationRead(conversationId: string): Promise<{ updated: number }> {
  const { data } = await api.post<ApiEnvelope<{ updated: number }>>(`/conversations/${conversationId}/read`);
  return data.data;
}

export async function fetchUnreadCount(): Promise<{ unread: number }> {
  const { data } = await api.get<ApiEnvelope<{ unread: number }>>("/conversations/unread-count");
  return data.data;
}