import { defineConfig } from "vitest/config";

// Integration tests run against a real PostgreSQL database. Point
// TEST_DATABASE_URL at a throwaway *test* database (never your dev one):
//
//   TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillloop_test?schema=public" npm test
//
// The suite truncates every table before it runs, which is exactly why the
// name check in tests/setup.ts refuses to start against a non-test database.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // One database, one file at a time: no cross-file interference.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      JWT_SECRET: "test-jwt-secret-0123456789abcdef",
      JWT_EXPIRES_IN: "15m",
      REFRESH_TOKEN_SECRET: "test-refresh-secret-0123456789abcdef",
      REFRESH_TOKEN_EXPIRES_IN: "30d",
      COOKIE_SECRET: "test-cookie-secret-0123456789abcdef",
      CLIENT_URL: "http://localhost:5173",
      // The rate limiter would otherwise throttle the suite itself.
      RATE_LIMIT_MAX: "100000",
      TRUST_PROXY: "0",
    },
  },
});
