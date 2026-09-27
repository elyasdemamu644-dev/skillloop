import { api } from "./api";
import type { AuthSession, LoginInput, RegisterInput, User } from "@/types/auth";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function registerRequest(input: RegisterInput): Promise<AuthSession> {
  const { data } = await api.post<ApiEnvelope<AuthSession>>("/auth/register", input);
  return data.data;
}

export async function loginRequest(input: LoginInput): Promise<AuthSession> {
  const { data } = await api.post<ApiEnvelope<AuthSession>>("/auth/login", input);
  return data.data;
}

export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout");
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<ApiEnvelope<{ user: User }>>("/auth/me");
  return data.data.user;
}

export async function changePasswordRequest(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.patch("/auth/change-password", input);
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPasswordRequest(input: {
  token: string;
  newPassword: string;
}): Promise<void> {
  await api.post("/auth/reset-password", input);
}
