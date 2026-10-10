// SourcingRun: one AI sourcing request — the recruiter's brief and answers, the LinkedIn search
// sent to Apify, and the progress of importing and scoring the candidates it returned.
import mongoose, { Schema, Types, type Model } from "mongoose";

export const SOURCING_STATUSES = ["running", "importing", "scoring", "completed", "failed"] as const;
export type SourcingStatus = (typeof SOURCING_STATUSES)[number];

export interface ISourcingRun {
  ownerId: string;
  roleTitle: string;
  brief: string;
  // Questions shown (core + AI-generated) and the recruiter's answers, kept for audit and re-runs
  questions: unknown[];
  answers: Record<string, unknown>;
  // Exact input sent to the Apify actor
  actorInput: Record<string, unknown>;
  // Requirements text every imported candidate is scored against
  criteriaText: string;
  mustHaveKeywords: string[];
  candidateCount: number;
  apifyRunId: string;
  apifyDatasetId: string;
  status: SourcingStatus;
  error?: string;
  stats: {
    scraped: number;
    invalid: number;
    duplicates: number;
    irrelevant: number;
    overLimit: number;
    imported: number;
  };
  itemIds: Types.ObjectId[];
  // Last time candidate scoring was (re)started; used to resume scoring if a function was cut short
  scoringStartedAt?: Date;
  costUsd?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SourcingRunSchema = new Schema<ISourcingRun>(
  {
    ownerId: { type: String, required: true },
    roleTitle: { type: String, required: true, trim: true },
    brief: { type: String, required: true },
    questions: { type: [Schema.Types.Mixed], default: [] },
    answers: { type: Schema.Types.Mixed, default: {} },
    actorInput: { type: Schema.Types.Mixed, required: true },
    criteriaText: { type: String, required: true },
    mustHaveKeywords: { type: [String], default: [] },
    candidateCount: { type: Number, required: true, min: 1, max: 50 },
    apifyRunId: { type: String, required: true },
    apifyDatasetId: { type: String, required: true },
    status: { type: String, enum: SOURCING_STATUSES, default: "running" },
    error: { type: String },
    stats: {
      scraped: { type: Number, default: 0 },
      invalid: { type: Number, default: 0 },
      duplicates: { type: Number, default: 0 },
      irrelevant: { type: Number, default: 0 },
      overLimit: { type: Number, default: 0 },
      imported: { type: Number, default: 0 },
    },
    itemIds: { type: [Schema.Types.ObjectId], ref: "Item", default: [] },
    scoringStartedAt: { type: Date },
    costUsd: { type: Number },
  },
  { timestamps: true }
);

// Per-user history and the daily spend cap both query by owner + recency
SourcingRunSchema.index({ ownerId: 1, createdAt: -1 });
// Global daily spend cap
SourcingRunSchema.index({ createdAt: -1 });

// Re-use compiled model in Next.js hot-reloading dev environment to avoid OverwriteModelError
export const SourcingRunModel: Model<ISourcingRun> =
  (mongoose.models.SourcingRun as Model<ISourcingRun>) ||
  mongoose.model<ISourcingRun>("SourcingRun", SourcingRunSchema);
