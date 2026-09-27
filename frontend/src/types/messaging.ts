export interface UserBrief {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

export interface Message {
  id: string;
  body: string;
  senderId: string;
  readAt: string | null;
  createdAt: string;
  sender: UserBrief;
}

export interface Conversation {
  id: string;
  exchangeId: string | null;
  exchange: {
    id: string;
    offering: { id: string; title: string; skill: { name: string } };
  } | null;
  otherUser: UserBrief;
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
    readAt: string | null;
  } | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageInput {
  body: string;
}

export interface CreateConversationInput {
  participantId: string;
  exchangeId?: string;
}