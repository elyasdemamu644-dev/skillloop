import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/database";

export const app = createApp();

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

export function authed(user: TestUser): { Authorization: string } {
  return { Authorization: `Bearer ${user.token}` };
}

export async function registerUser(overrides: Partial<{ firstName: string }> = {}): Promise<TestUser> {
  const suffix = unique("u");
  const email = `${suffix}@test.local`;
  const res = await request(app).post("/api/auth/register").send({
    email,
    username: suffix.slice(0, 24),
    password: "Password123!",
    firstName: overrides.firstName ?? "Test",
    lastName: "User",
  });
  if (res.status !== 201) {
    throw new Error(`Registration failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.data.user.id, email, token: res.body.data.accessToken };
}

export async function makeAdmin(user: TestUser): Promise<void> {
  await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
}

export async function deactivate(user: TestUser): Promise<void> {
  await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
}

export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
  return user?.walletBalance ?? 0;
}

/** Creates a completed CARD top-up and returns the resulting payment id. */
export async function topUp(user: TestUser, amount: number): Promise<string> {
  const created = await request(app).post("/api/payments").set(authed(user)).send({ amount, method: "CARD" });
  if (created.status !== 201) {
    throw new Error(`Top-up failed (${created.status}): ${JSON.stringify(created.body)}`);
  }
  const completed = await request(app)
    .post(`/api/payments/${created.body.data.id}/complete`)
    .set(authed(user));
  if (completed.status !== 200) {
    throw new Error(`Top-up completion failed (${completed.status}): ${JSON.stringify(completed.body)}`);
  }
  return created.body.data.id;
}

/** Creates a PENDING wallet transfer from payer to recipient. */
export async function createTransfer(payer: TestUser, recipientId: string, amount: number): Promise<string> {
  const res = await request(app)
    .post("/api/payments")
    .set(authed(payer))
    .send({ amount, recipientId, method: "CREDITS" });
  if (res.status !== 201) {
    throw new Error(`Transfer creation failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.data.id;
}

export async function completeTransfer(payer: TestUser, paymentId: string) {
  return request(app).post(`/api/payments/${paymentId}/complete`).set(authed(payer));
}

// ─── Domain fixtures ────────────────────────────────────────────────────────
// Some states are tedious to reach through the API (an accepted exchange with a
// completed session, for example). Seeding those rows directly keeps each test
// focused on the rule it is actually proving.

export async function seedSkill() {
  const suffix = unique("s");
  const category = await prisma.skillCategory.create({
    data: { name: `Category ${suffix}`, slug: `category-${suffix}` },
  });
  const skill = await prisma.skill.create({
    data: { name: `Skill ${suffix}`, slug: `skill-${suffix}`, categoryId: category.id },
  });
  return { category, skill };
}

export async function seedExchange(teacherId: string, learnerId: string, status: "REQUESTED" | "ACCEPTED" | "COMPLETED" = "ACCEPTED") {
  const { skill } = await seedSkill();
  const offering = await prisma.skillOffering.create({
    data: {
      userId: teacherId,
      skillId: skill.id,
      title: "An offering",
      description: "A description long enough to be valid.",
      level: "BEGINNER",
      mode: "ONLINE",
    },
  });
  const exchange = await prisma.skillExchange.create({
    data: { requesterId: learnerId, providerId: teacherId, offeringId: offering.id, status },
  });
  return { skill, offering, exchange };
}

export async function seedSession(
  exchangeId: string,
  teacherId: string,
  learnerId: string,
  status: "PROPOSED" | "CONFIRMED" | "COMPLETED" = "COMPLETED"
) {
  const startsAt = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.session.create({
    data: {
      exchangeId,
      learnerId,
      teacherId,
      startsAt,
      endTime: new Date(startsAt.getTime() + 60 * 60 * 1000),
      status,
    },
  });
}
