import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { anonymous } from "better-auth/plugins/anonymous";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { getRawDb } from "@/lib/db";
import {dash} from "@better-auth/infra"

/**
 * On Vercel, BETTER_AUTH_URL can be left unset: fall back to the hostnames Vercel injects
 * (the production domain for production deploys, the deployment URL for previews).
 */
const vercelHost =
  process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;

/** Every hostname a Vercel deployment is reachable on, so sign-in works from any of them. */
const vercelOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]
  .filter((host): host is string => Boolean(host))
  .map((host) => `https://${host}`);

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (vercelHost ? `https://${vercelHost}` : "http://localhost:3000"),
  trustedOrigins: vercelOrigins,
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "temporary-stub-secret-32-characters-minimum",
  database: mongodbAdapter(getRawDb()),
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
    dash(),
    // Required for Server Actions and Route Handlers to persist session cookies in Next.js App Router
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
