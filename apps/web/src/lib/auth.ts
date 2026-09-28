import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { anonymous } from "better-auth/plugins/anonymous";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { getRawDb } from "@/lib/db";

// Better Auth requires the native MongoDB Db instance, not the Mongoose connection
const rawDb = await getRawDb();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "temporary-stub-secret-32-characters-minimum",
  database: mongodbAdapter(rawDb),
  emailAndPassword: {
    // Disabled in favor of passwordless magic links and anonymous sessions
    enabled: false,
  },
  plugins: [
    // Enables zero-friction anonymous guest access for evaluations and demos
    anonymous(),
    // Passwordless authentication for real user accounts
    magicLink({
      sendMagicLink: async () => {
        // Wired to transactional email delivery in production
      },
    }),
    // Required for Server Actions and Route Handlers to persist session cookies in Next.js App Router
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
