// STUB for Agent B (manifest item 20)
// Signature freeze — will be replaced with full implementation by Agent B
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
});

export const { useSession, signIn, signOut, signUp } = authClient;
