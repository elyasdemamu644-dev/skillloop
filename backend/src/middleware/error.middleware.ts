import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";

export class ApiError extends Error {
  statusCode: number;
  errors?: unknown;

  constructor(statusCode: number, message: string, errors?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Multer signals oversized uploads / too many files with LIMIT_* codes.
function isUploadLimitError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string" &&
    (err as { code: string }).code.startsWith("LIMIT_")
  );
}

// Translate Prisma's known error codes into meaningful HTTP statuses. Without
// this, a unique-constraint race or a foreign-key violation surfaces as a
// generic 500 instead of the 409/404 the API contract promises.
function fromPrismaError(err: unknown): { statusCode: number; message: string } | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2000":
        return { statusCode: 400, message: "A supplied value is too long" };
      case "P2002":
        return { statusCode: 409, message: "That value is already in use" };
      case "P2003":
        return { statusCode: 409, message: "This action is blocked by related records that still exist" };
      case "P2014":
        return { statusCode: 409, message: "This change would break a required relationship" };
      case "P2025":
        return { statusCode: 404, message: "Record not found" };
      default:
        return null;
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { statusCode: 400, message: "Invalid data supplied" };
  }
  return null;
}

// 404 handler — reached when no route matches.
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Final error handler — always returns the consistent { success, message, errors } shape.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (isUploadLimitError(err)) {
    res.status(413).json({ success: false, message: "Upload failed — file is too large or there are too many files." });
    return;
  }

  const prismaError = fromPrismaError(err);
  if (prismaError) {
    // Expected domain conflicts are logged at info level, not as crashes.
    res.status(prismaError.statusCode).json({ success: false, message: prismaError.message });
    return;
  }

  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = isApiError ? err.message : "Internal server error";
  const errors = isApiError ? err.errors : undefined;

  if (!isApiError || statusCode >= 500) {
    // Log full detail server-side; never leak stack traces to the client.
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(env.NODE_ENV === "development" && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
}
