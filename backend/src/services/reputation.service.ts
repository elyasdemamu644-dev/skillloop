import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";
import type { CreateReviewInput, UpdateReviewInput } from "../validators/reputation.validator";

const USER_BRIEF = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const;

const REVIEW_SELECT = {
  id: true,
  rating: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: USER_BRIEF },
  recipient: { select: USER_BRIEF },
  exchange: {
    select: {
      id: true,
      offering: { select: { id: true, title: true, skill: { select: { name: true } } } },
    },
  },
  session: { select: { id: true, startsAt: true, status: true } },
} as const;

async function assertUserExists(id: string, label: string): Promise<void> {
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new ApiError(404, `${label} not found`);
}

// ─── Reviews ────────────────────────────────────────────────────────────────
export async function createReview(userId: string, input: CreateReviewInput) {
  if (input.recipientId === userId) {
    throw new ApiError(400, "You cannot review yourself");
  }
  if (input.exchangeId && input.sessionId) {
    throw new ApiError(400, "Attach the review to either an exchange or a session, not both");
  }

  let recipientId = input.recipientId;

  if (input.exchangeId) {
    const exchange = await prisma.skillExchange.findUnique({
      where: { id: input.exchangeId },
      select: { id: true, requesterId: true, providerId: true, status: true },
    });
    if (!exchange) throw new ApiError(404, "Exchange not found");
    if (exchange.requesterId !== userId && exchange.providerId !== userId) {
      throw new ApiError(403, "You must be part of this exchange to review it");
    }
    if (exchange.status !== "COMPLETED") {
      throw new ApiError(400, "Exchange must be completed before it can be reviewed");
    }
    const other = exchange.requesterId === userId ? exchange.providerId : exchange.requesterId;
    if (input.recipientId !== other) {
      throw new ApiError(400, "recipientId must be the other participant of the exchange");
    }
    const existing = await prisma.review.findUnique({
      where: { authorId_exchangeId: { authorId: userId, exchangeId: input.exchangeId } },
      select: { id: true },
    });
    if (existing) throw new ApiError(409, "You already reviewed this exchange");
    recipientId = other;
  }

  if (input.sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: input.sessionId },
      select: { id: true, learnerId: true, teacherId: true, status: true },
    });
    if (!session) throw new ApiError(404, "Session not found");
    if (session.learnerId !== userId && session.teacherId !== userId) {
      throw new ApiError(403, "You must be part of this session to review it");
    }
    if (session.status !== "COMPLETED") {
      throw new ApiError(400, "Session must be completed before it can be reviewed");
    }
    const other = session.learnerId === userId ? session.teacherId : session.learnerId;
    if (input.recipientId !== other) {
      throw new ApiError(400, "recipientId must be the other participant of the session");
    }
    // One review per author per session — otherwise a single user can stack
    // unlimited ratings on the same session and skew the reputation average.
    const existingSessionReview = await prisma.review.findFirst({
      where: { authorId: userId, sessionId: input.sessionId },
      select: { id: true },
    });
    if (existingSessionReview) {
      throw new ApiError(409, "You already reviewed this session");
    }
    recipientId = other;
  }

  await assertUserExists(recipientId, "Recipient");

  const review = await prisma.review.create({
    data: {
      authorId: userId,
      recipientId,
      exchangeId: input.exchangeId ?? null,
      sessionId: input.sessionId ?? null,
      rating: input.rating,
      content: input.content,
    },
    select: REVIEW_SELECT,
  });

  await createNotification({
    userId: recipientId,
    type: "review",
    title: `You received a ${input.rating}-star review`,
    body: input.content,
    data: { href: "/reputation" },
  });

  return review;
}

export async function listReviewsForUser(userId: string) {
  await assertUserExists(userId, "User");
  return prisma.review.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    select: REVIEW_SELECT,
  });
}

export async function listMyReviews(userId: string) {
  return prisma.review.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    select: REVIEW_SELECT,
  });
}

