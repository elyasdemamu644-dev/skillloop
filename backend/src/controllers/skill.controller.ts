import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import * as skillService from "../services/skill.service";
import { discoveryQuerySchema } from "../validators/skill.validator";

export const listSkills = asyncHandler(async (req: Request, res: Response) => {
  const isDiscovery = ["search", "categoryId", "page", "limit"].some(
    (key) => req.query[key] !== undefined
  );
  if (isDiscovery) {
    const parsed = discoveryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Invalid discovery filters", errors: parsed.error.flatten() });
      return;
    }
    const result = await skillService.discoverSkills(parsed.data);
    ok(res, result, "Skills");
    return;
  }
  const skills = await skillService.listSkills({
    q: typeof req.query.q === "string" && req.query.q.trim() !== "" ? req.query.q.trim() : undefined,
    category:
      typeof req.query.category === "string" && req.query.category.trim() !== ""
        ? req.query.category.trim()
        : undefined,
  });
  ok(res, skills, "Skills");
});

export const getSkill = asyncHandler(async (req: Request, res: Response) => {
  const skill = await skillService.getSkillById(req.params.id);
  ok(res, skill, "Skill");
});

export const createSkill = asyncHandler(async (req: Request, res: Response) => {
  const skill = await skillService.createSkill(req.body);
  created(res, skill, "Skill created");
});

export const updateSkill = asyncHandler(async (req: Request, res: Response) => {
  const skill = await skillService.updateSkill(req.params.id, req.body);
  ok(res, skill, "Skill updated");
});

export const deleteSkill = asyncHandler(async (req: Request, res: Response) => {
  await skillService.deleteSkill(req.params.id);
  ok(res, null, "Skill deleted");
});