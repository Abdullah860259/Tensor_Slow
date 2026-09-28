// STUB for Agent A (manifest item 24)
// Chat persistence models
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IChatThreadDocument extends Document {
  ownerId: string;
  title: string;
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
    ownerId: { type: String, required: true, index: true },
    title: { type: String, default: "New Conversation" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ChatMessageSchema = new Schema<IChatMessageDocument>(
  {
    threadId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ["user", "assistant", "system"] },
    // AI SDK UIMessage parts are an evolving discriminated union; Schema.Types.Mixed avoids over-constraining
    parts: { type: Schema.Types.Mixed, required: true },
    usage: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const ChatThreadModel: Model<IChatThreadDocument> =
  (mongoose.models.ChatThread as Model<IChatThreadDocument>) || mongoose.model<IChatThreadDocument>("ChatThread", ChatThreadSchema);

export const ChatMessageModel: Model<IChatMessageDocument> =
  (mongoose.models.ChatMessage as Model<IChatMessageDocument>) || mongoose.model<IChatMessageDocument>("ChatMessage", ChatMessageSchema);