// Completed exchanges/sessions the user is part of but hasn't reviewed yet.
export async function listEligibleForReview(userId: string) {
  const [exchanges, sessions, reviewed] = await Promise.all([
    prisma.skillExchange.findMany({
      where: {
        status: "COMPLETED",
        OR: [{ requesterId: userId }, { providerId: userId }],
      },
      select: {
        id: true,
        requesterId: true,
        providerId: true,
        requester: { select: USER_BRIEF },
        provider: { select: USER_BRIEF },
        offering: { select: { id: true, title: true, skill: { select: { name: true } } } },
      },
    }),
    prisma.session.findMany({
      where: {
        status: "COMPLETED",
        OR: [{ learnerId: userId }, { teacherId: userId }],
      },
      select: {
        id: true,
        learnerId: true,
        teacherId: true,
        learner: { select: USER_BRIEF },
        teacher: { select: USER_BRIEF },
        startsAt: true,
      },
    }),
    prisma.review.findMany({ where: { authorId: userId }, select: { exchangeId: true, sessionId: true } }),
  ]);

  const reviewedKeys = new Set<string>();
  reviewed.forEach((row) => {
    if (row.exchangeId) reviewedKeys.add(`exchange:${row.exchangeId}`);
    if (row.sessionId) reviewedKeys.add(`session:${row.sessionId}`);
  });

  type Partner = { id: string; username: string; firstName: string; lastName: string; avatar: string | null };
  const items: Array<{ type: "exchange" | "session"; id: string; title: string; partner: Partner }> = [];
  for (const exchange of exchanges) {
    if (reviewedKeys.has(`exchange:${exchange.id}`)) continue;
    const partner = exchange.requesterId === userId ? exchange.provider : exchange.requester;
    items.push({
      type: "exchange",
      id: exchange.id,
      title: `${exchange.offering.skill.name} — ${exchange.offering.title}`,
      partner,
    });
  }
  for (const session of sessions) {
    if (reviewedKeys.has(`session:${session.id}`)) continue;
    const partner = session.learnerId === userId ? session.teacher : session.learner;
    items.push({
      type: "session",
      id: session.id,
      title: `Session on ${new Date(session.startsAt).toLocaleDateString()}`,
      partner,
    });
  }
  return items;
}

async function getOwnedReview(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new ApiError(404, "Review not found");
  if (review.authorId !== userId) throw new ApiError(403, "Only the review author can do this");
  return review;
}

export async function updateReview(userId: string, reviewId: string, input: UpdateReviewInput) {
  await getOwnedReview(userId, reviewId);
  if (!input.rating && !input.content) throw new ApiError(400, "Nothing to update");
  return prisma.review.update({
    where: { id: reviewId },
    data: { rating: input.rating, content: input.content },
    select: REVIEW_SELECT,
  });
}

export async function deleteReview(userId: string, reviewId: string) {
  await getOwnedReview(userId, reviewId);
  await prisma.review.delete({ where: { id: reviewId } });
}

export async function reputationSummary(userId: string) {
  await assertUserExists(userId, "User");
  const [reviews, badges] = await Promise.all([
    prisma.review.findMany({ where: { recipientId: userId }, select: { rating: true } }),
    prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
  ]);

  const total = reviews.length;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  const distribution = {
    5: reviews.filter((review) => review.rating === 5).length,
    4: reviews.filter((review) => review.rating === 4).length,
    3: reviews.filter((review) => review.rating === 3).length,
    2: reviews.filter((review) => review.rating === 2).length,
    1: reviews.filter((review) => review.rating === 1).length,
  };

  return {
    average: total ? Math.round((sum / total) * 100) / 100 : null,
    total,
    distribution,
    points: badges.reduce((acc, badge) => acc + badge.achievement.points, 0),
    badges: badges.map((badge) => ({
      id: badge.achievement.id,
      name: badge.achievement.name,
      description: badge.achievement.description,
      icon: badge.achievement.icon,
      tier: badge.achievement.tier,
      points: badge.achievement.points,
      unlockedAt: badge.unlockedAt,
    })),
  };
}

// ─── Achievements ───────────────────────────────────────────────────────────
const ACHIEVEMENT_DEFS = [
  {
    name: "First Review",
    description: "Received your first review.",
    icon: "⭐",
    category: "community",
    tier: 1,
    points: 10,
    criteria: { check: "reviews_received_count", min: 1 },
  },
  {
    name: "Rising Star",
    description: "Average review of 4.5+ across at least 3 reviews.",
    icon: "🌟",
    category: "community",
    tier: 2,
    points: 25,
    criteria: { check: "reviews_received_avg", min: 4.5, minCount: 3 },
  },
  {
    name: "First Session",
    description: "Completed your first session.",
    icon: "🎓",
    category: "sessions",
    tier: 1,
    points: 10,
    criteria: { check: "sessions_completed", min: 1 },
  },
  {
    name: "Session Regular",
    description: "Completed 10 sessions.",
    icon: "📅",
    category: "sessions",
    tier: 2,
    points: 25,
    criteria: { check: "sessions_completed", min: 10 },
  },
  {
    name: "Dedicated Teacher",
    description: "Completed 5 sessions as the teacher.",
    icon: "🧑‍🏫",
    category: "teaching",
    tier: 2,
    points: 25,
    criteria: { check: "sessions_taught", min: 5 },
  },
  {
    name: "First Exchange",
    description: "Completed your first exchange.",
    icon: "🤝",
    category: "community",
    tier: 1,
    points: 10,
    criteria: { check: "exchanges_completed", min: 1 },
  },
  {
    name: "Achiever",
    description: "Completed 10 challenges.",
    icon: "🏆",
    category: "learning",
    tier: 2,
    points: 25,
    criteria: { check: "challenges_completed", min: 10 },
  },
  {
    name: "Planner",
    description: "Created your first learning plan.",
    icon: "📋",
    category: "learning",
    tier: 1,
    points: 10,
    criteria: { check: "plans_created", min: 1 },
  },
  {
    name: "Feedback Giver",
    description: "Gave feedback 3 times.",
    icon: "💡",
    category: "community",
    tier: 1,
    points: 10,
    criteria: { check: "feedback_given", min: 3 },
  },
  {
    name: "Chatterbox",
    description: "Sent your first 20 messages.",
    icon: "💬",
    category: "community",
    tier: 1,
    points: 10,
    criteria: { check: "messages_sent", min: 20 },
  },
];

