import { beforeAll, afterAll } from "vitest";
import { prisma } from "../src/config/database";

// Every table except Prisma's own migration bookkeeping.
const TABLES = [
  "wallet_transactions",
  "material_purchases",
  "materials",
  "payments",
  "notifications",
  "user_achievements",
  "achievements",
  "reviews",
  "feedbacks",
  "challenge_submissions",
  "challenges",
  "learning_plans",
  "messages",
  "conversations",
  "sessions",
  "availabilities",
  "skill_exchanges",
  "skill_offerings",
  "user_skills",
  "skills",
  "skill_categories",
  "password_reset_tokens",
  "refresh_tokens",
  "users",
];

export async function resetDatabase(): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? "";
  // A guard rail, not a formality: this suite wipes the database it points at.
  if (!/_test/.test(url)) {
    throw new Error(
      "Refusing to run tests: set TEST_DATABASE_URL to a database whose name contains '_test'.\n" +
        "  TEST_DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/skillloop_test?schema=public\" npm test"
    );
  }
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
