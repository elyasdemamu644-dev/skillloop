import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(10, "JWT_SECRET must be set to a long random string"),
  // Access tokens are meant to be short-lived: a stolen one stops working in
  // minutes, and the refresh cookie silently mints a new one. Anything close
  // to a day defeats that design.
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_SECRET: z.string().min(10, "REFRESH_TOKEN_SECRET must be set"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),

  COOKIE_SECRET: z.string().min(10, "COOKIE_SECRET must be set"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),

  // Number of trusted reverse-proxy hops in front of the app (0 = direct).
  // Set to 1 when running behind Docker/nginx so rate limiting sees real IPs.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
