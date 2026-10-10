// Manifest item 37: List and create items route handler
// PLACEHOLDER DOMAIN — replace when real product domain is finalized.
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ItemCreateInputSchema } from "@/lib/contracts";
import { connectMongoose } from "@/lib/db";
import { ItemModel, StarModel } from "@/lib/models";
import { processItem } from "@/lib/items/process";
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
  try {
    await connectMongoose();
    const ownerId = await getSessionOwnerId();

    if (!ownerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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
  try {
    await connectMongoose();
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

    const contentToProcess = content && content.trim().length > 0 ? content : title;

    const item = await ItemModel.create({
      ownerId, // Enforce session ownerId
      title,
      content: contentToProcess,
      sourceUrl,
      mime,
      status: "pending",
      aiTags: [],
    });
    
    const id = item._id.toString();
    
    // Call the shared process pipeline so domain fields (category, severity, score, fields) are properly populated
    try {
      await processItem(id, ownerId);
    } catch (processErr: any) {
      logger.error("[items] LLM processing failed", processErr);
      return new Response(JSON.stringify({ error: `LLM processing failed: ${processErr.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Re-fetch the item to get the fully processed fields
    const processedItem = await ItemModel.findById(id).lean();

    const responseItem = {
      id: processedItem?._id.toString() || id,
      title: processedItem?.title || title,
      content: processedItem?.content || contentToProcess,
      sourceUrl: processedItem?.sourceUrl || sourceUrl,
      mime: processedItem?.mime || mime,
      status: processedItem?.status || "pending",
      aiSummary: processedItem?.aiSummary,
      aiTags: processedItem?.aiTags ?? [],
      category: processedItem?.category,
      severity: processedItem?.severity,
      score: processedItem?.score,
      fields: processedItem?.fields,
      createdAt: processedItem?.createdAt,
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

export async function DELETE(req: Request): Promise<Response> {
  try {
    await connectMongoose();
    const ownerId = await getSessionOwnerId();

    if (!ownerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(req.url);
    let id: string | null = searchParams.get("id");

    if (!id) {
      try {
        const body = (await req.json()) as { id?: string };
        id = body?.id ?? null;
      } catch {
        // searchParams fallback
      }
    }

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing candidate ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const deleted = await ItemModel.findOneAndDelete({ _id: id, ownerId });
    if (!deleted) {
      return new Response(JSON.stringify({ error: "Candidate not found or unauthorized" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    await StarModel.removeForItem(ownerId, deleted._id);

    return Response.json({
      success: true,
      message: "Candidate profile deleted successfully.",
    });
  } catch (err) {
    logger.error("[items] Failed to delete candidate", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
