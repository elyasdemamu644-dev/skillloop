import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createCategorySchema, updateCategorySchema } from "../validators/skill.validator";
import * as categoryController from "../controllers/category.controller";

export const categoriesRouter = Router();

// Catalog browsing is public.
categoriesRouter.get("/", categoryController.listCategories);
categoriesRouter.get("/:id", categoryController.getCategory);

// Catalog management is admin-only: categories and skills are shared state
// that every user depends on, so no individual account may rename or delete
// them. (These routes were previously open to any authenticated user.)
categoriesRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  validateBody(createCategorySchema),
  categoryController.createCategory
);
categoriesRouter.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  validateBody(updateCategorySchema),
  categoryController.updateCategory
);
categoriesRouter.delete("/:id", requireAuth, requireAdmin, categoryController.deleteCategory);
