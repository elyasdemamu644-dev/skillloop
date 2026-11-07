import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { AccessTokenPayload, verifyAccessToken } from "../services/token.service";
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

// A signed token is necessary but not sufficient: the account may have been
// deactivated or deleted after it was issued. Checking on every request means
// a ban takes effect immediately instead of when the access token expires.
async function loadActiveAccount(
  payload: AccessTokenPayload
): Promise<{ id: string; isActive: boolean } | null> {
  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, isActive: true },
  });
}

// Rejects the request with 401 if there's no valid access token for an
// existing, active account.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    next(new ApiError(401, "Authentication required"));
    return;
  }

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    next(new ApiError(401, "Invalid or expired access token"));
    return;
  }

  try {
    const account = await loadActiveAccount(payload);
    if (!account || !account.isActive) {
      next(new ApiError(401, "This account is no longer active"));
      return;
    }
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    next(error);
  }
}

// Attaches req.user if a valid token for an active account is present, but
// never blocks the request — useful for endpoints that behave differently for
// logged-in users without requiring login (e.g. public listings that flag the
// viewer's own rows).
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      const account = await loadActiveAccount(payload);
      if (account?.isActive) {
        req.user = { id: payload.sub, email: payload.email };
      }
    } catch {
      // Ignore invalid tokens for optional auth.
    }
  }
  next();
}
