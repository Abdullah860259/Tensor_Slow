import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockEmbeddingModelV3, MockLanguageModelV3 } from "ai/test";
import { EMBEDDING_DIMENSIONS, embedText, embedManyTexts, cosineSimilarity } from "@/lib/ai/embed";
import { retrieveContext, keywordSearchFallback } from "@/lib/ai/rag";
import { getRawDb } from "@/lib/db";

// Mock AI models module with AI SDK v7 MockEmbeddingModelV3
vi.mock("@/lib/ai/models", async () => {
  const { MockEmbeddingModelV3, MockLanguageModelV3 } = await import("ai/test");
  const { EMBEDDING_DIMENSIONS } = await import("@/lib/contracts");
  return {
    embeddingModel: new MockEmbeddingModelV3({
      doEmbed: async ({ values }) => ({
        embeddings: values.map(() => new Array(EMBEDDING_DIMENSIONS).fill(0.05)),
        usage: { tokens: values.length * 5 },
        warnings: [],
      }),
    }),
    fastModel: new MockLanguageModelV3(),
    chatModel: new MockLanguageModelV3(),
  };
});

// Mock database layer
vi.mock("@/lib/db", () => {
  const mockCollection = {
    aggregate: vi.fn(),
    find: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn(() => mockCollection),
  };

  return {
    getRawDb: vi.fn(async () => mockDb),
    connectToDatabase: vi.fn(),
  };
});

function createMockCursor(docs: unknown[]) {
  const cursor = {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue(docs),
  };
  return cursor;
}

