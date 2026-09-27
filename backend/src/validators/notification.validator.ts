import { z } from "zod";

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;

export const markReadParamsSchema = z.object({
  id: z.string().min(1, "notification id is required"),
});
export type MarkReadParams = z.infer<typeof markReadParamsSchema>;