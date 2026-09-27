import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import * as exchangeService from "../services/exchange.service";

export const createExchange = asyncHandler(async (req: Request, res: Response) => {
  created(res, await exchangeService.createExchange(req.user!.id, req.body), "Exchange request created");
});

export const listMyExchanges = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await exchangeService.listMyExchanges(req.user!.id), "My exchanges");
});

export const updateExchangeStatus = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await exchangeService.updateExchangeStatus(req.user!.id, req.params.id, req.body), "Exchange updated");
});