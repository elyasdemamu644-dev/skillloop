import { NextFunction, Request, Response } from "express";
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

// 404 handler — reached when no route matches.
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Final error handler — always returns the consistent { success, message, errors } shape.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string" && err.code.startsWith("LIMIT_")) {
    res.status(413).json({ success: false, message: "Upload failed — file is too large or there are too many files." });
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
