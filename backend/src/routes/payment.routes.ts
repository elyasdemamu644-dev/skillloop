import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createPaymentSchema } from "../validators/payment.validator";
import * as paymentController from "../controllers/payment.controller";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);
paymentsRouter.get("/", paymentController.listMyPayments);
paymentsRouter.get("/wallet", paymentController.getWallet);
paymentsRouter.get("/:id", paymentController.getPayment);
paymentsRouter.post("/", validateBody(createPaymentSchema), paymentController.createPayment);
paymentsRouter.post("/:id/complete", paymentController.completePayment);
paymentsRouter.post("/:id/refund", paymentController.refundPayment);