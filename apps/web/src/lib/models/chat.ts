// Manifest item 24: Chat persistence models
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IChatThreadDocument extends Document {
  ownerId: string;
  title: string;
  itemId?: string;
  createdAt: Date;
}

export interface IChatMessageDocument extends Document {
  threadId: string;
  role: "user" | "assistant" | "system";
  parts: unknown[];
  usage?: Record<string, unknown>;
  createdAt: Date;
}

const ChatThreadSchema = new Schema<IChatThreadDocument>(
  {
    // Scopes chat thread access to authenticated session owner
    ownerId: { type: String, required: true, index: true },
    title: { type: String, default: "New Conversation" },
    // Optional linkage to an item for contextual RAG conversations
    itemId: { type: String, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index to list user threads ordered by most recent first
ChatThreadSchema.index({ ownerId: 1, createdAt: -1 });

// Compound index to quickly find user threads scoped to a specific item
ChatThreadSchema.index({ ownerId: 1, itemId: 1 });

const ChatMessageSchema = new Schema<IChatMessageDocument>(
  {
    threadId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ["user", "assistant", "system"] },
    // AI SDK UIMessage parts are an evolving discriminated union (text, tool-invocation, reasoning, reasoning-file);
    // Schema.Types.Mixed prevents rigid validation failures as SDK versions evolve.
    parts: { type: Schema.Types.Mixed, required: true },
    usage: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Compound index to retrieve conversation history in chronological sequence for a thread
ChatMessageSchema.index({ threadId: 1, createdAt: 1 });

// Re-use compiled models across Next.js server actions and route invocations in dev mode
export const ChatThreadModel: Model<IChatThreadDocument> =
  (mongoose.models.ChatThread as Model<IChatThreadDocument>) || mongoose.model<IChatThreadDocument>("ChatThread", ChatThreadSchema);

export const ChatMessageModel: Model<IChatMessageDocument> =
  (mongoose.models.ChatMessage as Model<IChatMessageDocument>) || mongoose.model<IChatMessageDocument>("ChatMessage", ChatMessageSchema);

