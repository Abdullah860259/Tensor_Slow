// AI sourcing pipeline (server-only):
//   brief ──Gemini──▶ role-specific questions ──recruiter answers──▶ Gemini search plan
//   ──▶ Apify LinkedIn search ──▶ filter + dedupe ──▶ Items (pending) ──▶ scored against the answers
import { ApifyClient } from "apify-client";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";
import { chatModel, fastModel } from "@/lib/ai/models";
import { connectMongoose } from "@/lib/db";
import { ItemModel, SourcingRunModel } from "@/lib/models";
import { processItem } from "@/lib/items/process";
import { logger } from "@/lib/logger";
import {
  COMPANY_HEADCOUNTS,
  CORE_QUESTIONS,
  QUESTION_TYPES,
  SENIORITY_LEVELS,
  YEARS_OF_EXPERIENCE,
  splitList,
  type AnswerValue,
  type SourcingAnswers,
  type SourcingQuestion,
} from "@/lib/sourcing/questions";
import { filterProfiles, normalizeLinkedinUrl, profileToText } from "@/lib/sourcing/profiles";

const MAX_PROFILES_PER_RUN = 50;
// Gemini tends to mark most questions required; keep the form quick to complete
const MAX_REQUIRED_AI_QUESTIONS = 3;
const SCORING_CONCURRENCY = 3;
// If scoring hasn't finished this long after it started, the function was likely cut short: resume it
const SCORING_RESUME_AFTER_MS = 4 * 60_000;

export function isSourcingConfigured(): boolean {
  return Boolean(env.APIFY_API_TOKEN);
}

function apify(): ApifyClient {
  if (!env.APIFY_API_TOKEN) throw new Error("AI sourcing is not configured: set APIFY_API_TOKEN.");
  return new ApifyClient({ token: env.APIFY_API_TOKEN });
}

// ─── 1. Questionnaire ────────────────────────────────────────────────────────────────────────────

const GeneratedQuestionsSchema = z.object({
  roleTitle: z.string().describe("Concise job title inferred from the brief, e.g. 'Senior Backend Engineer (Go)'"),
  questions: z
    .array(
      z.object({
        label: z.string().describe("The question, addressed directly to the recruiter"),
        type: z.enum(QUESTION_TYPES),
        options: z.array(z.string()).optional().describe("2-8 answer options; required for select and multiselect"),
        placeholder: z.string().optional().describe("Example answer, starting with 'e.g.'"),
        helpText: z.string().optional().describe("One short sentence on why this matters, only if not obvious"),
        required: z.boolean(),
      }),
    )
    .describe("8 to 12 role-specific questions"),
});

/** Asks Gemini for role-specific screening questions, on top of the fixed core questions. */
export async function generateQuestions(brief: string): Promise<{ roleTitle: string; questions: SourcingQuestion[] }> {
  const coreList = CORE_QUESTIONS.map((q) => `- ${q.label}`).join("\n");

  const { object } = await generateObject({
    model: chatModel,
    schema: GeneratedQuestionsSchema,
    prompt: `You are a senior technical recruiter running an intake meeting with a hiring manager.
They described the role they need to fill:

"""
${brief}
"""

The intake form ALREADY asks these questions, so do NOT repeat or rephrase any of them:
${coreList}

Write 8 to 12 additional questions specific to THIS role that a great recruiter would ask before searching
LinkedIn and screening profiles. Cover what applies: depth in the specific stack or tools, domain or industry
experience, scale/complexity of past work, team they will join and who they report to, leadership or
mentoring expectations, education or certifications, spoken languages, visa/relocation, notice period,
travel or on-call, and anything in the brief that is ambiguous.

Rules:
- Prefer select/multiselect with concrete options whenever answers are predictable; use boolean for yes/no.
- Use number only for a single numeric answer. Use textarea for open-ended detail.
- Mark a question required only if the search or screening genuinely cannot proceed without it.
- Keep labels short (under 90 characters) and specific to the role.`,
  });

  let requiredLeft = MAX_REQUIRED_AI_QUESTIONS;
  const questions: SourcingQuestion[] = object.questions
    .filter((q) => q.label.trim())
    .slice(0, 12)
    .map((q, i) => {
      const options = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
      // A select without options is unusable: fall back to free text
      const type = (q.type === "select" || q.type === "multiselect") && options.length < 2 ? "text" : q.type;
      return {
        id: `ai_${i + 1}`,
        section: "role",
        label: q.label.trim(),
        type,
        options: type === "select" || type === "multiselect" ? options.slice(0, 8) : undefined,
        placeholder: q.placeholder?.trim() || undefined,
        helpText: q.helpText?.trim() || undefined,
        required: q.required && requiredLeft-- > 0,
      };
    });

  return { roleTitle: object.roleTitle.trim() || "Open role", questions };
}

