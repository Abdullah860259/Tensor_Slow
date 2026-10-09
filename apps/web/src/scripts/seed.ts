import { ObjectId } from "mongodb";
import { EMBEDDING_DIMENSIONS } from "@/lib/contracts";
import { connectToDatabase, connectMongoose } from "@/lib/db";
import { ItemModel, ChatThreadModel, ChatMessageModel, AiRunModel } from "@/lib/models";
import { logger } from "@/lib/logger";

/**
 * Generates a deterministic unit-length embedding vector of EMBEDDING_DIMENSIONS length.
 * Deterministic generation ensures repeatable seed data and valid vector search calculations.
 */
function generateDeterministicEmbedding(seed: number): number[] {
  const raw: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    const val = Math.sin((seed + 1) * 997 + i * 17);
    raw.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return raw.map((val) => Number((val / norm).toFixed(6)));
}

/**
 * Manifest item 28: Seed script populating an anonymous demo user, realistic items
 * with embeddings, multi-turn chat threads, and AI run telemetry records.
 *
 * Guaranteed to be idempotent: safe to execute repeatedly without duplicating data.
 */
export async function seed(): Promise<void> {
  const { db } = await connectToDatabase();
  await connectMongoose();

  const demoEmail = process.env.DEMO_USER_EMAIL || "demo@example.com";
  logger.info("Starting idempotent seed for demo user...", { email: demoEmail });

  // 1. Ensure demo user exists in Better Auth user collection
  const user = await db.collection("user").findOne({ email: demoEmail });
  let userId: string;

  if (!user) {
    const newUserId = new ObjectId();
    await db.collection("user").insertOne({
      _id: newUserId,
      id: newUserId.toString(),
      name: "Demo User",
      email: demoEmail,
      emailVerified: true,
      isAnonymous: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userId = newUserId.toString();
    logger.info("Created new anonymous demo user", { userId, email: demoEmail });
  } else {
    userId = (user.id as string) || user._id.toString();
    logger.info("Found existing demo user", { userId, email: demoEmail });
  }

  // 2. Seed 7 realistic items (within 5-8 requirement) in the placeholder domain
  // PLACEHOLDER DOMAIN — replace when real domain is chosen
  const seedItems = [
    {
      title: "Atlas Vector Search Architecture Guide",
      content:
        "MongoDB Atlas Vector Search allows developers to store vector embeddings directly alongside operational JSON documents in a single, fully managed database. By integrating hierarchical navigable small world (HNSW) and inverted file (IVF) graph indexing into MongoDB's native cluster infrastructure, teams eliminate the architectural complexity and consistency delays inherent in synchronizing data to dedicated external vector stores like Pinecone or Qdrant. For modern RAG pipelines, this means atomic updates across operational fields and high-dimensional semantic vectors.",
      sourceUrl: "https://www.mongodb.com/docs/atlas/atlas-vector-search/",
      mime: "text/markdown",
      status: "processed" as const,
      aiSummary:
        "Architectural overview of MongoDB Atlas Vector Search combining document storage and vector indexing.",
      aiTags: ["mongodb", "atlas", "vector-search", "architecture", "rag"],
      embedding: generateDeterministicEmbedding(1),
    },
    {
      title: "AI SDK v7 Migration Notes",
      content:
        "The Vercel AI SDK v7 introduces key API changes designed for robust multimodal agent workflows. CoreMessage is replaced by ModelMessage, system prompts are now specified via the instructions parameter, and convertToModelMessages is strictly asynchronous. Furthermore, ToolLoopAgent replaces Experimental_Agent with a default stopWhen step limit of 20. UIMessage content parts now represent an open discriminated union supporting reasoning, tool call states, and reasoning-file attachments.",
      sourceUrl: "https://sdk.vercel.ai/docs",
      mime: "text/markdown",
      status: "processed" as const,
      aiSummary: "Key breaking changes and architectural patterns introduced in Vercel AI SDK v7.",
      aiTags: ["ai-sdk", "typescript", "agents", "migration", "llm"],
      embedding: generateDeterministicEmbedding(2),
    },
    {
      title: "Next.js 16 App Router & Server Architecture",
      content:
        "Next.js 16 consolidates server conventions for hybrid full-stack applications. The legacy middleware convention is replaced by src/proxy.ts exporting a proxy function. Tailwind CSS v4 moves away from javascript configuration files toward CSS-first theme configuration using @theme directives. In serverless environments such as Vercel, persistent disk storage is not available; file uploads must stream directly to cloud object storage like Vercel Blob.",
      sourceUrl: "https://nextjs.org/docs",
      mime: "text/markdown",
      status: "processed" as const,
      aiSummary:
        "Summary of Next.js 16 features including proxy conventions, Tailwind v4 CSS-first design, and stateless serverless architecture.",
      aiTags: ["nextjs", "react", "serverless", "tailwind", "vercel"],
      embedding: generateDeterministicEmbedding(3),
    },
    {
      title: "Cost Governance & Observability in LLM Applications",
      content:
        "Monitoring token consumption and API latency is critical for production AI systems. Every LLM invocation must be logged with granular token usage metrics, including prompt cache reads (cacheReadTokens) and reasoning token output (reasoningTokens). By maintaining an audit trail in the aiRuns collection, engineering teams can detect runaway loops, evaluate model latency regressions, and enforce per-user rate limits.",
      sourceUrl: "https://ai.google.dev/pricing",
      mime: "text/markdown",
      status: "processed" as const,
      aiSummary:
        "Best practices for logging LLM token metrics, latency, and cost attribution in production.",
      aiTags: ["observability", "token-tracking", "cost-governance", "ai-runs", "monitoring"],
      embedding: generateDeterministicEmbedding(4),
    },
    {
      title: "Structured Output Extraction with Zod and Gemini",
      content:
        "Extracting structured JSON from unstructured text requires strict schema contracts and resilient error handling. When using Gemini structured output through generateObject, schemas should leverage z.coerce, optional fields, and .catch() fallbacks to absorb minor variations in model responses. Structured data can then be persisted directly into validated Mongoose models.",
      sourceUrl: "https://ai.google.dev/docs",
      mime: "text/markdown",
      status: "processed" as const,
      aiSummary:
        "Guidelines for implementing resilient structured output extraction using Zod and Gemini models.",
      aiTags: ["structured-output", "zod", "gemini", "json-schema", "data-extraction"],
      embedding: generateDeterministicEmbedding(5),
    },
    {
      title: "Anonymous-First Authentication Patterns",
      content:
        "User onboarding friction is a leading cause of drop-off in demo and evaluation environments. Implementing an anonymous-first authentication flow with Better Auth enables immediate session creation without requiring email verification or password entry. When users decide to persist their workspaces permanently, the anonymous session is linked to an authenticated credential without losing existing items or chat histories.",
      sourceUrl: "https://better-auth.com/docs",
      mime: "text/markdown",
      status: "processed" as const,
      aiSummary:
        "Strategies for zero-friction anonymous authentication with seamless account linking using Better Auth.",
      aiTags: ["auth", "better-auth", "ux", "onboarding", "security"],
      embedding: generateDeterministicEmbedding(6),
    },
    {
      title: "Draft Note: Real-time Audio Streaming with Live API",
      content:
        "Exploring real-time bidirectional audio streaming using WebSockets and the Gemini Live API. Initial testing shows low-latency turn-taking with built-in voice activity detection (VAD). Documenting integration points for future voice interaction experiments.",
      mime: "text/plain",
      status: "pending" as const,
      aiSummary:
        "Initial exploration of bidirectional WebSocket streaming and voice interaction using the Gemini Live API.",
      aiTags: ["live-api", "audio", "websockets", "voice", "streaming"],
    },
  ];

  // Upsert items by ownerId and title for idempotency, sanitizing undefined fields so BSON never writes null
  const seededItemIds: string[] = [];
  for (const item of seedItems) {
    const updateData: Record<string, unknown> = { ...item, ownerId: userId };
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    }
    const doc = await ItemModel.findOneAndUpdate(
      { ownerId: userId, title: item.title },
      { $set: updateData },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    if (doc) {
      seededItemIds.push(doc._id.toString());
    }
  }
  logger.info(`Seeded ${seedItems.length} items for demo user`);

  // 3. Seed 3+ realistic chat threads with messages and AI responses
  const seedThreads = [
    {
      title: "Getting Started with Atlas Vector Search",
      // Link to the first seeded item to demonstrate contextual RAG conversations
      itemId: seededItemIds[0],
      messages: [
        {
          role: "user" as const,
          parts: [
            {
              type: "text",
              text: "How does Atlas Vector Search integrate with Next.js and Mongoose?",
            },
          ],
          createdAt: new Date(Date.now() - 3600000 * 48),
        },
        {
          role: "assistant" as const,
          parts: [
            {
              type: "text",
              text: "Atlas Vector Search integrates directly with your existing MongoDB collections. In Next.js, you store vector embeddings (e.g., 768 dimensions from Gemini) alongside your document content in Mongoose or MongoDB native collections. You can then run aggregation pipelines using the $vectorSearch stage to find semantically similar items.",
            },
          ],
          usage: { inputTokens: 42, outputTokens: 68, reasoningTokens: 0, cacheReadTokens: 0 },
          createdAt: new Date(Date.now() - 3600000 * 48 + 1500),
        },
      ],
    },
    {
      title: "Architecture & Data Pipeline Design",
      messages: [
        {
          role: "user" as const,
          parts: [
            {
              type: "text",
              text: "Can you analyze the pros and cons of using MongoDB Atlas M0 free tier for vector search?",
            },
          ],
          createdAt: new Date(Date.now() - 3600000 * 24),
        },
        {
          role: "assistant" as const,
          parts: [
            {
              type: "text",
              text: "The primary advantage of Atlas M0 is unified data and vector storage with zero additional infrastructure overhead or cost. Atlas Search and Vector Search are supported directly on M0. The main limitation is memory and connection limits, which is why caching your MongoClient connection on globalThis is essential in serverless environments.",
            },
          ],
          usage: { inputTokens: 55, outputTokens: 82, reasoningTokens: 0, cacheReadTokens: 0 },
          createdAt: new Date(Date.now() - 3600000 * 24 + 1800),
        },
      ],
    },
    {
      title: "AI Extraction and Document Analysis",
      messages: [
        {
          role: "user" as const,
          parts: [
            {
              type: "text",
              text: "What is the recommended approach for structured extraction with Gemini models?",
            },
          ],
          createdAt: new Date(Date.now() - 3600000 * 4),
        },
        {
          role: "assistant" as const,
          parts: [
            {
              type: "text",
              text: "Using the AI SDK v7, you can use `generateObject` with a Zod schema. Always use `z.coerce`, optional fields, and `.catch()` where an LLM could plausibly return a slightly non-standard shape, as LLM outputs can vary.",
            },
          ],
          usage: { inputTokens: 38, outputTokens: 74, reasoningTokens: 0, cacheReadTokens: 0 },
          createdAt: new Date(Date.now() - 3600000 * 4 + 1200),
        },
      ],
    },
  ];

  for (const threadData of seedThreads) {
    const threadUpdate: Record<string, unknown> = {
      ownerId: userId,
      title: threadData.title,
    };
    if (threadData.itemId) {
      threadUpdate.itemId = threadData.itemId;
    }

    const threadDoc = await ChatThreadModel.findOneAndUpdate(
      { ownerId: userId, title: threadData.title },
      { $set: threadUpdate },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    const threadId = threadDoc._id.toString();

    // Reset messages for this seed thread to ensure clean idempotent state
    await ChatMessageModel.deleteMany({ threadId });
    await ChatMessageModel.insertMany(
      threadData.messages.map((msg) => ({
        ...msg,
        threadId,
      }))
    );
  }
  logger.info(`Seeded ${seedThreads.length} chat threads with messages`);

  // 4. Seed AI run telemetry records
  const seedAiRuns = [
    {
      feature: "chat" as const,
      model: "gemini-3.8-flash",
      inputTokens: 120,
      outputTokens: 85,
      reasoningTokens: 32,
      cacheReadTokens: 64,
      latencyMs: 420,
      costUsd: 0.00003,
      status: "success" as const,
      createdAt: new Date(Date.now() - 3600000 * 3),
    },
    {
      feature: "extract" as const,
      model: "gemini-3.8-flash",
      inputTokens: 350,
      outputTokens: 110,
      reasoningTokens: 0,
      cacheReadTokens: 0,
      latencyMs: 580,
      costUsd: 0.00007,
      status: "success" as const,
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      feature: "embed" as const,
      model: "gemini-embedding-001",
      inputTokens: 240,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheReadTokens: 0,
      latencyMs: 150,
      costUsd: 0.00001,
      status: "success" as const,
      createdAt: new Date(Date.now() - 3600000 * 1.5),
    },
    {
      feature: "rag" as const,
      model: "gemini-3.8-flash",
      inputTokens: 850,
      outputTokens: 220,
      reasoningTokens: 64,
      cacheReadTokens: 128,
      latencyMs: 910,
      costUsd: 0.00015,
      status: "success" as const,
      createdAt: new Date(Date.now() - 3600000 * 1),
    },
    {
      feature: "chat" as const,
      model: "gemini-3.8-flash",
      inputTokens: 150,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheReadTokens: 0,
      latencyMs: 210,
      costUsd: 0,
      status: "error" as const,
      error: "Rate limit reached on free tier",
      createdAt: new Date(Date.now() - 3600000 * 0.5),
    },
  ];

  // Clean previous demo aiRuns and re-seed to ensure idempotent count
  await AiRunModel.deleteMany({ ownerId: userId });
  await AiRunModel.insertMany(
    seedAiRuns.map((run) => ({
      ...run,
      ownerId: userId,
    }))
  );
  logger.info(`Seeded ${seedAiRuns.length} AI run audit logs`);

  logger.info("Database seeding completed successfully.");
}

if (process.env.NODE_ENV !== "test" && typeof window === "undefined" && require.main === module) {
  seed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

