import { NextRequest, NextResponse, after } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { CORE_QUESTIONS, QUESTION_TYPES, missingRequired } from "@/lib/sourcing/questions";
import {
  SourcingLimitError,
  advanceSourcingRun,
  generateQuestions,
  isSourcingConfigured,
  scoreRun,
  startSourcingRun,
} from "@/lib/sourcing/service";

// Candidate scoring continues in after() once a poll imports the results
export const maxDuration = 300;

const QuestionSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(200),
  type: z.enum(QUESTION_TYPES),
  section: z.enum(["company", "search", "role"]),
  options: z.array(z.string().max(120)).max(12).optional(),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(300).optional(),
  required: z.boolean().optional(),
});

const BriefSchema = z.string().trim().min(15, "Describe the role in at least a sentence.").max(4000);

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("questions"), brief: BriefSchema }),
  z.object({
    action: z.literal("start"),
    brief: BriefSchema,
    roleTitle: z.string().trim().min(2).max(120),
    // Only the AI-generated questions come from the client; core questions are always the server's copy
    roleQuestions: z.array(QuestionSchema).max(15),
    answers: z.record(
      z.string().max(40),
      z.union([z.string().max(2000), z.array(z.string().max(120)).max(20), z.boolean()]),
    ),
  }),
]);

async function getOwnerId(req: NextRequest): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    return session?.user?.id ?? null;
  } catch (err) {
    logger.warn("[sourcing] Failed to retrieve auth session", { error: String(err) });
    return null;
  }
}

function notConfigured() {
  return NextResponse.json(
    { error: "AI sourcing isn't set up on this server yet (missing APIFY_API_TOKEN)." },
    { status: 503 },
  );
}

/** POST { action: "questions", brief } → questionnaire; POST { action: "start", ... } → { runId }. */
export async function POST(req: NextRequest) {
  const ownerId = await getOwnerId(req);
  if (!ownerId) return NextResponse.json({ error: "Please sign in to source candidates." }, { status: 401 });
  if (!isSourcingConfigured()) return notConfigured();

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;

  const limit = await checkRateLimit(`sourcing:${ownerId}`);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  try {
    if (body.action === "questions") {
      const result = await generateQuestions(body.brief);
      return NextResponse.json({ ...result, coreQuestions: CORE_QUESTIONS });
    }

    const roleQuestions = body.roleQuestions.map((q) => ({ ...q, section: "role" as const }));
    const questions = [...CORE_QUESTIONS, ...roleQuestions];
    const missing = missingRequired(questions, body.answers);
    if (missing.length) {
      return NextResponse.json({ error: `Please answer: ${missing.join("; ")}` }, { status: 400 });
    }

    const runId = await startSourcingRun({
      ownerId,
      roleTitle: body.roleTitle,
      brief: body.brief,
      questions,
      answers: body.answers,
    });
    return NextResponse.json({ runId }, { status: 202 });
  } catch (err) {
    if (err instanceof SourcingLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    logger.error(`[sourcing] ${body.action} failed`, err);
    return NextResponse.json(
      { error: body.action === "questions" ? "Couldn't generate questions. Please try again." : "Couldn't start the LinkedIn search. Please try again." },
      { status: 502 },
    );
  }
}

/** GET ?id=<runId> → current progress; also advances the run (import when Apify finishes, then scoring). */
export async function GET(req: NextRequest) {
  const ownerId = await getOwnerId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSourcingConfigured()) return notConfigured();

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !isValidObjectId(id)) return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });

  try {
    const result = await advanceSourcingRun(id, ownerId);
    if (!result) return NextResponse.json({ error: "Sourcing run not found" }, { status: 404 });

    if (result.scoreInBackground) {
      after(() =>
        scoreRun(id, ownerId).catch((err) => logger.error("[sourcing] Background scoring failed", err)),
      );
    }
    return NextResponse.json(result.view);
  } catch (err) {
    logger.error("[sourcing] GET failed", err);
    return NextResponse.json({ error: "Couldn't check the sourcing run. Retrying..." }, { status: 502 });
  }
}
