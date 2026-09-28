import { createAuthClient } from "better-auth/react";
import { anonymousClient, magicLinkClient } from "better-auth/client/plugins";

// Browser client for Better Auth with React hooks and client-side plugins
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  plugins: [
    anonymousClient(),
    magicLinkClient(),
  ],
});

export const { useSession, signIn, signOut, signUp } = authClient;
