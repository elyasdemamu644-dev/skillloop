import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createCategorySchema, updateCategorySchema } from "../validators/skill.validator";
import * as categoryController from "../controllers/category.controller";

export const categoriesRouter = Router();

// Catalog browsing is public.
categoriesRouter.get("/", categoryController.listCategories);
categoriesRouter.get("/:id", categoryController.getCategory);

// Catalog management requires an authenticated user for now; Phase 22 (Admin)
// adds a requireAdmin guard on top of these same routes.
categoriesRouter.post(
  "/",
  requireAuth,
  validateBody(createCategorySchema),
  categoryController.createCategory
);
categoriesRouter.patch(
  "/:id",
  requireAuth,
  validateBody(updateCategorySchema),
  categoryController.updateCategory
);
categoriesRouter.delete("/:id", requireAuth, categoryController.deleteCategory);