describe("RAG Retrieval & Embeddings", () => {
  let mockCollection: {
    aggregate: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await getRawDb();
    mockCollection = db.collection("items") as unknown as typeof mockCollection;
  });

  describe("Embedding generation (embedText & embedManyTexts)", () => {
    it("generates an embedding with exact EMBEDDING_DIMENSIONS using MockEmbeddingModelV3", async () => {
      const customMockModel = new MockEmbeddingModelV3({
        doEmbed: async ({ values }) => ({
          embeddings: values.map(() => new Array(EMBEDDING_DIMENSIONS).fill(0.123)),
          usage: { tokens: 10 },
          warnings: [],
        }),
      });

      const embedding = await embedText("Sample text to embed", customMockModel);

      expect(embedding).toHaveLength(EMBEDDING_DIMENSIONS);
      expect(embedding[0]).toBe(0.123);
      expect(customMockModel.doEmbedCalls.length).toBe(1);
      expect(customMockModel.doEmbedCalls[0]?.values).toEqual(["Sample text to embed"]);
    });

    it("generates batch embeddings using embedManyTexts with MockEmbeddingModelV3", async () => {
      const texts = ["Document 1", "Document 2", "Document 3"];
      const customMockModel = new MockEmbeddingModelV3({
        maxEmbeddingsPerCall: 10,
        doEmbed: async ({ values }) => ({
          embeddings: values.map((text) => {
            const idx = texts.indexOf(text);
            return new Array(EMBEDDING_DIMENSIONS).fill(idx + 1);
          }),
          usage: { tokens: values.length * 10 },
          warnings: [],
        }),
      });

      const embeddings = await embedManyTexts(texts, customMockModel);

      expect(embeddings).toHaveLength(3);
      expect(embeddings[0]).toHaveLength(EMBEDDING_DIMENSIONS);
      expect(embeddings[0]?.[0]).toBe(1);
      expect(embeddings[1]?.[0]).toBe(2);
      expect(embeddings[2]?.[0]).toBe(3);
    });
  });

  describe("Cosine similarity calculation", () => {
    it("computes 1.0 for identical vectors", () => {
      const vecA = [1, 2, 3, 4];
      const vecB = [1, 2, 3, 4];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("computes 0.0 for orthogonal vectors", () => {
      const vecA = [1, 0];
      const vecB = [0, 1];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it("computes -1.0 for opposite vectors", () => {
      const vecA = [1, 0];
      const vecB = [-1, 0];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it("throws error for dimension mismatch", () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2];
      expect(() => cosineSimilarity(vecA, vecB)).toThrow();
    });
  });

  describe("Context Retrieval (retrieveContext)", () => {
    it("returns empty array when query is empty or whitespace", async () => {
      const resEmpty = await retrieveContext("", "owner-123");
      const resWhitespace = await retrieveContext("    ", "owner-123");

      expect(resEmpty).toEqual([]);
      expect(resWhitespace).toEqual([]);
      expect(mockCollection.aggregate).not.toHaveBeenCalled();
    });

    it("returns empty array when ownerId is missing", async () => {
      const result = await retrieveContext("valid query", "");
      expect(result).toEqual([]);
      expect(mockCollection.aggregate).not.toHaveBeenCalled();
    });

    it("retrieves items via $vectorSearch aggregation pipeline successfully", async () => {
      const mockDocs = [
        {
          _id: "doc-1",
          title: "Architecture Guide",
          content: "System architecture and guidelines.",
          score: 0.94,
        },
        {
          _id: "doc-2",
          title: "API Specification",
          content: "Detailed API routes and contracts.",
          score: 0.88,
        },
      ];

      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockDocs),
      });

      const results = await retrieveContext("architecture", "owner-123", 5);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: "doc-1",
        title: "Architecture Guide",
        content: "System architecture and guidelines.",
        score: 0.94,
      });
      expect(results[1]).toEqual({
        id: "doc-2",
        title: "API Specification",
        content: "Detailed API routes and contracts.",
        score: 0.88,
      });

      // Verify aggregation pipeline structure
      expect(mockCollection.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = mockCollection.aggregate.mock.calls[0]?.[0];
      expect(pipeline).toBeDefined();
      expect(pipeline[0]).toHaveProperty("$vectorSearch");
      expect(pipeline[0].$vectorSearch).toMatchObject({
        index: "vector_index",
        path: "embedding",
        limit: 5,
        filter: { ownerId: { $eq: "owner-123" } },
      });
      expect(pipeline[0].$vectorSearch.queryVector).toHaveLength(EMBEDDING_DIMENSIONS);
    });

    it("falls back to keywordSearchFallback when $vectorSearch returns no results", async () => {
      // Vector search returns empty
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });

      const fallbackDocs = [
        {
          _id: "fb-1",
          title: "Financial Report",
          content: "Quarterly earnings and financial metrics.",
          aiTags: ["finance", "earnings"],
        },
      ];

      mockCollection.find.mockReturnValue(createMockCursor(fallbackDocs));

      const results = await retrieveContext("financial", "owner-123", 5);

      expect(mockCollection.aggregate).toHaveBeenCalledTimes(1);
      expect(mockCollection.find).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.id).toBe("fb-1");
      expect(results[0]?.title).toBe("Financial Report");
    });

    it("falls back to keywordSearchFallback when Atlas Vector Search throws an error", async () => {
      // Simulate MongoDB throwing an index error (e.g. index not found on local instance)
      mockCollection.aggregate.mockImplementation(() => {
        throw new Error("MongoServerError: Index 'vector_index' not found");
      });

      const fallbackDocs = [
        {
          _id: "fb-2",
          title: "Database Backup Policy",
          content: "Automated snapshot backup procedures.",
          aiTags: ["backup", "database"],
        },
      ];

      mockCollection.find.mockReturnValue(createMockCursor(fallbackDocs));

      const results = await retrieveContext("backup", "owner-123", 5);

      expect(mockCollection.find).toHaveBeenCalled();
      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe("fb-2");
    });
  });

  describe("Keyword Search Fallback (keywordSearchFallback)", () => {
    it("returns empty array for empty query or missing ownerId", async () => {
      const res1 = await keywordSearchFallback("", "owner-123");
      const res2 = await keywordSearchFallback("query", "");

      expect(res1).toEqual([]);
      expect(res2).toEqual([]);
      expect(mockCollection.find).not.toHaveBeenCalled();
    });

    it("matches terms in title, content, or aiTags and ranks by relevance", async () => {
      const mockItems = [
        {
          _id: "item-1",
          title: "Unrelated topic",
          content: "Mentions mongodb once in passing.",
          aiTags: ["general"],
        },
        {
          _id: "item-2",
          title: "MongoDB Atlas Overview",
          content: "Deep dive into mongodb atlas clustering and indexing.",
          aiTags: ["database", "mongodb"],
        },
      ];

      mockCollection.find.mockReturnValue(createMockCursor(mockItems));

      const results = await keywordSearchFallback("mongodb", "owner-123", 2);

      expect(results).toHaveLength(2);
      // item-2 has match in title, content, and tags -> higher score
      expect(results[0]?.id).toBe("item-2");
      expect(results[1]?.id).toBe("item-1");
      expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
    });

    it("respects the limit argument", async () => {
      const mockItems = [
        { _id: "1", title: "Test 1", content: "Test content 1" },
        { _id: "2", title: "Test 2", content: "Test content 2" },
        { _id: "3", title: "Test 3", content: "Test content 3" },
      ];

      mockCollection.find.mockReturnValue(createMockCursor(mockItems));

      const results = await keywordSearchFallback("Test", "owner-123", 2);
      expect(results).toHaveLength(2);
    });
  });
});