// ─── 2. Search plan + criteria ───────────────────────────────────────────────────────────────────

function formatAnswer(value: AnswerValue | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return value.trim();
}

/** Every answered question as "label: answer" lines, in form order. */
function answeredLines(questions: SourcingQuestion[], answers: SourcingAnswers): string[] {
  return questions
    .map((q) => [q.label, formatAnswer(answers[q.id])] as const)
    .filter(([, a]) => a.length > 0)
    .map(([label, a]) => `- ${label}: ${a}`);
}

function salaryLine(answers: SourcingAnswers): string | null {
  const min = formatAnswer(answers.salaryMin);
  const max = formatAnswer(answers.salaryMax);
  if (!min && !max) return null;
  const range = min && max ? `${min}–${max}` : `up to ${max || min}`;
  return `${range} ${formatAnswer(answers.salaryCurrency)} per ${formatAnswer(answers.salaryPeriod).toLowerCase()}`;
}

/** The requirements text every sourced candidate is scored against. */
export function buildCriteriaText(
  roleTitle: string,
  brief: string,
  questions: SourcingQuestion[],
  answers: SourcingAnswers,
): string {
  const salary = salaryLine(answers);
  const coreIds = new Set(["salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod", "candidateCount"]);
  const lines = answeredLines(
    questions.filter((q) => !coreIds.has(q.id)),
    answers,
  );

  return `Target Job Role: ${roleTitle}

Hiring manager brief:
${brief.trim()}

Requirements from the recruiter intake form:
${salary ? `- Salary budget: ${salary}\n` : ""}${lines.join("\n")}

Scoring guidance:
- Must-have skills and deal-breakers above are hard requirements: missing must-haves cap the score at 59,
  and a clear deal-breaker caps it at 39. Name each gap in weaknesses.
- Use company size, work arrangement and salary budget as context only. Never invent salary expectations;
  you may note in weaknesses when the candidate's seniority clearly suggests expectations far above budget.
- Reward evidence matching the role-specific answers (domain, scale, leadership, languages, etc.).
- Strong Fit is 80-100, Potential 60-79, Unqualified below 60.`;
}

const SearchPlanSchema = z.object({
  searchQuery: z
    .string()
    .describe("1 to 3 keywords for LinkedIn's fuzzy people search, e.g. 'React Next.js'. No quotes or boolean operators."),
  currentJobTitles: z
    .array(z.string())
    .describe("2 to 6 current job titles matching candidates would hold on LinkedIn, including common variants"),
  fallbackKeywords: z
    .array(z.string())
    .describe("3 to 8 lowercase skill keywords a relevant profile should mention, used only if the recruiter listed none"),
});

type SearchPlan = z.infer<typeof SearchPlanSchema>;

async function buildSearchPlan(roleTitle: string, brief: string, lines: string[]): Promise<SearchPlan> {
  const { object } = await generateObject({
    // Simple extraction: the faster model keeps "Search LinkedIn" responsive
    model: fastModel,
    schema: SearchPlanSchema,
    prompt: `Turn this hiring request into a LinkedIn people search.

Role: ${roleTitle}
Brief: ${brief}
Recruiter answers:
${lines.join("\n")}

Keep the search broad enough to return results: LinkedIn already filters location, experience, seniority
and company size separately, so do NOT put those in the keywords or titles.`,
  });
  return {
    searchQuery: object.searchQuery.replace(/["()]/g, "").trim().slice(0, 80),
    currentJobTitles: [...new Set(object.currentJobTitles.map((t) => t.trim()).filter(Boolean))].slice(0, 6),
    fallbackKeywords: object.fallbackKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 8),
  };
}

function mapLabels(selected: AnswerValue | undefined, options: readonly { label: string; id: string }[]): string[] {
  const chosen = new Set(Array.isArray(selected) ? selected : []);
  return options.filter((o) => chosen.has(o.label)).map((o) => o.id);
}

export function candidateCountFrom(answers: SourcingAnswers): number {
  const n = Number(formatAnswer(answers.candidateCount));
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 30) : 20;
}

