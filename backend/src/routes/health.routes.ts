import { Router } from "express";
import { prisma } from "../config/database";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";

export const healthRouter = Router();

// Simple liveness check — does not touch the database.
healthRouter.get("/", (req, res) => {
  ok(res, { status: "up", timestamp: new Date().toISOString() }, "SkillLoop API is running");
});

// Readiness check — confirms the database connection is actually alive.
healthRouter.get(
  "/db",
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    ok(res, { status: "connected" }, "Database connection is healthy");
  })
);
