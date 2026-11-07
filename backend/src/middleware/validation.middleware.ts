import fs from "fs";
import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "./error.middleware";

// Multer has already written uploads to disk by the time the body is
// validated, so a rejected multipart request would otherwise leave orphaned
// files behind with no database row pointing at them.
function removeUploadedFiles(req: Request): void {
  const files = [
    ...((req.files as Express.Multer.File[] | undefined) ?? []),
    ...(req.file ? [req.file] : []),
  ];
  for (const file of files) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // Best effort — never fail the response because cleanup failed.
    }
  }
}

// Validates req.body against the given Zod schema, replacing req.body with
// the parsed (and type-coerced) result on success, or forwarding a 422 with
// field-level error details on failure.
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      removeUploadedFiles(req);
      next(new ApiError(422, "Validation failed", result.error.flatten().fieldErrors));
      return;
    }
    req.body = result.data;
    next();
  };
}
