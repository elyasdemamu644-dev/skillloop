import { z } from "zod";

const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

export const sessionStatusSchema = z.enum([
  "PROPOSED",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
  "COMPLETED",
]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

// ─── Availability (recurring weekday slot or one-off date slot) ─────────────
export const createAvailabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0, "dayOfWeek must be 0-6").max(6).optional(),
    date: z
      .string()
      .datetime({ offset: true, message: "date must be an ISO-8601 datetime" })
      .optional(),
    startTime: z.string().regex(TIME_24H, "startTime must be HH:MM (24h)"),
    endTime: z.string().regex(TIME_24H, "endTime must be HH:MM (24h)"),
  })
  .refine((data) => (data.dayOfWeek !== undefined) !== (data.date !== undefined), {
    message: "Provide exactly one of dayOfWeek (recurring) or date (one-off)",
    path: ["dayOfWeek"],
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;

export const updateAvailabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    date: z.string().datetime({ offset: true }).nullable().optional(),
    startTime: z.string().regex(TIME_24H).optional(),
    endTime: z.string().regex(TIME_24H).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => (data.dayOfWeek !== undefined) !== (data.date !== undefined), {
    message: "Provide exactly one of dayOfWeek (recurring) or date (one-off)",
    path: ["dayOfWeek"],
  });
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

// ─── Sessions ───────────────────────────────────────────────────────────────
export const createSessionSchema = z.object({
  exchangeId: z.string().min(1, "exchangeId is required"),
  startsAt: z.string().datetime({ offset: true, message: "startsAt must be an ISO-8601 datetime" }),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const rescheduleSessionSchema = z.object({
  startsAt: z.string().datetime({ offset: true, message: "startsAt must be an ISO-8601 datetime" }),
  durationMinutes: z.number().int().min(15).max(480).optional(),
});
export type RescheduleSessionInput = z.infer<typeof rescheduleSessionSchema>;

export const updateSessionStatusSchema = z.object({ status: sessionStatusSchema });
export type UpdateSessionStatusInput = z.infer<typeof updateSessionStatusSchema>;

export const sessionQuerySchema = z.object({
  status: sessionStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type SessionQuery = z.infer<typeof sessionQuerySchema>;