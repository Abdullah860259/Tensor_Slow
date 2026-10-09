import { z } from "zod";

if (typeof window !== "undefined") {
  throw new Error("apps/web/src/lib/env.ts is server-only and must not be imported on the client.");
}

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI cannot be empty").default("mongodb://localhost/?directConnection=true"),
  MONGODB_DB: z.string().min(1, "MONGODB_DB cannot be empty").default("aicon"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET cannot be empty").default("aicon-hackathon-development-secret-key-32-chars-minimum"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL").default("http://localhost:3000"),
  AI_GATEWAY_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY_B: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  DEMO_USER_EMAIL: z.string().email().default("demo@example.com"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

const serverResult = serverEnvSchema.safeParse(process.env);

if (!serverResult.success) {
  const formattedErrors = serverResult.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`[Server Environment Validation Failed]:\n${formattedErrors}`);
}

const clientResult = clientEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!clientResult.success) {
  const formattedErrors = clientResult.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`[Client Environment Validation Failed]:\n${formattedErrors}`);
}

export const env = serverResult.data;
export const clientEnv = clientResult.data;
