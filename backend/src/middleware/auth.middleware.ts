import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/token.service";
import { ApiError } from "./error.middleware";

// Access tokens are sent as "Authorization: Bearer <token>" — kept in memory
// on the frontend (never localStorage) and attached per-request by the
// axios client. The refresh token, by contrast, lives in an httpOnly cookie
// and is never touched by JavaScript.
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return null;
}

// Rejects the request with 401 if there's no valid access token.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(new ApiError(401, "Authentication required"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired access token"));
  }
}

// Attaches req.user if a valid token is present, but never blocks the
// request — useful for endpoints that behave differently for logged-in
// users without requiring login (not used yet in Phase 2, available for
// later phases like public profiles with an "is this me" flag).
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, email: payload.email };
    } catch {
      // Ignore invalid tokens for optional auth.
    }
  }
  next();
}