/** Deterministic part of the actor input; only the keywords and titles come from Gemini. */
export function buildActorInput(plan: SearchPlan, answers: SourcingAnswers): Record<string, unknown> {
  // Over-fetch so filtering and ranking still leave the requested number of candidates
  const scrapeCount = Math.min(MAX_PROFILES_PER_RUN, Math.ceil(candidateCountFrom(answers) * 1.5));
  const locations = splitList(answers.locations).slice(0, 10);
  const yearsOfExperienceIds = mapLabels(answers.experience, YEARS_OF_EXPERIENCE);
  const seniorityLevelIds = mapLabels(answers.seniority, SENIORITY_LEVELS);
  const companyHeadcount = mapLabels(answers.candidateCompanySizes, COMPANY_HEADCOUNTS);

  return {
    profileScraperMode: "Full",
    ...(plan.searchQuery && { searchQuery: plan.searchQuery }),
    ...(plan.currentJobTitles.length && { currentJobTitles: plan.currentJobTitles }),
    ...(locations.length && { locations }),
    ...(yearsOfExperienceIds.length && { yearsOfExperienceIds }),
    ...(seniorityLevelIds.length && { seniorityLevelIds }),
    ...(companyHeadcount.length && { companyHeadcount }),
    maxItems: scrapeCount,
    takePages: Math.ceil(scrapeCount / 25),
    startPage: 1,
  };
}

// ─── 3. Start the Apify run ──────────────────────────────────────────────────────────────────────

export class SourcingLimitError extends Error {}

async function assertWithinDailyLimits(ownerId: string): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const [mine, everyone] = await Promise.all([
    SourcingRunModel.countDocuments({ ownerId, createdAt: { $gte: since } }),
    SourcingRunModel.countDocuments({ createdAt: { $gte: since } }),
  ]);
  if (mine >= env.SOURCING_RUNS_PER_USER_PER_DAY) {
    throw new SourcingLimitError(
      `You've used all ${env.SOURCING_RUNS_PER_USER_PER_DAY} AI sourcing runs for today. Try again tomorrow.`,
    );
  }
  if (everyone >= env.SOURCING_RUNS_PER_DAY) {
    throw new SourcingLimitError("AI sourcing has reached today's limit for this workspace. Try again tomorrow.");
  }
}

export async function startSourcingRun(params: {
  ownerId: string;
  roleTitle: string;
  brief: string;
  questions: SourcingQuestion[];
  answers: SourcingAnswers;
}): Promise<string> {
  const { ownerId, roleTitle, brief, questions, answers } = params;
  await connectMongoose();
  await assertWithinDailyLimits(ownerId);

  const plan = await buildSearchPlan(roleTitle, brief, answeredLines(questions, answers));
  const actorInput = buildActorInput(plan, answers);
  const recruiterKeywords = splitList(answers.mustHaveSkills).slice(0, 15);
  const mustHaveKeywords = recruiterKeywords.length ? recruiterKeywords : plan.fallbackKeywords;

  logger.info("[sourcing] Starting Apify run", { ownerId, actorInput, mustHaveKeywords });
  const run = await apify()
    .actor(env.APIFY_LINKEDIN_ACTOR_ID)
    .start(actorInput, { maxTotalChargeUsd: env.SOURCING_MAX_CHARGE_USD });

  const doc = await SourcingRunModel.create({
    ownerId,
    roleTitle,
    brief,
    questions,
    answers,
    actorInput,
    criteriaText: buildCriteriaText(roleTitle, brief, questions, answers),
    mustHaveKeywords,
    candidateCount: candidateCountFrom(answers),
    apifyRunId: run.id,
    apifyDatasetId: run.defaultDatasetId,
    status: "running",
  });

  logger.info("[sourcing] Apify run started", { runId: String(doc._id), apifyRunId: run.id });
  return String(doc._id);
}

// ─── 4. Poll, import, score ──────────────────────────────────────────────────────────────────────

const APIFY_TERMINAL = new Set(["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"]);

export interface SourcingRunView {
  id: string;
  roleTitle: string;
  status: string;
  apifyStatus?: string;
  error?: string;
  stats: Record<string, number>;
  scored: number;
  pending: number;
  costUsd?: number;
}

