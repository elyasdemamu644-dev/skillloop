import { api } from "./api";
import type { Pagination } from "@/types/skill";
import type {
  Availability,
  CreateAvailabilityInput,
  CreateSessionInput,
  Session,
  SessionStatus,
} from "@/types/session";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function fetchMyAvailabilities(): Promise<Availability[]> {
  const { data } = await api.get<ApiEnvelope<Availability[]>>("/availabilities");
  return data.data;
}

export async function createAvailability(input: CreateAvailabilityInput): Promise<Availability> {
  const { data } = await api.post<ApiEnvelope<Availability>>("/availabilities", input);
  return data.data;
}

export async function updateAvailability(
  id: string,
  input: Partial<CreateAvailabilityInput> & { isActive?: boolean }
): Promise<Availability> {
  const { data } = await api.patch<ApiEnvelope<Availability>>(`/availabilities/${id}`, input);
  return data.data;
}

export async function deleteAvailability(id: string): Promise<void> {
  await api.delete(`/availabilities/${id}`);
}

export async function fetchMySessions(params: {
  status?: SessionStatus;
  page?: number;
  limit?: number;
} = {}): Promise<{ items: Session[]; pagination: Pagination }> {
  const { data } = await api.get<ApiEnvelope<{ items: Session[]; pagination: Pagination }>>("/sessions", {
    params,
  });
  return data.data;
}

export async function proposeSession(input: CreateSessionInput): Promise<Session> {
  const { data } = await api.post<ApiEnvelope<Session>>("/sessions", input);
  return data.data;
}

export async function updateSessionStatus(id: string, status: SessionStatus): Promise<Session> {
  const { data } = await api.patch<ApiEnvelope<Session>>(`/sessions/${id}/status`, { status });
  return data.data;
}

export async function rescheduleSession(
  id: string,
  input: { startsAt: string; durationMinutes?: number }
): Promise<Session> {
  const { data } = await api.patch<ApiEnvelope<Session>>(`/sessions/${id}/reschedule`, input);
  return data.data;
}