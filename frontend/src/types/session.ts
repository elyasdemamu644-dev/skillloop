export type SessionStatus = "PROPOSED" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";

export interface Availability {
  id: string;
  dayOfWeek: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityInput {
  dayOfWeek?: number;
  date?: string;
  startTime: string;
  endTime: string;
}

export interface Session {
  id: string;
  startsAt: string;
  endTime: string;
  status: SessionStatus;
  meetingLink: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  exchange: {
    id: string;
    message: string | null;
    offering: { id: string; title: string; skill: { id: string; name: string } };
  };
  learner: { id: string; username: string; firstName: string; lastName: string; avatar: string | null };
  teacher: { id: string; username: string; firstName: string; lastName: string; avatar: string | null };
}

export interface CreateSessionInput {
  exchangeId: string;
  startsAt: string;
  durationMinutes: number;
  notes?: string;
}

export interface UserBrief {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  PROPOSED: "Proposed",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};