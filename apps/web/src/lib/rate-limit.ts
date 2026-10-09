import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}

// Global declaration for Next.js HMR persistence
declare global {
  // eslint-disable-next-line no-var
  var __aicon_ratelimit__: Ratelimit | null | undefined;
  // eslint-disable-next-line no-var
  var __aicon_ratelimit_warned__: boolean | undefined;
}

/**
 * Initializes and caches the Upstash Ratelimit client on globalThis
 * to avoid recreating instances during Next.js hot module reloads.
 */
function getRateLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!globalThis.__aicon_ratelimit_warned__) {
      console.warn(
        "[rate-limit] Upstash Redis credentials missing (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). Gracefully degrading and allowing all requests."
      );
      globalThis.__aicon_ratelimit_warned__ = true;
    }
    return null;
  }

  if (!globalThis.__aicon_ratelimit__) {
    globalThis.__aicon_ratelimit__ = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "aicon_rl",
      analytics: false,
    });
  }

  return globalThis.__aicon_ratelimit__;
}

/**
 * Checks whether an identifier (e.g. userId, IP address) is rate-limited.
 *
 * Manifest item 35:
 * An Upstash Ratelimit wrapper that gracefully degrades (logs a warning and allows the request)
 * if Upstash environment variables are absent, so local development without Redis still works.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getRateLimiter();
  const safeIdentifier = identifier.trim() || "anonymous";

  if (!limiter) {
    return {
      success: true,
      limit: 20,
      remaining: 20,
      reset: Date.now() + 60_000,
    };
  }

  try {
    const result = await limiter.limit(safeIdentifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.warn(
      "[rate-limit] Upstash Redis request failed. Gracefully degrading and allowing request:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: true,
      limit: 20,
      remaining: 20,
      reset: Date.now() + 60_000,
    };
  }
}
