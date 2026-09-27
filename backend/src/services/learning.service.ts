import { ChallengeDifficulty, ChallengeType, PlanStatus, Prisma, SubmissionStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";
import type {
  CreateChallengeInput,
  CreateFeedbackInput,
  CreatePlanInput,
  CreateSubmissionInput,
  ReviewSubmissionInput,
  UpdateChallengeInput,
  UpdatePlanInput,
} from "../validators/learning.validator";

const USER_BRIEF = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const;

const PLAN_SELECT: Prisma.LearningPlanSelect = {
  id: true,
  title: true,
  description: true,
  goals: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: USER_BRIEF },
  author: { select: USER_BRIEF },
  skill: { select: { id: true, name: true, slug: true } },
  exchange: { select: { id: true, offering: { select: { id: true, title: true, skill: { select: { name: true } } } } } },
  challenges: {
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      difficulty: true,
      dueDate: true,
      order: true,
      createdAt: true,
      updatedAt: true,
      submissions: {
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          content: true,
          status: true,
          feedback: true,
          submittedAt: true,
          reviewedAt: true,
          submitter: { select: USER_BRIEF },
          reviewer: { select: USER_BRIEF },
        },
      },
    },
  },
} as Prisma.LearningPlanSelect;

// ─── Plans ──────────────────────────────────────────────────────────────────
function planWhereFor(userId: string): Prisma.LearningPlanWhereInput {
  return { OR: [{ ownerId: userId }, { authorId: userId }] };
}

export async function listMyPlans(userId: string) {
  return prisma.learningPlan.findMany({
    where: planWhereFor(userId),
    orderBy: { updatedAt: "desc" },
    select: PLAN_SELECT,
  });
}

export async function getPlan(userId: string, planId: string) {
  const plan = await prisma.learningPlan.findFirst({
    where: { id: planId, ...planWhereFor(userId) },
    select: PLAN_SELECT,
  });
  if (!plan) throw new ApiError(404, "Plan not found");
  return plan;
}

async function assertUsersExist(ownerId: string, authorId?: string) {
  const where: Prisma.UserWhereInput = { id: { in: [ownerId, ...(authorId ? [authorId] : [])] } };
  const found = await prisma.user.findMany({ where, select: { id: true } });
  const foundIds = new Set(found.map((user) => user.id));
  if (!foundIds.has(ownerId)) throw new ApiError(404, "Plan owner not found");
  if (authorId && !foundIds.has(authorId)) throw new ApiError(404, "Plan author not found");
}

export async function createPlan(userId: string, input: CreatePlanInput) {
  await assertUsersExist(input.ownerId, userId === input.ownerId ? undefined : userId);

  if (input.skillId) {
    const skill = await prisma.skill.findUnique({ where: { id: input.skillId }, select: { id: true } });
    if (!skill) throw new ApiError(404, "Skill not found");
  }

  const exchangeId = input.exchangeId;
  if (exchangeId) {
    const exchange = await prisma.skillExchange.findUnique({
      where: { id: exchangeId },
      select: { requesterId: true, providerId: true },
    });
    if (!exchange) throw new ApiError(404, "Exchange not found");
    const involved = [exchange.requesterId, exchange.providerId];
    if (!involved.includes(input.ownerId) || !involved.includes(userId)) {
      throw new ApiError(403, "Both users must be part of that exchange");
    }
  }

  return prisma.learningPlan.create({
    data: {
      ownerId: input.ownerId,
      authorId: userId === input.ownerId ? null : userId,
      skillId: input.skillId,
      exchangeId,
      title: input.title,
      description: input.description,
      goals: input.goals,
    },
    select: PLAN_SELECT,
  });
}

export async function updatePlan(userId: string, planId: string, input: UpdatePlanInput) {
  const plan = await getPlan(userId, planId);
  const data: Prisma.LearningPlanUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.goals !== undefined) data.goals = input.goals;
  if (input.status !== undefined) data.status = input.status as PlanStatus;
  return prisma.learningPlan.update({ where: { id: plan.id }, data, select: PLAN_SELECT });
}

export async function deletePlan(userId: string, planId: string) {
  const plan = await getPlan(userId, planId);
  await prisma.learningPlan.delete({ where: { id: plan.id } });
}

// ─── Challenges ─────────────────────────────────────────────────────────────
async function getPlanForEdit(userId: string, planId: string) {
  const plan = await prisma.learningPlan.findFirst({
    where: { id: planId, ...planWhereFor(userId) },
    select: { id: true, ownerId: true, authorId: true },
  });
  if (!plan) throw new ApiError(404, "Plan not found");
  return plan;
}

export async function createChallenge(userId: string, input: CreateChallengeInput) {
  await getPlanForEdit(userId, input.planId);
  return prisma.challenge.create({
    data: {
      planId: input.planId,
      title: input.title,
      description: input.description,
      type: input.type as ChallengeType,
      difficulty: input.difficulty as ChallengeDifficulty,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      order: input.order,
    },
    select: challengeSelect(true),
  });
}

function challengeSelect(withSubmissions: boolean): Prisma.ChallengeSelect {
  return {
    id: true,
    planId: true,
    title: true,
    description: true,
    type: true,
    difficulty: true,
    dueDate: true,
    order: true,
    createdAt: true,
    updatedAt: true,
    ...(withSubmissions
      ? {
          submissions: {
            orderBy: { submittedAt: "desc" },
            select: {
              id: true,
              content: true,
              status: true,
              feedback: true,
              submittedAt: true,
              reviewedAt: true,
              submitter: { select: USER_BRIEF },
              reviewer: { select: USER_BRIEF },
            },
          },
        }
      : {}),
  };
}

