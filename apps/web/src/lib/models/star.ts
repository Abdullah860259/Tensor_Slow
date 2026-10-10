// Star model — a recruiter (session owner) bookmarking a candidate Item for quick access.
// One document per (ownerId, itemId) pair; unstarring deletes the document.
import mongoose, { Schema, Types, type HydratedDocument, type Model } from "mongoose";

export interface IStar {
  // Session user who starred the candidate
  ownerId: string;
  // Starred candidate Item
  itemId: Types.ObjectId;
  // Optional private note explaining why the candidate was starred
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type StarDocument = HydratedDocument<IStar>;

export interface IStarStatics {
  star(ownerId: string, itemId: string | Types.ObjectId, note?: string): Promise<StarDocument>;
  unstar(ownerId: string, itemId: string | Types.ObjectId): Promise<boolean>;
  toggleStar(ownerId: string, itemId: string | Types.ObjectId): Promise<{ starred: boolean }>;
  isStarred(ownerId: string, itemId: string | Types.ObjectId): Promise<boolean>;
  getStarredItemIds(ownerId: string): Promise<string[]>;
  removeForItem(ownerId: string, itemId: string | Types.ObjectId): Promise<void>;
  countForOwner(ownerId: string): Promise<number>;
}

export type StarModelType = Model<IStar> & IStarStatics;

const StarSchema = new Schema<IStar, StarModelType>(
  {
    // Covered by the compound indexes below, which all lead with ownerId
    ownerId: { type: String, required: true },
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// A user can star a given candidate at most once
StarSchema.index({ ownerId: 1, itemId: 1 }, { unique: true });

// List a user's stars ordered by most recent first
StarSchema.index({ ownerId: 1, createdAt: -1 });

// Idempotent: upserts so starring an already-starred item just refreshes the note
StarSchema.static("star", async function (ownerId: string, itemId: string | Types.ObjectId, note?: string) {
  const update = note === undefined ? {} : { $set: { note } };
  return this.findOneAndUpdate({ ownerId, itemId }, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
  }).orFail();
});

// Returns true if a star was removed, false if the item was not starred
StarSchema.static("unstar", async function (ownerId: string, itemId: string | Types.ObjectId) {
  const res = await this.deleteOne({ ownerId, itemId });
  return res.deletedCount > 0;
});

StarSchema.static("toggleStar", async function (ownerId: string, itemId: string | Types.ObjectId) {
  const removed = await this.deleteOne({ ownerId, itemId });
  if (removed.deletedCount > 0) return { starred: false };
  await this.create({ ownerId, itemId });
  return { starred: true };
});

StarSchema.static("isStarred", async function (ownerId: string, itemId: string | Types.ObjectId) {
  return (await this.exists({ ownerId, itemId })) !== null;
});

StarSchema.static("getStarredItemIds", async function (ownerId: string) {
  const stars = await this.find({ ownerId }).sort({ createdAt: -1 }).select("itemId").lean();
  return stars.map((s) => s.itemId.toString());
});

// Called when a candidate is deleted so no orphaned stars point at it
StarSchema.static("removeForItem", async function (ownerId: string, itemId: string | Types.ObjectId) {
  await this.deleteMany({ ownerId, itemId });
});

StarSchema.static("countForOwner", async function (ownerId: string) {
  return this.countDocuments({ ownerId });
});

// Re-use compiled model in Next.js hot-reloading dev environment to avoid OverwriteModelError
export const StarModel: StarModelType =
  (mongoose.models.Star as StarModelType) || mongoose.model<IStar, StarModelType>("Star", StarSchema);
