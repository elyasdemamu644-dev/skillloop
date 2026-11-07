import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { parseDurationToMs } from "../utils/duration";

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
}

interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // unique id, matched against the RefreshToken table
}

export function signAccessToken(user: { id: string; email: string }): string {
  const payload: AccessTokenPayload = { sub: user.id, email: user.email };
  // Cast needed: zod types the env value as `string`, jsonwebtoken v9 wants ms.StringValue.
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

// Issues a new refresh token, persists its jti so it can be rotated/revoked,
// and returns the signed JWT string to be set as an httpOnly cookie.
export async function issueRefreshToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: { userId, jti, expiresAt },
  });

  const payload: RefreshTokenPayload = { sub: userId, jti };
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export class RefreshTokenError extends Error {}

// Verifies a refresh token JWT, checks it hasn't been revoked/expired/reused,
// then rotates it: the old one is revoked and a brand new one is issued.
// Rotation means a stolen-then-reused refresh token immediately breaks the
// chain, which is detectable (the legitimate user's next refresh will fail).
export async function rotateRefreshToken(
  rawToken: string
): Promise<{ userId: string; accessToken: string; refreshToken: string }> {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(rawToken, env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
  } catch {
    throw new RefreshTokenError("Invalid or expired refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new RefreshTokenError("Refresh token has been revoked or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new RefreshTokenError("User no longer exists or is inactive");
  }

  // Claim the token atomically. Without this guard, two concurrent refreshes
  // could both read `revokedAt: null` and each issue a new token, breaking the
  // single-use rotation invariant.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count !== 1) {
    throw new RefreshTokenError("Refresh token has already been used");
  }

  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(signAccessToken(user)),
    issueRefreshToken(user.id),
  ]);

  return { userId: user.id, accessToken, refreshToken };
}

// Reads the jti out of a refresh token without requiring it to still be
// rotatable. Used to keep the caller's own session alive across a password
// change while every other session is revoked.
export function readRefreshJti(rawToken: string | undefined): string | null {
  if (!rawToken) return null;
  try {
    return (jwt.verify(rawToken, env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload).jti;
  } catch {
    return null;
  }
}

// Revokes a single refresh token (used on logout).
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  try {
    const payload = jwt.verify(rawToken, env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
    await prisma.refreshToken.updateMany({
      where: { jti: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Token was already invalid/expired — logout should still succeed silently.
  }
}
