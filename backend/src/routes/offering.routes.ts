import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createOfferingSchema, updateOfferingSchema } from "../validators/skill.validator";
import * as offeringController from "../controllers/offering.controller";

export const offeringsRouter = Router();

offeringsRouter.get("/", offeringController.listOfferings);
offeringsRouter.get("/mine", requireAuth, offeringController.listMyOfferings);
offeringsRouter.post("/", requireAuth, validateBody(createOfferingSchema), offeringController.createOffering);
offeringsRouter.patch("/:id", requireAuth, validateBody(updateOfferingSchema), offeringController.updateOffering);
offeringsRouter.delete("/:id", requireAuth, offeringController.deleteOffering);