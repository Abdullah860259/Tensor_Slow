// STUB for Agent B (manifest item 19)
// Signature freeze — will be replaced with full implementation by Agent B
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: "http://localhost:3000",
  secret: "temporary-stub-secret-32-characters-minimum",
});

export type Session = typeof auth.$Infer.Session;
