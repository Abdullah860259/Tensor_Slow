import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectMongoose } from "@/lib/db";
import { ItemModel, StarModel } from "@/lib/models";
import { logger } from "@/lib/logger";

const StarRequestSchema = z.object({
  itemId: z.string().refine(isValidObjectId, "Invalid candidate ID"),
  // Explicit target state (not a toggle) so retries and double-clicks stay idempotent
  starred: z.boolean(),
});

async function getOwnerId(req: NextRequest): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    return session?.user?.id ?? null;
  } catch (err) {
    logger.warn("[stars] Failed to retrieve auth session", { error: String(err) });
    return null;
  }
}

/** Lists the IDs of every candidate the signed-in user has starred, newest first. */
export async function GET(req: NextRequest) {
  const ownerId = await getOwnerId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectMongoose();
    const itemIds = await StarModel.getStarredItemIds(ownerId);
    return NextResponse.json({ itemIds });
  } catch (err) {
    logger.error("[stars] GET error", err);
    return NextResponse.json({ error: "Failed to load starred candidates" }, { status: 500 });
  }
}

/** Stars or unstars one of the signed-in user's candidates. Body: { itemId, starred }. */
export async function POST(req: NextRequest) {
  const ownerId = await getOwnerId(req);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = StarRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { itemId, starred } = parsed.data;

  try {
    await connectMongoose();

    // Users may only star candidates in their own pipeline
    const owned = await ItemModel.exists({ _id: itemId, ownerId });
    if (!owned) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    if (starred) await StarModel.star(ownerId, itemId);
    else await StarModel.unstar(ownerId, itemId);

    return NextResponse.json({ itemId, starred });
  } catch (err) {
    logger.error("[stars] POST error", err);
    return NextResponse.json({ error: "Failed to update star" }, { status: 500 });
  }
}
