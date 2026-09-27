import { Response } from "express";

export function ok<T>(res: Response, data: T, message = "Operation successful", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function created<T>(res: Response, data: T, message = "Created successfully") {
  return ok(res, data, message, 201);
}
