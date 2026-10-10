import { generateObject, type LanguageModel } from "ai";
import { ExtractResultSchema, type ExtractResult } from "@/lib/contracts";
import { fastModel } from "@/lib/ai/models";
import { EXTRACTION_PROMPT } from "@/lib/ai/prompts/system";
import { ASPECTS_INSTRUCTION, domain } from "@/lib/domain";

export type ExtractOutput = ExtractResult & { fields?: Record<string, unknown> };

/**
 * Base extraction shape plus the active domain's `fields`.
 * LLMs frequently return numbers as strings or omit optional keys, so every
 * domain field is optional and the whole payload falls back to undefined
 * (via .catch) rather than failing the extraction.
 */
const DomainExtractSchema = ExtractResultSchema.extend({
  fields: domain.fieldsSchema.optional().catch(undefined),
});

/**
 * Extracts structured data (summary, tags, severity, score, domain fields) using generateObject.
 * Accepts an optional modelOverride for test mocking (e.g. MockLanguageModelV3).
 */
export async function extractStructuredData(
  content: string,
  modelOverride?: LanguageModel,
  criteriaOverride?: string
): Promise<ExtractOutput> {
  const trimmed = content.trim();
  const model = modelOverride || fastModel;

  const instructions = criteriaOverride
    ? `You are an expert technical candidate evaluation engine for ${domain.labels.plural!.toLowerCase()}.
Analyze the provided profile/resume text and evaluate the candidate strictly against the custom job criteria below:
1. A concise, informative 1-2 sentence summary of their relevant background.
2. 3 to 5 descriptive, lower-case tags (skills, domain, tools).
3. category: a short label representing role fit ('Strong Fit', 'Potential', or 'Unqualified').
4. severity: 'critical' or 'high' for strong fits to interview immediately, 'medium' for potential fits, 'low' for unqualified candidates.
5. score: an integer from 0 to 100 based strictly on the scoring rubric below.
6. The domain fields: strengths (evidence-backed points matching criteria), weaknesses (missing requirements, red flags, or gaps), verdict (clear hiring recommendation), yearsOfExperience (estimated total years of relevant experience).
7. ${ASPECTS_INSTRUCTION}

TARGET JOB ROLE CRITERIA & SCORING RUBRIC:
${criteriaOverride}

ANTI-HALLUCINATION & CALIBRATION RULES:
1. Base all scores, verdicts, and extractions ONLY on explicitly stated facts in the text.
2. DO NOT assume, infer, or guess skills, tools, or experience not directly written.
3. If a specific requirement is not mentioned, note it as an unmet gap.
4. Holistic Scoring: Award proportionate partial credit for verified technical competencies (e.g. Next.js, React, Flutter, Python, TypeScript, Web Dev). Do NOT give a 0 score to software engineers with relevant foundations; reserve 0-19 strictly for non-technical, irrelevant, or spam profiles.`
    : EXTRACTION_PROMPT;

  const { object } = await generateObject({
    model,
    schema: DomainExtractSchema,
    instructions,
    prompt: trimmed || "No content provided.",
  });

  return object as ExtractOutput;
}
