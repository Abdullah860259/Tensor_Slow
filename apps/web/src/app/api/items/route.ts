// Manifest item 37: List and create items route handler
// PLACEHOLDER DOMAIN — replace when real product domain is finalized.
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ItemCreateInputSchema } from "@/lib/contracts";
import { connectMongoose } from "@/lib/db";
import { ItemModel } from "@/lib/models";
import { extractStructuredData } from "@/lib/ai/extract";
import { embedText } from "@/lib/ai/embed";
import { logger } from "@/lib/logger";

/**
 * Retrieves the authenticated session ownerId from Better Auth.
 * Falls back to anonymous session creation if no session exists, or null on failure.
 */
async function getSessionOwnerId(): Promise<string | null> {
  const reqHeaders = await headers();
  let session = null;
  try {
    session = await auth.api.getSession({ headers: reqHeaders });
  } catch (sessionErr) {
    logger.warn("[items] Failed to retrieve auth session", { error: String(sessionErr) });
  }

  if (session?.user?.id) {
    return session.user.id;
  }

  try {
    const anon = await auth.api.signInAnonymous({ headers: reqHeaders });
    if (anon?.user?.id) {
      return anon.user.id;
    }
  } catch (anonErr) {
    logger.warn("[items] Anonymous sign-in attempt failed", { error: String(anonErr) });
  }

  return null;
}

export async function GET(req: Request): Promise<Response> {
  const ownerId = await getSessionOwnerId();

  if (!ownerId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await connectMongoose();

    // Queries are strictly scoped to the server session ownerId
    const items = await ItemModel.find({ ownerId }).sort({ createdAt: -1 }).lean();

    const formattedItems = items.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      content: item.content,
      sourceUrl: item.sourceUrl,
      mime: item.mime,
      status: item.status,
      aiSummary: item.aiSummary,
      aiTags: item.aiTags ?? [],
      createdAt: item.createdAt,
    }));

    return Response.json({ items: formattedItems });
  } catch (err) {
    logger.error("[items] Failed to fetch items", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request): Promise<Response> {
  const ownerId = await getSessionOwnerId();

  if (!ownerId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Zod validation with ItemCreateInputSchema — client-supplied ownerId is never trusted
  const parsed = ItemCreateInputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid input", details: parsed.error.format() }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { title, content, sourceUrl, mime } = parsed.data;

  // Auto-populate aiSummary, aiTags, and embedding via AI extraction and embedding helpers
  let aiSummary: string | undefined;
  let aiTags: string[] = [];
  let embedding: number[] | undefined;
  let status: "pending" | "processed" | "failed" = "pending";

  const contentToProcess = content && content.trim().length > 0 ? content : title;

  try {
    const [extractionRes, embeddingRes] = await Promise.allSettled([
      extractStructuredData(contentToProcess),
      embedText(contentToProcess),
    ]);

    if (extractionRes.status === "fulfilled") {
      aiSummary = extractionRes.value.summary;
      aiTags = extractionRes.value.tags;
    } else {
      logger.warn("[items] AI structured extraction failed", {
        error: String(extractionRes.reason),
      });
    }

    if (embeddingRes.status === "fulfilled") {
      embedding = embeddingRes.value;
    } else {
      logger.warn("[items] Text embedding failed", {
        error: String(embeddingRes.reason),
      });
    }

    status = extractionRes.status === "fulfilled" ? "processed" : "pending";
  } catch (aiErr) {
    logger.warn("[items] AI processing error", { error: String(aiErr) });
    status = "pending";
  }

  try {
    await connectMongoose();

    const item = await ItemModel.create({
      ownerId, // Enforce session ownerId
      title,
      content,
      sourceUrl,
      mime,
      status,
      aiSummary,
      aiTags,
      embedding,
    });

    const responseItem = {
      id: item._id.toString(),
      title: item.title,
      content: item.content,
      sourceUrl: item.sourceUrl,
      mime: item.mime,
      status: item.status,
      aiSummary: item.aiSummary,
      aiTags: item.aiTags ?? [],
      createdAt: item.createdAt,
    };

    return Response.json(
      {
        ...responseItem,
        item: responseItem,
      },
      { status: 201 }
    );
  } catch (dbErr) {
    logger.error("[items] Failed to create item in database", dbErr);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
