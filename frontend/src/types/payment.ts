export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDING"
  | "REFUNDED";
export type PaymentMethod = "CREDITS" | "CARD" | "MANUAL";

export type WalletTransactionType =
  | "TOP_UP"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "REFUND_OUT"
  | "REFUND_IN"
  | "MATERIAL_PURCHASE"
  | "MATERIAL_SALE"
  | "ADJUSTMENT";

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

// One row of the wallet ledger: every balance change is recorded with the
// balance it produced, so the history explains the number.
export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  paymentId: string | null;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  totalCredited: number;
  totalDebited: number;
  recentTransactions: WalletTransaction[];
}

export interface PaymentListResponse {
  items: Payment[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
