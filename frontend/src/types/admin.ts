export interface AdminStats {
  users: { total: number; active: number; verified: number; admins: number };
  content: {
    offerings: number;
    exchanges: number;
    sessions: number;
    plans: number;
    reviews: number;
    feedbacks: number;
    notifications: number;
    averageReviewRating: number | null;
  };
  breakdown: {
    exchanges: Record<string, number>;
    sessions: Record<string, number>;
  };
  topSkills: Array<{ name: string | undefined; offerings: number }>;
  recentUsers: Array<{
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    createdAt: string;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  isVerified: boolean;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  _count: {
    skillOfferings: number;
    requestedExchanges: number;
    providedExchanges: number;
    learnerSessions: number;
    teacherSessions: number;
    reviewsReceived: number;
  };
}

export interface AdminUserPage {
  items: AdminUser[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ModeratedReview {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  author: { id: string; username: string; firstName: string; lastName: string };
  recipient: { id: string; username: string; firstName: string; lastName: string };
}

export interface ModeratedFeedback {
  id: string;
  content: string;
  rating: number | null;
  createdAt: string;
  author: { id: string; username: string; firstName: string; lastName: string };
  recipient: { id: string; username: string; firstName: string; lastName: string };
}

export interface ModerationQueue {
  reviews: ModeratedReview[];
  feedbacks: ModeratedFeedback[];
}