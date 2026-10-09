import { getRawDb } from "@/lib/db";
import { embedText, cosineSimilarity } from "@/lib/ai/embed";

export interface RagResultItem {
  id: string;
  title: string;
  content: string;
  score: number;
}

/**
 * Retrieve relevant item context for a user query using MongoDB Atlas Vector Search ($vectorSearch).
 * Sole owner: Agent C (Manifest item 33)
 *
 * Generates an embedding for the query, executes an Atlas Vector Search aggregation pipeline,
 * and extracts document contents and relevance score.
 * If the vector index is unavailable (e.g. local development on plain MongoDB, or index building),
 * it seamlessly falls back to keywordSearchFallback with local in-memory cosine ranking.
 */
export async function retrieveContext(
  query: string,
  ownerId: string,
  limit: number = 5
): Promise<RagResultItem[]> {
  const safeLimit = Math.max(1, limit);
  const trimmedQuery = query.trim();

  if (!trimmedQuery || !ownerId) {
    return [];
  }

  let queryVector: number[] | null = null;
  try {
    queryVector = await embedText(trimmedQuery);
  } catch (embedError) {
    console.warn(
      "[rag] Failed to generate query embedding; proceeding to keyword fallback:",
      embedError instanceof Error ? embedError.message : String(embedError)
    );
    return await keywordSearchFallback(trimmedQuery, ownerId, safeLimit);
  }

  try {
    const db = await getRawDb();
    const collection = db.collection("items");

    // Atlas Vector Search aggregation pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector,
          numCandidates: Math.max(safeLimit * 10, 20),
          limit: safeLimit,
          filter: {
            ownerId: { $eq: ownerId },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    if (results.length > 0) {
      return results.map((doc) => ({
        id: String(doc._id ?? ""),
        title: String(doc.title || ""),
        content: String(doc.content || ""),
        score: typeof doc.score === "number" ? doc.score : 1.0,
      }));
    }

    // If vector search returned 0 items (e.g. index still building or no vector matches), fallback
    return await keywordSearchFallback(trimmedQuery, ownerId, safeLimit, queryVector);
  } catch (error) {
    console.warn(
      "[rag] Atlas Vector Search unavailable or failed; using keyword search fallback:",
      error instanceof Error ? error.message : String(error)
    );
    return await keywordSearchFallback(trimmedQuery, ownerId, safeLimit, queryVector);
  }
}

/**
 * Keyword-search and in-memory cosine similarity fallback for environments
 * where Atlas Vector Search is unavailable or un-indexed.
 *
 * Scopes queries to the session ownerId. If item embeddings exist, computes cosineSimilarity
 * against the query vector to provide accurate local/dev ranking; otherwise ranks by keyword frequency.
 */
export async function keywordSearchFallback(
  query: string,
  ownerId: string,
  limit: number = 5,
  precomputedQueryVector?: number[] | null
): Promise<RagResultItem[]> {
  const safeLimit = Math.max(1, limit);
  const trimmed = query.trim();

  if (!trimmed || !ownerId) {
    return [];
  }

  const db = await getRawDb();
  const collection = db.collection("items");

  // Tokenize query into terms for regex matching
  const rawTerms = trimmed.split(/\s+/).filter(Boolean);
  const terms = rawTerms
    .filter((t) => t.length > 1)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const regexPattern =
    terms.length > 0
      ? terms.join("|")
      : trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const filter: Record<string, unknown> = {
    ownerId,
    $or: [
      { title: { $regex: regexPattern, $options: "i" } },
      { content: { $regex: regexPattern, $options: "i" } },
      ...(terms.length > 0
        ? [{ aiTags: { $in: terms.map((t) => new RegExp(t, "i")) } }]
        : []),
    ],
  };

  let items = await collection.find(filter).limit(safeLimit * 5).toArray();

  // If keyword filter matched 0 items, retrieve user's candidate items for local vector ranking
  if (items.length === 0) {
    items = await collection
      .find({ ownerId })
      .sort({ createdAt: -1 })
      .limit(safeLimit * 5)
      .toArray();
  }

  if (items.length === 0) {
    return [];
  }

  // Obtain query vector for in-memory cosine ranking if not already provided
  let queryVector = precomputedQueryVector ?? null;
  if (!queryVector) {
    try {
      queryVector = await embedText(trimmed);
    } catch {
      queryVector = null;
    }
  }

  const scoredItems: RagResultItem[] = items.map((item) => {
    let score = 0.5;

    if (
      queryVector &&
      Array.isArray(item.embedding) &&
      item.embedding.length === queryVector.length
    ) {
      try {
        score = cosineSimilarity(queryVector, item.embedding as number[]);
      } catch {
        score = 0.5;
      }
    } else {
      const lowerTitle = String(item.title || "").toLowerCase();
      const lowerContent = String(item.content || "").toLowerCase();
      const tags = Array.isArray(item.aiTags)
        ? (item.aiTags as string[]).map((t) => String(t).toLowerCase())
        : [];
      let matches = 0;
      for (const term of terms) {
        const lowerTerm = term.toLowerCase();
        if (lowerTitle.includes(lowerTerm)) matches += 2;
        if (lowerContent.includes(lowerTerm)) matches += 1;
        if (tags.some((tag) => tag.includes(lowerTerm))) matches += 2;
      }
      score = Math.min(1.0, 0.2 + matches * 0.2);
    }

    return {
      id: String(item._id ?? ""),
      title: String(item.title || ""),
      content: String(item.content || ""),
      score,
    };
  });

  scoredItems.sort((a, b) => b.score - a.score);
  return scoredItems.slice(0, safeLimit);
}
