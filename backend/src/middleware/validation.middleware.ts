import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "./error.middleware";

// Validates req.body against the given Zod schema, replacing req.body with
// the parsed (and type-coerced) result on success, or forwarding a 422 with
// field-level error details on failure.
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ApiError(422, "Validation failed", result.error.flatten().fieldErrors));
      return;
    }
    req.body = result.data;
    next();
  };
}
