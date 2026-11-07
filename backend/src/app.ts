import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { healthRouter } from "./routes/health.routes";
import { authRouter } from "./routes/auth.routes";
import { categoriesRouter } from "./routes/category.routes";
import { skillsRouter } from "./routes/skill.routes";
import { usersRouter } from "./routes/user.routes";
import { offeringsRouter } from "./routes/offering.routes";
import { exchangesRouter } from "./routes/exchange.routes";
import { availabilitiesRouter, sessionsRouter } from "./routes/session.routes";
import { conversationsRouter } from "./routes/message.routes";
import { plansRouter, challengesRouter, feedbackRouter } from "./routes/learning.routes";
import { reviewsRouter, achievementsRouter } from "./routes/reputation.routes";
import { notificationsRouter } from "./routes/notification.routes";
import { adminRouter } from "./routes/admin.routes";
import { paymentsRouter } from "./routes/payment.routes";
import { aiRouter } from "./routes/ai.routes";
import { materialsRouter } from "./routes/material.routes";

export function createApp(): Application {
  const app = express();

  // Behind a reverse proxy (Docker, nginx, Render) the real client IP arrives
  // in X-Forwarded-For. Without trusting the proxy, express-rate-limit would
  // bucket every request under the proxy's address instead of per client.
  if (env.TRUST_PROXY > 0) {
    app.set("trust proxy", env.TRUST_PROXY);
  }

  // --- Security & parsing middleware ---
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // --- Rate limiting (applies to all /api routes) ---
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter);

  // --- Routes ---
  app.get("/", (_req, res) => {
    res.json({
      success: true,
      service: "SkillLoop API",
      message: "SkillLoop API is running",
      health: "/api/health",
    });
  });

  // Phase 3 adds the skills system: catalog categories, skills, and each
  // user's own teach/learn profile at /api/users/me/skills.
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/skills", skillsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/offerings", offeringsRouter);
  app.use("/api/exchanges", exchangesRouter);
  app.use("/api/availabilities", availabilitiesRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/plans", plansRouter);
  app.use("/api/challenges", challengesRouter);
  app.use("/api/feedback", feedbackRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/achievements", achievementsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/materials", materialsRouter);

  // --- 404 + centralized error handling (must be last) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
