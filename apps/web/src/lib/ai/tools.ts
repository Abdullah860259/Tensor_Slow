import { tool } from "ai";
import { z } from "zod";
import { getRawDb } from "@/lib/db";
import { embedText } from "@/lib/ai/embed";

/**
 * Tool for creating an item in the database.
 * Sole owner: Agent C (Manifest item 34)
 */
export const createItemTool = tool({
  description: "Create a new item in the database",
  inputSchema: z.object({
    title: z.string().describe("Title of the item"),
    content: z.string().describe("Content of the item"),
  }),
  execute: async ({ title, content }: { title: string; content: string }) => {
    try {
      const db = await getRawDb();
      let embedding: number[] | undefined;
      try {
        embedding = await embedText(`${title}\n${content}`);
      } catch {
        // embedding generation is best-effort when offline / in mock mode
      }

      const now = new Date();
      const doc = {
        title,
        content,
        ownerId: "system", // Tools called in agent loop without explicit user context default to system
        status: "processed" as const,
        aiTags: [],
        ...(embedding ? { embedding } : {}),
        createdAt: now,
      };

      const result = await db.collection("items").insertOne(doc);
      return { success: true, id: result.insertedId.toString(), title };
    } catch (err) {
      console.warn("[tools] createItemTool failed:", err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
});

/**
 * Tool for searching items by keyword or tags.
 */
export const searchItemsTool = tool({
  description: "Search items by semantic similarity, keyword, or tags",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      const db = await getRawDb();
      const safeQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const items = await db
        .collection("items")
        .find({
          $or: [
            { title: { $regex: safeQuery, $options: "i" } },
            { content: { $regex: safeQuery, $options: "i" } },
            { aiTags: { $regex: safeQuery, $options: "i" } },
          ],
        })
        .limit(5)
        .toArray();

      return {
        items: items.map((doc) => ({
          id: String(doc._id ?? ""),
          title: String(doc.title || ""),
          content: String(doc.content || ""),
        })),
      };
    } catch (err) {
      console.warn("[tools] searchItemsTool failed:", err);
      return { items: [] };
    }
  },
});

/**
 * Tool for fetching an item by its unique ID.
 */
export const getItemTool = tool({
  description: "Get an item by its ID",
  inputSchema: z.object({
    id: z.string().describe("The unique item ID"),
  }),
  execute: async ({ id }: { id: string }) => {
    try {
      const db = await getRawDb();
      const { ObjectId } = await import("mongodb");
      let doc = null;

      if (ObjectId.isValid(id)) {
        doc = await db.collection("items").findOne({ _id: new ObjectId(id) });
      }

      if (!doc) {
        doc = await db
          .collection("items")
          .findOne({ _id: id as unknown as import("mongodb").ObjectId });
      }

      if (!doc) {
        return { item: null };
      }

      return {
        item: {
          id: String(doc._id ?? ""),
          title: String(doc.title || ""),
          content: String(doc.content || ""),
          status: String(doc.status || "processed"),
          aiSummary: typeof doc.aiSummary === "string" ? doc.aiSummary : undefined,
          aiTags: Array.isArray(doc.aiTags) ? (doc.aiTags as string[]) : [],
          createdAt: doc.createdAt,
        },
      };
    } catch (err) {
      console.warn("[tools] getItemTool failed:", err);
      return { item: null };
    }
  },
});

// Primary tool collection bundle
export const aiTools = {
  createItem: createItemTool,
  searchItems: searchItemsTool,
  getItem: getItemTool,
};

// Aliases for consumer flexibility and exact naming alignment
export const tools = aiTools;
export const createItem = createItemTool;
export const searchItems = searchItemsTool;
export const getItem = getItemTool;
