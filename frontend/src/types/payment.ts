export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PaymentMethod = "CREDITS" | "CARD" | "MANUAL";

export interface PaymentUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

export interface PaymentExchange {
  id: string;
  offering: { id: string; title: string; skill: { name: string } };
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  description: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: PaymentUser;
  recipient: PaymentUser | null;
  exchange: PaymentExchange | null;
}

export interface Wallet {
  balance: number;
  totalPaid: number;
  totalReceived: number;
}

export interface PaymentListResponse {
  items: Payment[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}