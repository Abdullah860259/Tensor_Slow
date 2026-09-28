import { gateway } from "@ai-sdk/gateway";
import { createGoogle, google } from "@ai-sdk/google";
import type { LanguageModel, EmbeddingModel } from "ai";

/**
 * Model Registry — single source of truth for all AI model references.
 * Sole owner: Agent C (Manifest item 29)
 *
 * The default route is Vercel AI Gateway (zero markup, unified observability, BYOK supported).
 * Set USE_GATEWAY = false below to route directly to @ai-sdk/google instead.
 */
export const USE_GATEWAY = true;

/**
 * Helper to detect quota exhaustion or rate limits from Gemini / Google APIs.
 * Inspects HTTP status codes (429 Too Many Requests, 503 Service Unavailable),
 * error messages, response bodies, and GCP RESOURCE_EXHAUSTED status codes.
 */
export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  const err = error as Record<string, unknown>;
  const status = (err.status ?? err.statusCode) as number | undefined;
  if (status === 429 || status === 503) return true;

  const errStr = (
    String(error) +
    " " +
    (typeof err.message === "string" ? err.message : "") +
    " " +
    (typeof err.responseBody === "string" ? err.responseBody : "") +
    " " +
    JSON.stringify(err.data || {})
  ).toLowerCase();

  return (
    errStr.includes("429") ||
    errStr.includes("503") ||
    errStr.includes("quota") ||
    errStr.includes("resource_exhausted") ||
    errStr.includes("rate limit") ||
    errStr.includes("rate_limit") ||
    errStr.includes("too many requests") ||
    errStr.includes("unavailable")
  );
}

/**
 * Two-key Gemini quota-fallback logic for Language Models.
 *
 * Free-tier Gemini quotas are strictly per-project (tied to the GCP project of the API key).
 * During a live stage demo or presentation, a dead key due to sudden quota exhaustion (429)
 * is a critical risk. If GOOGLE_GENERATIVE_AI_API_KEY_B is configured, this wrapper intercepts
 * quota and rate-limit errors from the primary key (GOOGLE_GENERATIVE_AI_API_KEY) and seamlessly
 * retries the call using the backup key so the demo never dies on stage.
 */
export function getModelWithQuotaFallback(modelId: string = "gemini-2.5-flash"): LanguageModel {
  const keyA = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const keyB = process.env.GOOGLE_GENERATIVE_AI_API_KEY_B;

  // If only key B is provided, route directly to key B
  if (!keyA && keyB) {
    return createGoogle({ apiKey: keyB })(modelId);
  }

  const googleA = keyA ? createGoogle({ apiKey: keyA }) : google;
  const modelA = googleA(modelId);

  // If no backup key is configured, return primary model
  if (!keyB) {
    return modelA;
  }

  const googleB = createGoogle({ apiKey: keyB });
  const modelB = googleB(modelId);

  // Wrap modelA to catch quota / rate-limit errors and seamlessly fail over to modelB
  const fallbackModel: LanguageModel = {
    specificationVersion: "v4" as const,
    provider: modelA.provider || "google.generative-ai",
    modelId: modelA.modelId,
    get supportedUrls() {
      return modelA.supportedUrls;
    },
    async doGenerate(options: Parameters<typeof modelA.doGenerate>[0]) {
      try {
        return await modelA.doGenerate(options);
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn(`[models] Primary Gemini key quota exceeded for ${modelId}; failing over to key B`);
          return await modelB.doGenerate(options);
        }
        throw err;
      }
    },
    async doStream(options: Parameters<typeof modelA.doStream>[0]) {
      try {
        return await modelA.doStream(options);
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn(`[models] Primary Gemini key quota exceeded on stream for ${modelId}; failing over to key B`);
          return await modelB.doStream(options);
        }
        throw err;
      }
    },
  };

  return fallbackModel;
}

/**
 * Two-key Gemini quota-fallback logic for Embedding Models.
 */
export function getEmbeddingModelWithQuotaFallback(modelId: string = "text-embedding-004"): EmbeddingModel {
  const keyA = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const keyB = process.env.GOOGLE_GENERATIVE_AI_API_KEY_B;

  if (!keyA && keyB) {
    return createGoogle({ apiKey: keyB }).embeddingModel(modelId);
  }

  const googleA = keyA ? createGoogle({ apiKey: keyA }) : google;
  const modelA = googleA.embeddingModel(modelId);

  if (!keyB) {
    return modelA;
  }

  const googleB = createGoogle({ apiKey: keyB });
  const modelB = googleB.embeddingModel(modelId);

  const fallbackEmbeddingModel: EmbeddingModel = {
    specificationVersion: "v4" as const,
    provider: modelA.provider || "google.generative-ai",
    modelId: modelA.modelId,
    maxEmbeddingsPerCall: modelA.maxEmbeddingsPerCall,
    supportsParallelCalls: modelA.supportsParallelCalls,
    async doEmbed(options: Parameters<typeof modelA.doEmbed>[0]) {
      try {
        return await modelA.doEmbed(options);
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn(`[models] Primary Gemini key quota exceeded for embedding ${modelId}; failing over to key B`);
          return await modelB.doEmbed(options);
        }
        throw err;
      }
    },
  };

  return fallbackEmbeddingModel;
}

export const chatModel: LanguageModel = USE_GATEWAY
  ? gateway("google/gemini-2.5-flash")
  : getModelWithQuotaFallback("gemini-2.5-flash");

export const fastModel: LanguageModel = USE_GATEWAY
  ? gateway("google/gemini-2.5-flash-lite")
  : getModelWithQuotaFallback("gemini-2.5-flash-lite");

export const embeddingModel: EmbeddingModel = USE_GATEWAY
  ? gateway.embeddingModel("google/text-embedding-004")
  : getEmbeddingModelWithQuotaFallback("text-embedding-004");
