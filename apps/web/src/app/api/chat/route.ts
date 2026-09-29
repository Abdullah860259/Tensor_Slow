// Manifest item 36: Streaming chat route handler
import { headers } from "next/headers";
import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  isStepCount,
} from "ai";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { chatModel } from "@/lib/ai/models";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts/system";
import { tools } from "@/lib/ai/tools";
import { ChatRequestSchema } from "@/lib/contracts";
import { connectMongoose } from "@/lib/db";
import { ChatThreadModel, ChatMessageModel, AiRunModel } from "@/lib/models";
import { logger } from "@/lib/logger";

export async function POST(req: Request): Promise<Response> {
  const reqHeaders = await headers();

  // Derive ownerId from server session; attempt anonymous fallback or reject unauthorized
  let session = null;
  try {
    session = await auth.api.getSession({ headers: reqHeaders });
  } catch (sessionErr) {
    logger.warn("[chat] Failed to retrieve auth session", { error: String(sessionErr) });
  }

  let ownerId = session?.user?.id;

  if (!ownerId) {
    try {
      const anon = await auth.api.signInAnonymous({ headers: reqHeaders });
      ownerId = anon?.user?.id;
    } catch (anonErr) {
      logger.warn("[chat] Anonymous sign-in attempt failed", { error: String(anonErr) });
    }
  }

  if (!ownerId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Enforce rate limiting per session owner
  const rateLimitResult = await checkRateLimit(ownerId);
  if (!rateLimitResult.success) {
    const retryAfter = rateLimitResult.reset
      ? Math.max(1, Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
      : 60;
    return new Response(JSON.stringify({ error: "Too Many Requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
      },
    });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request payload", details: parsed.error.format() }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { messages, threadId, itemId } = parsed.data;

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Messages array cannot be empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();

  // AI SDK v7 streaming text loop with tool calling and completion persistence
  const result = streamText({
    model: chatModel,
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(5),
    onFinish: async ({ text, usage, steps }) => {
      const latencyMs = Date.now() - startTime;
      try {
        await connectMongoose();

        // Persist or resolve thread scoped to session ownerId
        let activeThreadId = threadId;
        if (activeThreadId && mongoose.Types.ObjectId.isValid(activeThreadId)) {
          const existingThread = await ChatThreadModel.findOne({
            _id: activeThreadId,
            ownerId,
          });
          if (!existingThread) {
            const newThread = await ChatThreadModel.create({
              _id: activeThreadId,
              ownerId,
              itemId: itemId ?? undefined,
              title: "New Conversation",
            });
            activeThreadId = newThread._id.toString();
          }
        } else {
          // Derive conversation title from first user message
          const firstUserMsg = messages.find(
            (m: { role?: string; content?: unknown; parts?: unknown[] }) => m.role === "user"
          );
          let threadTitle = "New Conversation";
          if (firstUserMsg) {
            if (typeof firstUserMsg.content === "string" && firstUserMsg.content.trim()) {
              threadTitle = firstUserMsg.content.trim().slice(0, 50);
            } else if (Array.isArray(firstUserMsg.parts)) {
              const textPart = firstUserMsg.parts.find(
                (p: unknown) =>
                  typeof p === "object" && p !== null && "type" in p && p.type === "text" && "text" in p
              ) as { text?: string } | undefined;
              if (textPart && typeof textPart.text === "string" && textPart.text.trim()) {
                threadTitle = textPart.text.trim().slice(0, 50);
              }
            }
          }

          const newThread = await ChatThreadModel.create({
            ownerId,
            itemId: itemId ?? undefined,
            title: threadTitle,
          });
          activeThreadId = newThread._id.toString();
        }

        // Persist latest user message into the thread
        const lastUserMsg = [...messages].reverse().find(
          (m: { role?: string }) => m.role === "user"
        );
        if (lastUserMsg && activeThreadId) {
          const userParts = lastUserMsg.parts || [
            {
              type: "text",
              text: typeof lastUserMsg.content === "string" ? lastUserMsg.content : "",
            },
          ];
          await ChatMessageModel.create({
            threadId: activeThreadId,
            role: "user",
            parts: userParts,
          });
        }

        // Persist generated assistant response message
        if (activeThreadId) {
          await ChatMessageModel.create({
            threadId: activeThreadId,
            role: "assistant",
            parts: [{ type: "text", text }],
            usage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
            },
          });
        }

        // Log aiRuns record with AI SDK v7 token tracking details
        const cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
        const reasoningTokens = usage.outputTokenDetails?.reasoningTokens ?? 0;
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        const modelId =
          typeof chatModel === "object" && chatModel !== null && "modelId" in chatModel
            ? String(chatModel.modelId)
            : "gemini-2.5-flash";

        await AiRunModel.create({
          ownerId,
          feature: "chat",
          model: modelId,
          inputTokens,
          outputTokens,
          reasoningTokens,
          cacheReadTokens,
          latencyMs,
          costUsd: 0,
          status: "success",
        });
      } catch (finishErr) {
        logger.error("[chat] Failed to persist thread or log aiRun on finish", finishErr);
      }
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
