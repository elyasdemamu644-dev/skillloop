import { SkillLevel, SkillType } from "@prisma/client";
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import * as skillService from "../services/skill.service";
import { discoveryQuerySchema } from "../validators/skill.validator";

const SKILL_TYPES: SkillType[] = ["TEACH", "LEARN", "BOTH"];

function parseTypeQuery(req: Request): SkillType | undefined {
  const raw = req.query.type;
  return typeof raw === "string" && SKILL_TYPES.includes(raw as SkillType)
    ? (raw as SkillType)
    : undefined;
}

export const listMySkills = asyncHandler(async (req: Request, res: Response) => {
  const skills = await skillService.listUserSkills(req.user!.id, parseTypeQuery(req));
  ok(res, skills, "My skills");
});

export const addMySkill = asyncHandler(async (req: Request, res: Response) => {
  const userSkill = await skillService.addUserSkill(req.user!.id, req.body);
  created(res, userSkill, "Skill added to your profile");
});

export const updateMySkill = asyncHandler(async (req: Request, res: Response) => {
  const userSkill = await skillService.updateUserSkill(req.user!.id, req.params.id, req.body);
  ok(res, userSkill, "Skill updated");
});

export const removeMySkill = asyncHandler(async (req: Request, res: Response) => {
  await skillService.deleteUserSkill(req.user!.id, req.params.id);
  ok(res, null, "Skill removed from your profile");
});

export const discoverUsers = asyncHandler(async (req: Request, res: Response) => {
  const parsed = discoveryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid discovery filters", errors: parsed.error.flatten() });
    return;
  }
  const result = await skillService.discoverUsersBySkill({
    skillId: parsed.data.skillId,
    skillName: parsed.data.search,
    type: parsed.data.type as SkillType | undefined,
    level: parsed.data.level as SkillLevel | undefined,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });
  ok(res, result, "Discovered users");
});

export const discoverUsersForSkill = asyncHandler(async (req: Request, res: Response) => {
  const parsed = discoveryQuerySchema.safeParse({ ...req.query, skillId: req.params.skillId });
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid discovery filters", errors: parsed.error.flatten() });
    return;
  }
  const result = await skillService.discoverUsersBySkill({
    skillId: parsed.data.skillId,
    type: parsed.data.type as SkillType | undefined,
    level: parsed.data.level as SkillLevel | undefined,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });
  ok(res, result, "Discovered users");
});