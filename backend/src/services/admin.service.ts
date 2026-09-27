import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import type { AdminUsersQuery, UpdateUserStatusInput } from "../validators/admin.validator";

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
  isVerified: true,
  isAdmin: true,
  isActive: true,
  createdAt: true,
  _count: {
    select: {
      skillOfferings: true,
      requestedExchanges: true,
      providedExchanges: true,
      learnerSessions: true,
      teacherSessions: true,
      reviewsReceived: true,
    },
  },
} as const;

export async function dashboardStats() {
  const [
    users,
    activeUsers,
    verifiedUsers,
    admins,
    offerings,
    exchanges,
    sessions,
    plans,
    reviews,
    feedbacks,
    notifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.skillOffering.count(),
    prisma.skillExchange.count(),
    prisma.session.count(),
    prisma.learningPlan.count(),
    prisma.review.count(),
    prisma.feedback.count(),
    prisma.notification.count(),
  ]);

  const reviewAvg = await prisma.review.aggregate({ _avg: { rating: true } });
  const [exchangesByStatus, sessionsByStatus, topSkills, recentUsers] = await Promise.all([
    prisma.skillExchange.groupBy({ by: ["status"], _count: true }),
    prisma.session.groupBy({ by: ["status"], _count: true }),
    prisma.skillOffering.groupBy({ by: ["skillId"], _count: true, orderBy: { _count: { skillId: "desc" } }, take: 5 }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, username: true, firstName: true, lastName: true, isActive: true, createdAt: true },
    }),
  ]);

  const skills = await prisma.skill.findMany({ where: { id: { in: topSkills.map((row) => row.skillId) } }, select: { id: true, name: true } });
  const skillName = new Map(skills.map((skill) => [skill.id, skill.name]));

  return {
    users: { total: users, active: activeUsers, verified: verifiedUsers, admins },
    content: {
      offerings,
      exchanges,
      sessions,
      plans,
      reviews,
      feedbacks,
      notifications,
      averageReviewRating: reviewAvg._avg.rating ?? null,
    },
    breakdown: {
      exchanges: Object.fromEntries(exchangesByStatus.map((row) => [row.status, row._count])),
      sessions: Object.fromEntries(sessionsByStatus.map((row) => [row.status, row._count])),
    },
    topSkills: topSkills.map((row) => ({ name: skillName.get(row.skillId), offerings: row._count })),
    recentUsers,
  };
}

export async function listUsers(query: AdminUsersQuery) {
  const where = {
    ...(query.q
      ? {
          OR: [
            { email: { contains: query.q, mode: "insensitive" as const } },
            { username: { contains: query.q, mode: "insensitive" as const } },
            { firstName: { contains: query.q, mode: "insensitive" as const } },
            { lastName: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(query.isActive ? { isActive: query.isActive === "true" } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: ADMIN_USER_SELECT,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function updateUserStatus(adminId: string, userId: string, input: UpdateUserStatusInput) {
  if (adminId === userId) throw new ApiError(400, "You cannot change your own account status");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw new ApiError(404, "User not found");
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: input.isActive, isAdmin: input.isAdmin },
    select: { id: true, isActive: true, isAdmin: true },
  });
}

// Content an admin might want to moderate: recent reviews and feedback.
export async function moderationQueue() {
  const [reviews, feedbacks] = await Promise.all([
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, username: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    }),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        content: true,
        rating: true,
        createdAt: true,
        author: { select: { id: true, username: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  return { reviews, feedbacks };
}

export async function deleteReviewAsAdmin(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) throw new ApiError(404, "Review not found");
  await prisma.review.delete({ where: { id: reviewId } });
  void userId;
}

export async function deleteFeedbackAsAdmin(userId: string, feedbackId: string) {
  const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId }, select: { id: true } });
  if (!feedback) throw new ApiError(404, "Feedback not found");
  await prisma.feedback.delete({ where: { id: feedbackId } });
  void userId;
}