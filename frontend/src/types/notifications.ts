export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: {
    href?: string;
    conversationId?: string;
    exchangeId?: string;
    sessionId?: string;
    challengeId?: string;
    submissionId?: string;
    achievementId?: string;
    [key: string]: unknown;
  } | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}