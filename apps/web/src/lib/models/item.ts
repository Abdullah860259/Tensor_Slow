// STUB for Agent A (manifest item 23)
// PLACEHOLDER DOMAIN — replace when real domain is chosen
import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Item } from "@/lib/contracts";

export type IItem = Omit<Item, "_id">;

const ItemMongooseSchema = new Schema<IItem>(
  {
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    sourceUrl: { type: String },
    mime: { type: String },
    status: { type: String, enum: ["pending", "processed", "failed"], default: "pending" },
    aiSummary: { type: String },
    aiTags: { type: [String], default: [] },
    embedding: { type: [Number] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ItemModel: Model<IItem> =
  (mongoose.models.Item as Model<IItem>) || mongoose.model<IItem>("Item", ItemMongooseSchema);
