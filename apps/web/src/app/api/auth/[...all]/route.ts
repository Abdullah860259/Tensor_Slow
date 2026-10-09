import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Mounts Better Auth REST endpoints for session management, OAuth, anonymous sign-in, and magic links
export const { GET, POST } = toNextJsHandler(auth);
