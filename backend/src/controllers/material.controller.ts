import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import { displayFileName } from "../utils/multer";
import {
  createMaterialSchema,
  materialListQuerySchema,
  updateMaterialSchema,
} from "../validators/material.validator";
import * as materialService from "../services/material.service";

function filesOf(req: Request): Express.Multer.File[] {
  return (req.files as Express.Multer.File[] | undefined) ?? [];
}

export const listMaterials = asyncHandler(async (req: Request, res: Response) => {
  const query = materialListQuerySchema.parse(req.query);
  ok(res, await materialService.listMaterials(query, req.user?.id), "Materials");
});

export const listMyMaterials = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await materialService.listMyMaterials(req.user!.id), "My materials");
});

export const listLibrary = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await materialService.listLibrary(req.user!.id), "My library");
});

export const createMaterial = asyncHandler(async (req: Request, res: Response) => {
  const input = createMaterialSchema.parse(req.body);
  created(
    res,
    await materialService.createMaterial(req.user!.id, input, filesOf(req)),
    "Material published"
  );
});

export const updateMaterial = asyncHandler(async (req: Request, res: Response) => {
  const input = updateMaterialSchema.parse(req.body);
  const { clearFiles, ...rest } = input;
  ok(
    res,
    await materialService.updateMaterial(req.user!.id, req.params.id, rest, filesOf(req), clearFiles === true),
    "Material updated"
  );
});

export const deleteMaterial = asyncHandler(async (req: Request, res: Response) => {
  await materialService.deleteMaterial(req.user!.id, req.params.id);
  ok(res, null, "Material deleted");
});

export const purchaseMaterial = asyncHandler(async (req: Request, res: Response) => {
  created(res, await materialService.purchaseMaterial(req.user!.id, req.params.id), "Material purchased");
});

export const downloadFile = asyncHandler(async (req: Request, res: Response) => {
  const filePath = await materialService.getDownloadPath(req.user!.id, req.params.id, req.params.fileName);
  res.download(filePath, displayFileName(req.params.fileName));
});