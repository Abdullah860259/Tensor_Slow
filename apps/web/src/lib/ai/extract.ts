import { generateObject, type LanguageModel } from "ai";
import { ExtractResultSchema, type ExtractResult } from "@/lib/contracts";
import { fastModel } from "@/lib/ai/models";
import { EXTRACTION_PROMPT } from "@/lib/ai/prompts/system";

/**
 * Extracts structured data (summary, tags, confidence score, action items) from content using generateObject.
 *
 * LLMs frequently return numbers as strings, wrap tags in unexpected types,
 * or omit optional fields. ExtractResultSchema uses z.coerce, optional(), and .catch() fallbacks
 * where an LLM could plausibly return a slightly wrong shape so extraction never fails catastrophically.
 *
 * Accepts an optional modelOverride for test mocking (e.g. MockLanguageModelV3).
 */
export async function extractStructuredData(
  content: string,
  modelOverride?: LanguageModel
): Promise<ExtractResult> {
  const trimmed = content.trim();
  const model = modelOverride || fastModel;

  const { object } = await generateObject({
    model,
    schema: ExtractResultSchema,
    instructions: EXTRACTION_PROMPT,
    prompt: trimmed || "No content provided.",
  });

  return object;
}
