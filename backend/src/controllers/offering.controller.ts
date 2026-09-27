import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import { offeringQuerySchema } from "../validators/skill.validator";
import * as offeringService from "../services/offering.service";

export const listOfferings = asyncHandler(async (req: Request, res: Response) => {
  const query = offeringQuerySchema.parse(req.query);
  ok(res, await offeringService.listOfferings(query), "Skill offerings");
});

export const listMyOfferings = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await offeringService.listMyOfferings(req.user!.id), "My offerings");
});

export const createOffering = asyncHandler(async (req: Request, res: Response) => {
  created(res, await offeringService.createOffering(req.user!.id, req.body), "Offering created");
});

export const updateOffering = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await offeringService.updateOffering(req.user!.id, req.params.id, req.body), "Offering updated");
});

export const deleteOffering = asyncHandler(async (req: Request, res: Response) => {
  await offeringService.deleteOffering(req.user!.id, req.params.id);
  ok(res, null, "Offering deleted");
});