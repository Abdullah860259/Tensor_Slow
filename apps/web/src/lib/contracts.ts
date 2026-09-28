import { z } from "zod";

/**
 * FROZEN INTERFACE CONTRACTS
 *
 * This file is the single source of truth for cross-boundary schemas and types.
 * Per docs/AGENT_ORCHESTRATION.md §3.1:
 * - Written in Wave 0.
 * - FROZEN: No agent may edit this file or alter exported signatures.
 * - If a change is needed, report it as a REQUEST to the orchestrator.
 */

/**
 * Single source of truth for embedding dimensions.
 * Gemini text-embedding-004 produces 768-dimensional vectors.
 * The Atlas Vector Search index MUST exactly match this dimension.
 */
export const EMBEDDING_DIMENSIONS = 768;

/**
 * System prompt version tag for observability, logging, and eval assertions.
 */
export const SYSTEM_PROMPT_VERSION = "2026-09-28.v1";

/**
 * Zod schema for structured output extraction from content.
 */
export const ExtractResultSchema = z.object({
  summary: z.string().describe("A concise 1-2 sentence summary of the item content"),
  tags: z.array(z.string()).describe("3-5 descriptive, lower-case tags categorizing the content"),
  confidenceScore: z.number().min(0).max(1).optional().catch(1),
  actionItems: z.array(z.string()).optional().catch([]),
});

export type ExtractResult = z.infer<typeof ExtractResultSchema>;

/**
 * Full Item document schema representing user-owned artifacts in the placeholder domain.
 */
export const ItemSchema = z.object({
  _id: z.string().optional(),
  ownerId: z.string().min(1, "ownerId is required"),
  title: z.string().min(1, "title is required"),
  content: z.string().default(""),
  sourceUrl: z.string().url().optional(),
  mime: z.string().optional(),
  status: z.enum(["pending", "processed", "failed"]).default("pending"),
  aiSummary: z.string().optional(),
  aiTags: z.array(z.string()).default([]),
  embedding: z.array(z.number()).optional(),
  createdAt: z.date().default(() => new Date()),
});

export type Item = z.infer<typeof ItemSchema>;

/**
 * Schema for creating a new item via API or tool calling.
 */
export const ItemCreateInputSchema = z.object({
  title: z.string().min(1, "title is required"),
  content: z.string().default(""),
  sourceUrl: z.string().url().optional(),
  mime: z.string().optional(),
});

export type ItemCreateInput = z.infer<typeof ItemCreateInputSchema>;

/**
 * Lightweight Item summary schema used in list views and dashboards.
 */
export const ItemListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["pending", "processed", "failed"]),
  aiSummary: z.string().optional(),
  aiTags: z.array(z.string()),
  createdAt: z.union([z.string(), z.date()]),
});

export type ItemListItem = z.infer<typeof ItemListItemSchema>;

/**
 * Chat request body schema for streaming chat endpoint.
 */
export const ChatRequestSchema = z.object({
  messages: z.array(z.any()), // AI SDK UIMessage array
  threadId: z.string().optional(),
  itemId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * AI Run schema for auditing, token tracking, latency, and cost estimation.
 */
export const AiRunSchema = z.object({
  _id: z.string().optional(),
  ownerId: z.string(),
  feature: z.enum(["chat", "extract", "embed", "rag"]),
  model: z.string(),
  inputTokens: z.number().default(0),
  outputTokens: z.number().default(0),
  reasoningTokens: z.number().default(0),
  cacheReadTokens: z.number().default(0),
  latencyMs: z.number().default(0),
  costUsd: z.number().default(0),
  status: z.enum(["success", "error"]).default("success"),
  error: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type AiRun = z.infer<typeof AiRunSchema>;