type AchievementCriteria = {
  check: string;
  min: number;
  minCount?: number;
};

async function ensureAchievements() {
  await Promise.all(
    ACHIEVEMENT_DEFS.map((definition) =>
      prisma.achievement.upsert({
        where: { name: definition.name },
        update: {},
        create: definition,
      })
    )
  );
}

function matchesCriteria(criteria: AchievementCriteria, context: Record<string, number>): boolean {
  const value = context[criteria.check];
  if (typeof value !== "number") return false;
  if (criteria.minCount && (context.reviews_received_count ?? 0) < criteria.minCount) return false;
  return value >= criteria.min;
}

export async function listAchievements() {
  await ensureAchievements();
  const achievements = await prisma.achievement.findMany({
    orderBy: [{ category: "asc" }, { points: "asc" }],
  });
  const unlocked = await prisma.userAchievement.groupBy({
    by: ["achievementId"],
    _count: true,
  });
  const unlockedMap = new Map(unlocked.map((row) => [row.achievementId, row._count]));
  return achievements.map((achievement) => ({
    ...achievement,
    usersUnlocked: unlockedMap.get(achievement.id) ?? 0,
  }));
}

export async function listMyAchievements(userId: string) {
  return prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { unlockedAt: "desc" },
  });
}

export async function evaluateAchievements(userId: string) {
  await assertUserExists(userId, "User");
  const [reviewCount, reviewAvg, sessionsCompleted, sessionsTaught, exchangesCompleted, challengesCompleted, plansCreated, feedbackGiven, messagesSent] =
    await Promise.all([
      prisma.review.count({ where: { recipientId: userId } }),
      prisma.review.aggregate({ where: { recipientId: userId }, _avg: { rating: true } }),
      prisma.session.count({ where: { OR: [{ learnerId: userId }, { teacherId: userId }], status: "COMPLETED" } }),
      prisma.session.count({ where: { teacherId: userId, status: "COMPLETED" } }),
      prisma.skillExchange.count({ where: { OR: [{ requesterId: userId }, { providerId: userId }], status: "COMPLETED" } }),
      prisma.challengeSubmission.count({ where: { submitterId: userId, status: "APPROVED" } }),
      prisma.learningPlan.count({ where: { ownerId: userId } }),
      prisma.feedback.count({ where: { authorId: userId } }),
      prisma.message.count({ where: { senderId: userId } }),
    ]);

  const context: Record<string, number> = {
    reviews_received_count: reviewCount,
    reviews_received_avg: reviewAvg._avg.rating ?? 0,
    sessions_completed: sessionsCompleted,
    sessions_taught: sessionsTaught,
    exchanges_completed: exchangesCompleted,
    challenges_completed: challengesCompleted,
    plans_created: plansCreated,
    feedback_given: feedbackGiven,
    messages_sent: messagesSent,
  };

  await ensureAchievements();
  const [all, owned] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);
  const ownedSet = new Set(owned.map((row) => row.achievementId));
  const earned = all.filter(
    (achievement) => !ownedSet.has(achievement.id) && matchesCriteria(achievement.criteria as AchievementCriteria, context)
  );

  if (earned.length > 0) {
    await prisma.userAchievement.createMany({
      data: earned.map((achievement) => ({ userId, achievementId: achievement.id })),
      skipDuplicates: true,
    });
    await Promise.all(
      earned.map((achievement) =>
        createNotification({
          userId,
          type: "badge",
          title: `Badge unlocked: ${achievement.name}`,
          body: achievement.description,
          data: { href: "/reputation", achievementId: achievement.id },
        })
      )
    );
  }

  return prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { unlockedAt: "desc" },
  });
}