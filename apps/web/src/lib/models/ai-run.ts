// Manifest item 25: AI run logging and cost tracking model
import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { AiRun } from "@/lib/contracts";

// Infer document interface from contracts source of truth, omitting the MongoDB-generated _id
export type IAiRun = Omit<AiRun, "_id">;

const AiRunMongooseSchema = new Schema<IAiRun>(
  {
    // Scopes every audit log to the authenticated session owner; indexed for fast single-field lookups
    ownerId: { type: String, required: true, index: true },
    feature: { type: String, required: true, enum: ["chat", "extract", "embed", "rag"] },
    model: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    // AI SDK v7 token tracking details: prompt cache reads and reasoning token metrics
    reasoningTokens: { type: Number, default: 0 },
    cacheReadTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    status: { type: String, enum: ["success", "error"], default: "success" },
    error: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Compound index to support chronological audit log queries and user-scoped cost breakdowns
AiRunMongooseSchema.index({ ownerId: 1, createdAt: -1 });

// Compound index to support per-feature cost/latency analytics across user sessions
AiRunMongooseSchema.index({ ownerId: 1, feature: 1, createdAt: -1 });

// Re-use compiled model in Next.js hot-reloading dev environment to avoid OverwriteModelError
export const AiRunModel: Model<IAiRun> =
  (mongoose.models.AiRun as Model<IAiRun>) || mongoose.model<IAiRun>("AiRun", AiRunMongooseSchema);

