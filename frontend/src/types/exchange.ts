import type { SkillOffering } from "./offering";

export type ExchangeStatus = "REQUESTED" | "ACCEPTED" | "REJECTED" | "COMPLETED";

export interface SkillExchange {
  id: string;
  message: string | null;
  status: ExchangeStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  offering: Pick<SkillOffering, "id" | "title"> & { skill: { id: string; name: string } };
  requester: { id: string; username: string; firstName: string; lastName: string; avatar: string | null };
  provider: { id: string; username: string; firstName: string; lastName: string; avatar: string | null };
}