async function importResults(runId: string, ownerId: string, apifyStatus: string, costUsd?: number): Promise<void> {
  // Claim the import so two concurrent polls can't both insert the same candidates
  const run = await SourcingRunModel.findOneAndUpdate(
    { _id: runId, ownerId, status: "running" },
    { $set: { status: "importing", costUsd } },
    { returnDocument: "after" },
  );
  if (!run) return;

  try {
    const { items } = await apify().dataset(run.apifyDatasetId).listItems({ limit: MAX_PROFILES_PER_RUN * 2 });

    if (items.length === 0) {
      run.status = "failed";
      run.error =
        apifyStatus === "SUCCEEDED"
          ? "LinkedIn returned no profiles for this search. Try fewer filters or broader skills."
          : `The LinkedIn search ended with status ${apifyStatus} before finding any profiles.`;
      await run.save();
      return;
    }

    const existing = await ItemModel.find({ ownerId, sourceUrl: /linkedin\.com\/in\//i }).select("sourceUrl").lean();
    const existingUrls = new Set(
      existing.map((i) => normalizeLinkedinUrl(i.sourceUrl)).filter((u): u is string => Boolean(u)),
    );

    const { kept, stats } = filterProfiles(items, {
      mustHaveKeywords: run.mustHaveKeywords,
      existingUrls,
      limit: run.candidateCount,
    });

    const docs = kept.length
      ? await ItemModel.insertMany(
          kept.map((c) => ({
            ownerId,
            title: `${c.fullName} - LinkedIn Profile`,
            content: profileToText(c.profile),
            sourceUrl: c.linkedinUrl,
            category: "Sourced",
            status: "pending",
            aiTags: [],
          })),
        )
      : [];

    run.stats = stats;
    run.itemIds = docs.map((d) => d._id);
    if (docs.length === 0) {
      run.status = "failed";
      run.error = `Found ${stats.scraped} profiles, but none passed the filters (${stats.duplicates} already in your pipeline, ${stats.irrelevant} missing your must-have skills).`;
    } else {
      run.status = "scoring";
      run.scoringStartedAt = new Date();
    }
    await run.save();
  } catch (err) {
    logger.error("[sourcing] Import failed", err);
    run.status = "failed";
    run.error = err instanceof Error ? err.message : "Failed to import candidates.";
    await run.save();
  }
}

/** Scores every still-pending candidate of a run, a few at a time. Safe to call more than once. */
export async function scoreRun(runId: string, ownerId: string): Promise<void> {
  await connectMongoose();
  const run = await SourcingRunModel.findOne({ _id: runId, ownerId }).lean();
  if (!run || run.status !== "scoring") return;

  const pending = await ItemModel.find({ _id: { $in: run.itemIds }, ownerId, status: "pending" }).select("_id").lean();
  const queue = pending.map((p) => String(p._id));

  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        await processItem(id, ownerId, run.criteriaText);
      } catch (err) {
        logger.warn("[sourcing] Scoring failed for candidate", { itemId: id, error: String(err) });
      }
    }
  };
  await Promise.all(Array.from({ length: SCORING_CONCURRENCY }, worker));

  const stillPending = await ItemModel.countDocuments({ _id: { $in: run.itemIds }, status: "pending" });
  if (stillPending === 0) {
    await SourcingRunModel.updateOne({ _id: runId, status: "scoring" }, { $set: { status: "completed" } });
  }
}

/**
 * Advances a run one step and reports its state. Called by the client's polling:
 * running → (Apify finished) import → scoring → completed.
 * Returns `scoreInBackground: true` when the caller should kick off scoreRun after responding.
 */
export async function advanceSourcingRun(
  runId: string,
  ownerId: string,
): Promise<{ view: SourcingRunView; scoreInBackground: boolean } | null> {
  await connectMongoose();
  let run = await SourcingRunModel.findOne({ _id: runId, ownerId }).lean();
  if (!run) return null;

  let apifyStatus: string | undefined;
  let scoreInBackground = false;

  if (run.status === "running") {
    const apifyRun = await apify().run(run.apifyRunId).get();
    apifyStatus = apifyRun?.status;
    if (apifyStatus && APIFY_TERMINAL.has(apifyStatus)) {
      await importResults(runId, ownerId, apifyStatus, apifyRun?.usageTotalUsd);
      run = (await SourcingRunModel.findOne({ _id: runId, ownerId }).lean()) ?? run;
      scoreInBackground = run.status === "scoring";
    }
  } else if (run.status === "scoring" && run.scoringStartedAt) {
    // Resume scoring if the previous background pass was cut short
    const stale = new Date(Date.now() - SCORING_RESUME_AFTER_MS);
    if (run.scoringStartedAt < stale) {
      const claimed = await SourcingRunModel.updateOne(
        { _id: runId, status: "scoring", scoringStartedAt: { $lt: stale } },
        { $set: { scoringStartedAt: new Date() } },
      );
      scoreInBackground = claimed.modifiedCount === 1;
    }
  }

  const [pending, scored] = run.itemIds.length
    ? await Promise.all([
        ItemModel.countDocuments({ _id: { $in: run.itemIds }, status: "pending" }),
        ItemModel.countDocuments({ _id: { $in: run.itemIds }, status: { $ne: "pending" } }),
      ])
    : [0, 0];

  // All candidates scored but the background pass didn't record it (e.g. it was cut short at the end)
  if (run.status === "scoring" && pending === 0) {
    await SourcingRunModel.updateOne({ _id: runId, status: "scoring" }, { $set: { status: "completed" } });
    run = { ...run, status: "completed" };
    scoreInBackground = false;
  }

  return {
    view: {
      id: String(run._id),
      roleTitle: run.roleTitle,
      status: run.status,
      apifyStatus,
      error: run.error,
      stats: run.stats as unknown as Record<string, number>,
      scored,
      pending,
      costUsd: run.costUsd,
    },
    scoreInBackground,
  };
}
