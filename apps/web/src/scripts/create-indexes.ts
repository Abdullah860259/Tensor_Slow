import { EMBEDDING_DIMENSIONS } from "@/lib/contracts";
import { connectToDatabase, connectMongoose } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Manifest item 27: Programmatically creates compound B-tree indexes across all
 * application collections and the Atlas Vector Search index on items.embedding.
 *
 * Guaranteed to be idempotent: safe to run repeatedly across deployments and test suites.
 */
export async function createIndexes(): Promise<void> {
  // 1. Strict dimension check: Gemini text-embedding-004 produces 768-dimensional vectors.
  // Mismatched numDimensions causes Atlas Vector Search to silently return empty results.
  if (EMBEDDING_DIMENSIONS !== 768) {
    throw new Error(
      `EMBEDDING_DIMENSIONS mismatch: expected 768 (matching Gemini text-embedding-004), but got ${EMBEDDING_DIMENSIONS}. ` +
      `Atlas Vector Search numDimensions MUST exactly match the embedding model output dimension, or vector search will silently fail.`
    );
  }

  // 2. Connect to database using cached connection to avoid exhausting Atlas M0 connection pool
  const { db } = await connectToDatabase();
  await connectMongoose();

  logger.info("Ensuring collections and compound B-tree indexes exist...");

  // Ensure collections exist prior to creating search indexes
  const existingCollections = await db.listCollections().toArray();
  const existingCollectionNames = new Set(existingCollections.map((c) => c.name));

  const requiredCollections = ["items", "chatthreads", "chatmessages", "airuns"];
  for (const collName of requiredCollections) {
    if (!existingCollectionNames.has(collName)) {
      await db.createCollection(collName);
    }
  }

  // 3. Create compound & standard B-tree indexes (natively idempotent in MongoDB)
  // Scopes all item queries by ownerId with sorting by newest first
  await db.collection("items").createIndex({ ownerId: 1, createdAt: -1 });
  // Supports filtering user items by ingestion/processing status
  await db.collection("items").createIndex({ ownerId: 1, status: 1 });

  // Chat thread lookup by owner, sorted by latest activity
  await db.collection("chatthreads").createIndex({ ownerId: 1, createdAt: -1 });
  // Chat thread lookup scoped to a specific item
  await db.collection("chatthreads").createIndex({ ownerId: 1, itemId: 1 });

  // Chat messages retrieved in chronological order for a thread
  await db.collection("chatmessages").createIndex({ threadId: 1, createdAt: 1 });

  // AI run auditing and cost dashboard aggregation queries
  await db.collection("airuns").createIndex({ ownerId: 1, createdAt: -1 });
  await db.collection("airuns").createIndex({ ownerId: 1, feature: 1, createdAt: -1 });

  logger.info("Compound B-tree indexes ensured successfully.");

  // 4. Create Atlas Vector Search index on items.embedding
  const itemsCollection = db.collection("items");

  const UNSUPPORTED_SEARCH_MESSAGE =
    "Atlas Search and Vector Search are not supported by the current MongoDB deployment. " +
    "Atlas Search requires MongoDB Atlas or the 'mongodb/mongodb-atlas-local' Docker image (which includes mongot). " +
    "Standard MongoDB images do not support search indexes. See docs/SYSTEM_PROMPT.md §E.";

  function isUnsupportedSearchError(error: unknown): boolean {
    const err = error as { code?: number; codeName?: string; message?: string };
    return Boolean(
      err.code === 59 ||
      err.code === 40324 ||
      err.codeName === "CommandNotFound" ||
      err.codeName === "Location40324" ||
      err.message?.includes("no such command") ||
      err.message?.includes("not supported") ||
      err.message?.includes("mongot") ||
      err.message?.includes("$listSearchIndexes") ||
      err.message?.includes("pipeline stage") ||
      err.message?.includes("Unrecognized pipeline stage")
    );
  }

  function isIndexAlreadyExistsError(error: unknown): boolean {
    const err = error as { code?: number; codeName?: string; message?: string };
    return Boolean(
      err.code === 68 ||
      err.codeName === "IndexAlreadyExists" ||
      err.message?.includes("already exists")
    );
  }

  try {
    let existingSearchIndexes: Array<{
      name: string;
      latestDefinition?: {
        fields?: Array<{ type?: string; path?: string; numDimensions?: number }>;
      };
    }> = [];

    try {
      const cursor = itemsCollection.listSearchIndexes();
      existingSearchIndexes = await cursor.toArray();
    } catch (listError: unknown) {
      if (isUnsupportedSearchError(listError)) {
        throw new Error(UNSUPPORTED_SEARCH_MESSAGE);
      }
      throw listError;
    }

    const existingVectorIndex = existingSearchIndexes.find((idx) => idx.name === "vector_index");

    if (existingVectorIndex) {
      // Validate existing index dimensions if definition is accessible to avoid silent RAG failure
      const vectorField = existingVectorIndex.latestDefinition?.fields?.find(
        (f) => f.type === "vector" && f.path === "embedding"
      );
      if (
        vectorField &&
        vectorField.numDimensions !== undefined &&
        vectorField.numDimensions !== EMBEDDING_DIMENSIONS
      ) {
        throw new Error(
          `Existing Atlas Vector Search index 'vector_index' has numDimensions=${vectorField.numDimensions}, ` +
          `which does not match EMBEDDING_DIMENSIONS=${EMBEDDING_DIMENSIONS}. ` +
          `Mismatched dimensions cause Atlas Vector Search to silently fail. Drop or re-create the index.`
        );
      }
      logger.info("Atlas Vector Search index 'vector_index' already exists on collection 'items'.");
    } else {
      await itemsCollection.createSearchIndex({
        name: "vector_index",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: EMBEDDING_DIMENSIONS,
              similarity: "cosine",
            },
            {
              type: "filter",
              path: "ownerId",
            },
          ],
        },
      });
      logger.info("Created Atlas Vector Search index 'vector_index' on collection 'items'.");
    }
  } catch (error: unknown) {
    if (isUnsupportedSearchError(error)) {
      throw new Error(UNSUPPORTED_SEARCH_MESSAGE);
    }
    // Handle concurrent index creation gracefully for idempotency
    if (isIndexAlreadyExistsError(error)) {
      logger.info("Atlas Vector Search index 'vector_index' already exists (concurrent creation handled).");
    } else {
      throw error;
    }
  }
}

if (process.env.NODE_ENV !== "test" && typeof window === "undefined" && require.main === module) {
  createIndexes()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

