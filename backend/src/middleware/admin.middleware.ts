import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { ApiError } from "./error.middleware";

// Requires an authenticated user who is an active admin. Runs after
// requireAuth so req.user is guaranteed to exist.
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { isActive: true, isAdmin: true },
    });
    if (!user || !user.isActive) {
      next(new ApiError(401, "Account is not active"));
      return;
    }
    if (!user.isAdmin) {
      next(new ApiError(403, "Admin access required"));
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}