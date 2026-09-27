import { api } from "./api";
import type { Payment, PaymentListResponse, PaymentMethod, Wallet } from "@/types/payment";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function fetchWallet(): Promise<Wallet> {
  const { data } = await api.get<ApiEnvelope<Wallet>>("/payments/wallet");
  return data.data;
}

export async function fetchMyPayments(page = 1): Promise<PaymentListResponse> {
  const { data } = await api.get<ApiEnvelope<PaymentListResponse>>("/payments", { params: { page } });
  return data.data;
}

export async function createPayment(input: {
  amount: number;
  recipientId?: string;
  exchangeId?: string;
  method?: PaymentMethod;
  description?: string;
}): Promise<Payment> {
  const { data } = await api.post<ApiEnvelope<Payment>>("/payments", input);
  return data.data;
}

export async function completePayment(id: string): Promise<Payment> {
  const { data } = await api.post<ApiEnvelope<Payment>>(`/payments/${id}/complete`);
  return data.data;
}

export async function refundPayment(id: string): Promise<Payment> {
  const { data } = await api.post<ApiEnvelope<Payment>>(`/payments/${id}/refund`);
  return data.data;
}