import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import * as skillService from "../services/skill.service";

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await skillService.listCategories();
  ok(res, categories, "Skill categories");
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await skillService.getCategoryById(req.params.id);
  ok(res, category, "Skill category");
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await skillService.createCategory(req.body);
  created(res, category, "Category created");
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await skillService.updateCategory(req.params.id, req.body);
  ok(res, category, "Category updated");
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await skillService.deleteCategory(req.params.id);
  ok(res, null, "Category deleted");
});