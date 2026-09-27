import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import { sessionQuerySchema } from "../validators/session.validator";
import * as sessionService from "../services/session.service";

// ─── Availability ───────────────────────────────────────────────────────────
export const listMyAvailabilities = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await sessionService.listMyAvailabilities(req.user!.id), "My availability");
});

export const listUserAvailabilities = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await sessionService.listUserAvailabilities(req.params.userId), "User availability");
});

export const createAvailability = asyncHandler(async (req: Request, res: Response) => {
  created(res, await sessionService.createAvailability(req.user!.id, req.body), "Availability slot created");
});

export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await sessionService.updateAvailability(req.user!.id, req.params.id, req.body), "Availability updated");
});

export const deleteAvailability = asyncHandler(async (req: Request, res: Response) => {
  await sessionService.deleteAvailability(req.user!.id, req.params.id);
  ok(res, null, "Availability deleted");
});

// ─── Sessions ───────────────────────────────────────────────────────────────
export const listMySessions = asyncHandler(async (req: Request, res: Response) => {
  const query = sessionQuerySchema.parse(req.query);
  ok(res, await sessionService.listMySessions(req.user!.id, query), "My sessions");
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await sessionService.getSessionById(req.user!.id, req.params.id), "Session");
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  created(res, await sessionService.createSession(req.user!.id, req.body), "Session proposed");
});

export const updateSessionStatus = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await sessionService.updateSessionStatus(req.user!.id, req.params.id, req.body), "Session updated");
});

export const rescheduleSession = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await sessionService.rescheduleSession(req.user!.id, req.params.id, req.body), "Session rescheduled");
});