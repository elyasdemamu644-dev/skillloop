import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { uploadMaterials } from "../utils/multer";
import { createMaterialSchema, updateMaterialSchema } from "../validators/material.validator";
import * as materialController from "../controllers/material.controller";

export const materialsRouter = Router();

// Public browsing: only active materials (optionally filtered by skill).
materialsRouter.get("/", materialController.listMaterials);
// Authed collection routes must come before the /:id param route.
materialsRouter.get("/library", requireAuth, materialController.listLibrary);
materialsRouter.get("/mine", requireAuth, materialController.listMyMaterials);

materialsRouter.post(
  "/",
  requireAuth,
  uploadMaterials.array("files", 8),
  validateBody(createMaterialSchema),
  materialController.createMaterial
);
materialsRouter.patch(
  "/:id",
  requireAuth,
  uploadMaterials.array("files", 8),
  validateBody(updateMaterialSchema),
  materialController.updateMaterial
);
materialsRouter.delete("/:id", requireAuth, materialController.deleteMaterial);
materialsRouter.post("/:id/purchase", requireAuth, materialController.purchaseMaterial);
materialsRouter.get(
  "/:id/file/:fileName",
  requireAuth,
  materialController.downloadFile
);