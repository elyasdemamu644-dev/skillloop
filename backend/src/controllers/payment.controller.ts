import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import * as paymentService from "../services/payment.service";

export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await paymentService.getWallet(req.user!.id), "Wallet");
});

export const listMyPayments = asyncHandler(async (req: Request, res: Response) => {
  ok(
    res,
    await paymentService.listMyPayments(req.user!.id, req.query as never),
    "My payments"
  );
});

export const listMyTransactions = asyncHandler(async (req: Request, res: Response) => {
  ok(
    res,
    await paymentService.listMyTransactions(req.user!.id, req.query as never),
    "My wallet transactions"
  );
});

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  created(res, await paymentService.createPayment(req.user!.id, req.body), "Payment created");
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await paymentService.getPayment(req.user!.id, req.params.id), "Payment");
});

export const completePayment = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await paymentService.completePayment(req.user!.id, req.params.id), "Payment completed");
});

export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await paymentService.refundPayment(req.user!.id, req.params.id), "Payment refunded");
});