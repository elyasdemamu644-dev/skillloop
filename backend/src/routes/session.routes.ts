import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import {
  createAvailabilitySchema,
  createSessionSchema,
  rescheduleSessionSchema,
  updateAvailabilitySchema,
  updateSessionStatusSchema,
} from "../validators/session.validator";
import * as sessionController from "../controllers/session.controller";

export const availabilitiesRouter = Router();

// A user's public (active) availability — used by the booking UI.
availabilitiesRouter.get("/user/:userId", sessionController.listUserAvailabilities);

// Own availability management.
availabilitiesRouter.use(requireAuth);
availabilitiesRouter.get("/", sessionController.listMyAvailabilities);
availabilitiesRouter.post("/", validateBody(createAvailabilitySchema), sessionController.createAvailability);
availabilitiesRouter.patch("/:id", validateBody(updateAvailabilitySchema), sessionController.updateAvailability);
availabilitiesRouter.delete("/:id", sessionController.deleteAvailability);

export const sessionsRouter = Router();

sessionsRouter.use(requireAuth);
sessionsRouter.get("/", sessionController.listMySessions);
sessionsRouter.get("/:id", sessionController.getSession);
sessionsRouter.post("/", validateBody(createSessionSchema), sessionController.createSession);
sessionsRouter.patch("/:id/status", validateBody(updateSessionStatusSchema), sessionController.updateSessionStatus);
sessionsRouter.patch("/:id/reschedule", validateBody(rescheduleSessionSchema), sessionController.rescheduleSession);