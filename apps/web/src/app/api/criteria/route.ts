import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { connectMongoose } from "@/lib/db";
import { JobCriteriaModel, ItemModel } from "@/lib/models";
import { fastModel } from "@/lib/ai/models";
import { processItem } from "@/lib/items/process";
import { logger } from "@/lib/logger";

const CriteriaExpansionSchema = z.object({
  roleSummary: z.string().describe("2-sentence summary of the target candidate profile"),
  mustHave: z.array(z.string()).describe("3-5 non-negotiable mandatory requirements"),
  niceToHave: z.array(z.string()).describe("3-4 preferred qualifications and bonuses"),
  redFlags: z.array(z.string()).describe("2-3 disqualifying patterns or anti-patterns"),
  scoringGuidelines: z.string().describe("Point-by-point scoring guidelines totaling 100 points"),
  interviewQuestions: z.array(z.string()).describe("3 targeted technical screen questions"),
  fullCriteriaPrompt: z.string().describe("Complete evaluation rubric markdown to inject into candidate scoring"),
});

async function getSessionUserId(req: NextRequest): Promise<string> {
  let userId = env.DEMO_USER_EMAIL || "demo@example.com";
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session?.user?.id) userId = session.user.id;
    else if (session?.user?.email) userId = session.user.email;
  } catch (err) {
    // Demo user fallback
  }
  return userId;
}

export async function GET(req: NextRequest) {
  try {
    await connectMongoose();
    const ownerId = await getSessionUserId(req);

    const activeCriteria = await JobCriteriaModel.findOne({ ownerId, isActive: true }).lean();
    return NextResponse.json({ activeCriteria });
  } catch (err: any) {
    logger.error("[criteria] GET error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongoose();
    const ownerId = await getSessionUserId(req);
    const body = await req.json();
    const { action, roleTitle, requirements, expandedCriteria, rubric } = body;

    // 1. Generate/Expand Criteria using AI
    if (action === "generate") {
      if (!roleTitle || !requirements) {
        return NextResponse.json(
          { error: "Please provide both a Role Title and rough Requirements / Notes." },
          { status: 400 }
        );
      }

      const prompt = `You are a Principal Technical Recruiter and Hiring Bar Raiser.
The hiring team wants to hire for the following position:

Target Role: ${roleTitle}
Hiring Manager Requirements & Context:
${requirements}

Expand these notes into a comprehensive, objective, and ruthlessly strict evaluation rubric:
- Set clear year-of-experience or technology baselines.
- Define a 0-100 scoring breakdown with explicit point bonuses and deductions.
- Formulate 3 high-signal interview questions to verify claims during screening.`;

      const { object } = await generateObject({
        model: fastModel,
        schema: CriteriaExpansionSchema,
        prompt,
      });

      return NextResponse.json({ success: true, criteria: object });
    }

    // 2. Save and activate the criteria
    if (action === "save") {
      if (!roleTitle || !expandedCriteria) {
        return NextResponse.json({ error: "Missing roleTitle or expandedCriteria" }, { status: 400 });
      }

      // Deactivate any previously active criteria for this user
      await JobCriteriaModel.updateMany({ ownerId }, { $set: { isActive: false } });

      const criteriaDoc = await JobCriteriaModel.create({
        ownerId,
        roleTitle,
        rawRequirements: requirements || roleTitle,
        expandedCriteria,
        rubric,
        isActive: true,
      });

      return NextResponse.json({
        success: true,
        criteriaId: criteriaDoc._id.toString(),
        message: `Active evaluation criteria updated for "${roleTitle}"!`,
      });
    }

    // 3. Re-score all existing candidates against the active criteria
    if (action === "rescore_all") {
      const candidates = await ItemModel.find({ ownerId }).select("_id").lean();
      let rescoredCount = 0;

      for (const cand of candidates) {
        try {
          await processItem(String(cand._id), ownerId);
          rescoredCount++;
        } catch (rescoreErr) {
          logger.warn("[criteria] Failed to rescore candidate", { id: cand._id, error: String(rescoreErr) });
        }
      }

      return NextResponse.json({
        success: true,
        rescoredCount,
        message: `Successfully re-scored ${rescoredCount} candidates against the updated criteria!`,
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (err: any) {
    logger.error("[criteria] POST error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
