import { z } from "zod";

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().max(100).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const updateUserStatusSchema = z.object({
  isActive: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;