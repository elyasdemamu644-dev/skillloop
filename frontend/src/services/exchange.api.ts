import { api } from "./api";
import type { SkillExchange, ExchangeStatus } from "@/types/exchange";

interface ApiEnvelope<T> { success: boolean; data: T; message: string }

export async function fetchMyExchanges() {
  const { data } = await api.get<ApiEnvelope<SkillExchange[]>>("/exchanges");
  return data.data;
}

export async function requestExchange(offeringId: string, message?: string) {
  const { data } = await api.post<ApiEnvelope<SkillExchange>>("/exchanges", { offeringId, message });
  return data.data;
}

export async function updateExchangeStatus(id: string, status: ExchangeStatus) {
  const { data } = await api.patch<ApiEnvelope<SkillExchange>>(`/exchanges/${id}/status`, { status });
  return data.data;
}