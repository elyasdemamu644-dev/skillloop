import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createExchangeSchema, updateExchangeStatusSchema } from "../validators/skill.validator";
import * as exchangeController from "../controllers/exchange.controller";

export const exchangesRouter = Router();

exchangesRouter.use(requireAuth);
exchangesRouter.get("/", exchangeController.listMyExchanges);
exchangesRouter.post("/", validateBody(createExchangeSchema), exchangeController.createExchange);
exchangesRouter.patch("/:id/status", validateBody(updateExchangeStatusSchema), exchangeController.updateExchangeStatus);