import { z } from "zod";

// Multipart forms send `links` as a JSON.stringify'd array; plain JSON bodies
// send an actual array. Accept either and always end up with a URL list.
const linksField = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return [];
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  },
  z.array(z.string().trim().url("Enter a valid URL").max(500)).max(20, "Too many links")
);

export const createMaterialSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description is too long"),
  price: z.coerce.number().int().min(1, "Price must be at least 1 credit").max(100000, "Price is too large"),
  skillId: z.string().trim().optional().nullable().transform((value) => value || null),
  links: linksField.optional(),
});
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export const updateMaterialSchema = createMaterialSchema
  .partial()
  .extend({ isActive: z.coerce.boolean().optional(), clearFiles: z.coerce.boolean().optional() });
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

export const materialListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
  skillId: z.string().trim().min(1).optional(),
});
export type MaterialListQuery = z.infer<typeof materialListQuerySchema>;