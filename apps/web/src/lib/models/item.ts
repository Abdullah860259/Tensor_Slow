// Manifest item 23: Item model
// PLACEHOLDER DOMAIN — replace when real product domain is finalized.
// Items represent user-owned artifacts (documents, notes, or media) in the placeholder domain.
import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Item } from "@/lib/contracts";

// Infer document interface from contracts source of truth, omitting the MongoDB-generated _id
export type IItem = Omit<Item, "_id">;

const ItemMongooseSchema = new Schema<IItem>(
  {
    // Scopes every query to the authenticated session owner; indexed for fast single-field lookups
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    sourceUrl: { type: String },
    mime: { type: String },
    status: { type: String, enum: ["pending", "processed", "failed"], default: "pending" },
    aiSummary: { type: String },
    aiTags: { type: [String], default: [] },
    // 768-dimensional vector matching Gemini text-embedding-004 output; indexed via Atlas Vector Search
    embedding: { type: [Number] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index to support efficient pagination and sorting by creation date for user-scoped queries
ItemMongooseSchema.index({ ownerId: 1, createdAt: -1 });

// Compound index to support filtering user items by ingestion/processing status
ItemMongooseSchema.index({ ownerId: 1, status: 1 });

// Re-use compiled model in Next.js hot-reloading dev environment to avoid OverwriteModelError
export const ItemModel: Model<IItem> =
  (mongoose.models.Item as Model<IItem>) || mongoose.model<IItem>("Item", ItemMongooseSchema);

