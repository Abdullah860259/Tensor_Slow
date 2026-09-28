// STUB for Agent A (manifest item 25)
import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { AiRun } from "@/lib/contracts";

export type IAiRun = Omit<AiRun, "_id">;

const AiRunMongooseSchema = new Schema<IAiRun>(
  {
    ownerId: { type: String, required: true, index: true },
    feature: { type: String, required: true, enum: ["chat", "extract", "embed", "rag"] },
    model: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
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

AiRunMongooseSchema.index({ ownerId: 1, createdAt: -1 });

export const AiRunModel: Model<IAiRun> =
  (mongoose.models.AiRun as Model<IAiRun>) || mongoose.model<IAiRun>("AiRun", AiRunMongooseSchema);