async function getChallengeInMyPlan(userId: string, challengeId: string) {
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, plan: planWhereFor(userId) },
    select: { id: true, plan: { select: { ownerId: true, authorId: true } } },
  });
  if (!challenge) throw new ApiError(404, "Challenge not found");
  return challenge;
}

export async function updateChallenge(userId: string, challengeId: string, input: UpdateChallengeInput) {
  const challenge = await getChallengeInMyPlan(userId, challengeId);
  const data: Prisma.ChallengeUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.type !== undefined) data.type = input.type as ChallengeType;
  if (input.difficulty !== undefined) data.difficulty = input.difficulty as ChallengeDifficulty;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.order !== undefined) data.order = input.order;
  return prisma.challenge.update({ where: { id: challenge.id }, data, select: challengeSelect(false) });
}

export async function deleteChallenge(userId: string, challengeId: string) {
  const challenge = await getChallengeInMyPlan(userId, challengeId);
  await prisma.challenge.delete({ where: { id: challenge.id } });
}

// ─── Submissions ────────────────────────────────────────────────────────────
export async function submitChallenge(userId: string, challengeId: string, input: CreateSubmissionInput) {
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId },
    select: { id: true, title: true, plan: { select: { ownerId: true, authorId: true } } },
  });
  if (!challenge) throw new ApiError(404, "Challenge not found");
  if (challenge.plan.ownerId !== userId) {
    throw new ApiError(403, "Only the plan owner can submit work");
  }
  const result = await prisma.challengeSubmission.create({
    data: {
      challengeId: challenge.id,
      submitterId: userId,
      content: input.content,
      attachmentUrl: input.attachmentUrl,
    },
    select: SUBMISSION_SELECT,
  });

  // Notify the teacher/plan author (or owner if no author) to review.
  const notifyId = challenge.plan.authorId ?? challenge.plan.ownerId;
  await createNotification({
    userId: notifyId,
    type: "learning",
    title: "New submission to review",
    body: `Work submitted for: ${challenge.title}`,
    data: { href: "/learning", challengeId: challenge.id },
  });

  return result;
}

export async function reviewSubmission(
  userId: string,
  submissionId: string,
  input: ReviewSubmissionInput
) {
  const submission = await prisma.challengeSubmission.findFirst({
    where: { id: submissionId },
    select: {
      id: true,
      submitterId: true,
      challenge: { select: { id: true, title: true, plan: { select: { authorId: true, ownerId: true } } } },
    },
  });
  if (!submission) throw new ApiError(404, "Submission not found");
  const plan = submission.challenge.plan;
  if (plan.authorId !== userId && plan.ownerId !== userId) {
    throw new ApiError(403, "Only the teacher or plan owner can review submissions");
  }
  const result = await prisma.challengeSubmission.update({
    where: { id: submission.id },
    data: {
      status: input.status as SubmissionStatus,
      feedback: input.feedback,
      reviewedAt: new Date(),
      reviewerId: userId,
    },
    select: SUBMISSION_SELECT,
  });

  await createNotification({
    userId: submission.submitterId,
    type: "learning",
    title: `Submission ${input.status === "APPROVED" ? "approved" : "rejected"}`,
    body: `For challenge: ${submission.challenge.title}`,
    data: { href: "/learning", submissionId: result.id },
  });

  return result;
}

// ─── Feedback ───────────────────────────────────────────────────────────────
export async function createFeedback(userId: string, input: CreateFeedbackInput) {
  if (input.recipientId === userId) throw new ApiError(400, "You cannot give feedback to yourself");
  const recipient = await prisma.user.findUnique({ where: { id: input.recipientId }, select: { id: true } });
  if (!recipient) throw new ApiError(404, "Recipient not found");

  if (input.exchangeId) {
    const exchange = await prisma.skillExchange.findUnique({
      where: { id: input.exchangeId },
      select: { requesterId: true, providerId: true },
    });
    if (!exchange) throw new ApiError(404, "Exchange not found");
    if (![exchange.requesterId, exchange.providerId].includes(userId)) {
      throw new ApiError(403, "Only exchange participants can give feedback");
    }
  }
  if (input.submissionId) {
    const submission = await prisma.challengeSubmission.findUnique({
      where: { id: input.submissionId },
      select: { challenge: { select: { plan: { select: { authorId: true, ownerId: true } } } } },
    });
    if (!submission) throw new ApiError(404, "Submission not found");
    const plan = submission.challenge.plan;
    if (![plan.ownerId, plan.authorId].filter(Boolean).includes(userId)) {
      throw new ApiError(403, "Only plan participants can give submission feedback");
    }
  }

  return prisma.feedback.create({
    data: {
      authorId: userId,
      recipientId: input.recipientId,
      exchangeId: input.exchangeId,
      submissionId: input.submissionId,
      rating: input.rating,
      content: input.content,
    },
    select: {
      id: true,
      rating: true,
      content: true,
      createdAt: true,
      author: { select: USER_BRIEF },
      recipient: { select: USER_BRIEF },
    },
  });
}

const SUBMISSION_SELECT: Prisma.ChallengeSubmissionSelect = {
  id: true,
  content: true,
  status: true,
  feedback: true,
  submittedAt: true,
  reviewedAt: true,
  submitter: { select: USER_BRIEF },
  reviewer: { select: USER_BRIEF },
};