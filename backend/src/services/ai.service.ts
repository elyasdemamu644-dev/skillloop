import { SkillLevel } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import type { GeneratePlanInput } from "../validators/ai.validator";

const USER_BRIEF = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
  location: true,
  bio: true,
} as const;

function pickLevel(level: SkillLevel): SkillLevel {
  return level;
}

export async function getRecommendations(userId: string) {
  const learnSkills = await prisma.userSkill.findMany({
    where: { userId, type: { in: ["LEARN", "BOTH"] } },
    select: { skillId: true, level: true },
  });

  const wantedSkillIds = learnSkills.map((skill) => skill.skillId);
  const wantLevels = learnSkills.map((skill) => skill.level);

  const offerings = await prisma.skillOffering.findMany({
    where: {
      isActive: true,
      userId: { not: userId },
      ...(wantedSkillIds.length > 0 ? { skillId: { in: wantedSkillIds } } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      level: true,
      mode: true,
      user: { select: USER_BRIEF },
      skill: { select: { id: true, name: true, category: { select: { name: true } } } },
      _count: { select: { exchanges: true } },
    },
    take: 50,
  });

  if (offerings.length === 0) {
    const popular = await prisma.skillOffering.findMany({
      where: { isActive: true, userId: { not: userId } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        mode: true,
        user: { select: USER_BRIEF },
        skill: { select: { id: true, name: true, category: { select: { name: true } } } },
      },
    });
    return {
      items: popular.map((offering) => ({
        ...offering,
        matchScore: 0,
        reason: "Popular pick — add this skill to your profile for better matches.",
      })),
    };
  }

  // Reviews per teacher to nudge well-reviewed people up the list.
  const reviewAggs = await prisma.review.groupBy({
    by: ["recipientId"],
    _avg: { rating: true },
    _count: { _all: true },
  });
  const ratingByRecipient = new Map(
    reviewAggs.map((row) => [row.recipientId, { avg: row._avg.rating ?? 0, count: row._count._all }])
  );

  const scored = offerings
    .map((offering) => {
      const wantedIndex = wantedSkillIds.indexOf(offering.skill.id);
      let score = 0;
      if (wantedIndex !== -1) {
        const myLevel = wantLevels[wantedIndex];
        score += 40;
        if (myLevel === "BEGINNER") score += offering.level === "BEGINNER" || offering.level === "INTERMEDIATE" ? 15 : 0;
        else if (myLevel === "INTERMEDIATE") score += offering.level !== "EXPERT" ? 10 : 0;
        else score += 5;
      }
      const rating = ratingByRecipient.get(offering.user.id);
      if (rating) score += Math.min(rating.avg * 4, 30) + Math.min(rating.count * 2, 15);
      return { ...offering, matchScore: Math.round(score) };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  return {
    items: scored.map(({ matchScore, ...offering }) => ({
      ...offering,
      matchScore,
      reason:
        matchScore >= 40
          ? `Matches your ${offering.skill.name} learning goal.`
          : "Relevant to your interests.",
    })),
  };
}

// Mock curriculum generator: returns a structured, level-aware plan outline.
// Pure helper — the client can turn it into a LearningPlan.
export async function generatePlan(input: GeneratePlanInput) {
  const skill = await prisma.skill.findUnique({
    where: { id: input.skillId },
    select: { id: true, name: true, category: { select: { name: true } } },
  });
  if (!skill) throw new ApiError(404, "Skill not found");

  const level = pickLevel(input.level ?? "BEGINNER");

  const stages =
    level === "BEGINNER"
      ? [
          { title: "Getting started", type: "TASK", difficulty: "EASY", description: `Set up your environment for ${skill.name} and run your first example.` },
          { title: "Core fundamentals", type: "QUIZ", difficulty: "EASY", description: `Check your understanding of ${skill.name} basics.` },
          { title: "First real project", type: "PROJECT", difficulty: "MEDIUM", description: `Build a small ${skill.name} project end to end.` },
          { title: "Show your progress", type: "MILESTONE", difficulty: "MEDIUM", description: "Review what you learned and share it with your mentor." },
        ]
      : level === "INTERMEDIATE"
      ? [
          { title: "Level assessment", type: "QUIZ", difficulty: "MEDIUM", description: `Diagnose your current ${skill.name} strengths and gaps.` },
          { title: "Advanced patterns", type: "TASK", difficulty: "MEDIUM", description: `Practice the patterns professionals use in ${skill.name}.` },
          { title: "Capstone build", type: "PROJECT", difficulty: "HARD", description: `Ship a realistic ${skill.name} project with clean structure.` },
          { title: "Reflection & polish", type: "MILESTONE", difficulty: "MEDIUM", description: "Get feedback and refine your approach." },
        ]
      : [
          { title: "Expert audit", type: "QUIZ", difficulty: "HARD", description: `Stress-test your ${skill.name} mastery with edge cases.` },
          { title: "Optimization sprint", type: "TASK", difficulty: "HARD", description: `Optimize a real ${skill.name} workload and measure it.` },
          { title: "Teach it back", type: "PROJECT", difficulty: "HARD", description: `Document and teach a ${skill.name} topic to solidify mastery.` },
          { title: "Portfolio showcase", type: "MILESTONE", difficulty: "HARD", description: "Package your work into a presentation-ready showcase." },
        ];

  return {
    title: `${skill.name} — ${level.charAt(0) + level.slice(1).toLowerCase()} path`,
    description: `A step-by-step learning path for ${skill.name} (${level.toLowerCase()}), generated for your level.`,
    goals: input.goals ?? `Master ${skill.name} at ${level.toLowerCase()} level.`,
    skill: { id: skill.id, name: skill.name, category: skill.category.name },
    stages,
  };
}

export async function matchMentors(userId: string, skillId: string) {
  const skill = await prisma.skill.findUnique({ where: { id: skillId }, select: { id: true, name: true } });
  if (!skill) throw new ApiError(404, "Skill not found");

  const [skillRows, reviewAggs, exchanges] = await Promise.all([
    prisma.userSkill.findMany({
      where: { skillId, type: { in: ["TEACH", "BOTH"] }, userId: { not: userId } },
      select: {
        userId: true,
        level: true,
        yearsExperience: true,
        isVerified: true,
        description: true,
        user: { select: USER_BRIEF },
      },
    }),
    prisma.review.groupBy({
      by: ["recipientId"],
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.skillExchange.findMany({
      where: {
        status: "COMPLETED",
        providerId: { not: userId },
        offering: { skillId },
      },
      select: { providerId: true },
    }),
  ]);

  const ratingByRecipient = new Map(
    reviewAggs.map((row) => [row.recipientId, { avg: row._avg.rating ?? 0, count: row._count._all }])
  );
  const completedByTeacher = new Map<string, number>();
  for (const exchange of exchanges) {
    completedByTeacher.set(exchange.providerId, (completedByTeacher.get(exchange.providerId) ?? 0) + 1);
  }

  const matches = skillRows
    .map((row) => {
      const rating = ratingByRecipient.get(row.userId);
      const completed = completedByTeacher.get(row.userId) ?? 0;
      const levelScore =
        row.level === "EXPERT" ? 30 : row.level === "ADVANCED" ? 25 : row.level === "INTERMEDIATE" ? 15 : 5;
      const completedScore = Math.min(completed * 4, 20);
      const ratingScore = rating ? Math.min(rating.avg * 6, 30) : 0;
      const verified = row.isVerified ? 5 : 0;
      return {
        user: row.user,
        teachesLevel: row.level,
        yearsExperience: row.yearsExperience,
        rating: rating?.avg ?? 0,
        ratingCount: rating?.count ?? 0,
        completedExchanges: completed,
        matchScore: levelScore + completedScore + ratingScore + verified,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  return { skill, items: matches };
}