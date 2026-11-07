import bcrypt from "bcrypt";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { generateRawToken, hashToken } from "../utils/hashToken";
import type { RegisterInput, LoginInput, ResetPasswordInput } from "../validators/auth.validator";

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Fields safe to send to the client — never the password hash.
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
  bio: true,
  location: true,
  timezone: true,
  isVerified: true,
  isActive: true,
  isAdmin: true,
  createdAt: true,
} as const;

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    const field = existing.email === input.email ? "email" : "username";
    throw new ApiError(409, `An account with that ${field} already exists`);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    },
    select: PUBLIC_USER_SELECT,
  });

  return user;
}

export async function validateCredentials(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same error for "no such user" and "wrong password" — don't reveal
  // which one it was, to avoid leaking which emails have accounts.
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account has been deactivated");
  }

  const { passwordHash: _unused, ...publicUser } = user;
  return publicUser;
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PUBLIC_USER_SELECT,
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  keepRefreshJti?: string | null
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // A password change must evict every other session: if a refresh token
    // was stolen, changing the password is the one action the victim takes,
    // and it has to actually lock the attacker out. The caller's own session
    // is preserved so they are not logged out of the device they are using.
    prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepRefreshJti ? { jti: { not: keepRefreshJti } } : {}),
      },
      data: { revokedAt: new Date() },
    }),
  ]);
}

// Returns the raw token only so the caller can email it / log it in dev.
// Always succeeds from the caller's perspective, even if the email doesn't
// exist, to avoid leaking which emails are registered.
export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return null;
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return rawToken;
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ApiError(400, "This reset link is invalid or has expired");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    // Reset password also invalidates all existing sessions for safety.
    prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
