import { Request, Response } from "express";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/apiResponse";
import { ApiError } from "../middleware/error.middleware";
import { parseDurationToMs } from "../utils/duration";
import {
  registerUser,
  validateCredentials,
  getUserById,
  changePassword as changePasswordService,
  requestPasswordReset,
  resetPassword as resetPasswordService,
} from "../services/auth.service";
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  readRefreshJti,
  RefreshTokenError,
} from "../services/token.service";

const REFRESH_COOKIE_NAME = "refreshToken";

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN),
    path: "/api/auth", // only sent to auth endpoints (refresh/logout)
  };
}

async function issueSession(res: Response, user: { id: string; email: string }) {
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  return accessToken;
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser(req.body);
  const accessToken = await issueSession(res, user);
  created(res, { user, accessToken }, "Account created successfully");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const user = await validateCredentials(req.body);
  const accessToken = await issueSession(res, user);
  ok(res, { user, accessToken }, "Logged in successfully");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawToken) {
    throw new ApiError(401, "No refresh token provided");
  }

  try {
    const { accessToken, refreshToken } = await rotateRefreshToken(rawToken);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    ok(res, { accessToken }, "Session refreshed");
  } catch (err) {
    if (err instanceof RefreshTokenError) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      throw new ApiError(401, err.message);
    }
    throw err;
  }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (rawToken) {
    await revokeRefreshToken(rawToken);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  ok(res, null, "Logged out successfully");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  // req.user is guaranteed by the requireAuth middleware on this route.
  const user = await getUserById(req.user!.id);
  ok(res, { user }, "Current user");
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  // Keep the session that made this request; revoke every other one.
  const keepJti = readRefreshJti(req.cookies?.[REFRESH_COOKIE_NAME]);
  await changePasswordService(req.user!.id, currentPassword, newPassword, keepJti);
  ok(res, null, "Password changed successfully. Other devices have been signed out.");
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = await requestPasswordReset(req.body.email);

  // Always return the same success message, whether or not the email
  // exists, so this endpoint can't be used to enumerate accounts.
  const payload =
    env.NODE_ENV === "development" && rawToken
      ? { devResetToken: rawToken } // only exposed in dev, since there's no email service yet
      : null;

  ok(
    res,
    payload,
    "If an account with that email exists, a password reset link has been sent."
  );
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await resetPasswordService(req.body);
  ok(res, null, "Password has been reset. Please log in with your new password.");
});
