"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Send,
  Sparkles,
  User,
  RotateCcw,
  AlertCircle,
  Wrench,
  ChevronDown,
  ChevronUp,
  Loader2,
  Square,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CitedText } from "@/components/ai/cited-text";
import { domain } from "@/lib/domain";

export interface ChatProps {
  threadId?: string;
  itemId?: string;
  initialMessages?: unknown[];
}

function ToolCard({
  toolName,
  state,
  input,
  output,
  errorText,
}: {
  toolName: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = state === "output-available";
  const isError = state === "output-error" || Boolean(errorText);

  return (
    <div className="my-2 rounded-lg border border-border bg-card p-3 text-xs shadow-xs">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">Tool: {toolName}</span>
          {isComplete && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            >
              Completed
            </Badge>
          )}
          {isError && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
              Failed
            </Badge>
          )}
          {!isComplete && !isError && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 animate-pulse">
              Running...
            </Badge>
          )}
        </div>
        <button type="button" className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-2.5 space-y-2 border-t border-border pt-2">
          {input !== undefined && (
            <div>
              <div className="font-medium text-muted-foreground mb-0.5">Input:</div>
              <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-[11px] text-foreground">
                {typeof input === "string" ? input : JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output !== undefined && (
            <div>
              <div className="font-medium text-muted-foreground mb-0.5">Result:</div>
              <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-[11px] text-foreground">
                {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
          {errorText && (
            <div>
              <div className="font-medium text-destructive mb-0.5">Error:</div>
              <p className="rounded bg-destructive/10 p-2 text-[11px] text-destructive font-mono">
                {errorText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderMessagePart(part: UIMessage["parts"][number], index: number) {
  switch (part.type) {
    case "text":
      return (
        <p key={index} className="whitespace-pre-wrap leading-relaxed">
          <CitedText text={part.text} />
        </p>
      );
    case "reasoning":
      return (
        <div
          key={index}
          className="my-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs font-mono text-muted-foreground"
        >
          <div className="font-semibold text-amber-600 dark:text-amber-400 not-italic mb-1">
            Reasoning Process
          </div>
          <div className="whitespace-pre-wrap">{part.text}</div>
        </div>
      );
    case "source-url":
      return (
        <div key={index} className="my-1 text-xs">
          <a
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Source: {part.title || part.url}
          </a>
        </div>
      );
    case "source-document":
      return (
        <div
          key={index}
          className="my-1 rounded border border-border bg-muted/30 p-2 text-xs text-muted-foreground"
        >
          Document: <span className="font-medium text-foreground">{part.title}</span> ({part.mediaType})
        </div>
      );
    case "file":
      return (
        <div key={index} className="my-1 text-xs text-muted-foreground">
          File: <span className="font-medium text-foreground">{part.filename || part.mediaType}</span>
        </div>
      );
    case "reasoning-file":
      return (
        <div key={index} className="my-1 text-xs text-muted-foreground font-mono">
          Reasoning File: {part.mediaType} ({part.url})
        </div>
      );
    case "step-start":
      return null;
    case "dynamic-tool":
      return (
        <ToolCard
          key={index}
          toolName={part.toolName}
          state={part.state}
          input={part.input}
          output={"output" in part ? part.output : undefined}
          errorText={"errorText" in part ? part.errorText : undefined}
        />
      );
    default: {
      const rawPart = part as { type: string; [key: string]: unknown };
      if (typeof rawPart.type === "string" && rawPart.type.startsWith("tool-")) {
        const toolName = rawPart.type.replace(/^tool-/, "");
        return (
          <ToolCard
            key={index}
            toolName={toolName}
            state={typeof rawPart.state === "string" ? rawPart.state : undefined}
            input={rawPart.input}
            output={rawPart.output}
            errorText={typeof rawPart.errorText === "string" ? rawPart.errorText : undefined}
          />
        );
      }
      if (typeof rawPart.type === "string" && rawPart.type.startsWith("data-")) {
        return null;
      }
      // Safe default fallback for any unhandled part type (e.g. AI SDK future additions)
      return null;
    }
  }
}

export function Chat({
  threadId,
  itemId,
  initialMessages,
}: ChatProps): React.JSX.Element {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          ...(threadId ? { threadId } : {}),
          ...(itemId ? { itemId } : {}),
        },
      }),
    [threadId, itemId]
  );

  const { messages, status, error, sendMessage, regenerate, stop } = useChat({
    transport,
    messages: initialMessages as UIMessage[] | undefined,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    await sendMessage({ text: trimmed });
  };

  const handleQuickPrompt = (promptText: string) => {
    setInput(promptText);
  };

  return (
    <div className="flex h-[600px] flex-col rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/80 px-5 py-3.5 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.12)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-sm font-semibold tracking-tight text-white">
                Dossier Intelligence Copilot
              </h3>
              {itemId && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  </span>
                  <span>Grounded in Resume</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">
              Interactive RAG verification · Gemini intelligence
            </p>
          </div>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              Synthesizing...
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={stop}
              className="h-7 px-2.5 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white cursor-pointer"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-well text-emerald-400 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="font-serif text-lg font-normal tracking-tight text-white mb-1.5">
              Inquire into Candidate Provenance
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
              Interrogate specific career claims, cross-reference experience against requirements, or generate tailored interview probes.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {domain.quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickPrompt(prompt)}
                  className="rounded-full border border-border bg-well/80 px-3.5 py-1.5 text-xs text-zinc-300 hover:border-emerald-500/40 hover:bg-zinc-800 hover:text-white transition-all cursor-pointer select-none"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-950/50 text-emerald-400 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                    isUser
                      ? "rounded-tr-xs bg-zinc-800 border border-zinc-700 text-zinc-100"
                      : "rounded-tl-xs border border-border bg-well text-zinc-200"
                  }`}
                >
                  <div className="space-y-1.5 leading-relaxed">
                    {message.parts.map((part, index) => renderMessagePart(part, index))}
                  </div>
                </div>
                {isUser && (
                  <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Streaming status indicator inside list */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 pl-10 font-mono">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Formulating grounded response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error state with retry */}
      {(error || status === "error") && (
        <div className="border-t border-destructive/20 bg-destructive/5 px-4 py-2 flex items-center justify-between gap-2 text-xs text-destructive">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {error?.message || "An error occurred while streaming response."}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => regenerate()}
            className="h-7 shrink-0 gap-1 text-xs border-destructive/30 hover:bg-destructive/10 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-border bg-well/40 p-3.5 flex gap-2.5 items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isStreaming ? "Synthesizing answer..." : "Ask copilot about candidate's skills, tenure, or gaps..."}
          disabled={isStreaming}
          className="flex-1 text-sm bg-well border-input text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-emerald-500/40"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || isStreaming}
          className="h-9 px-4 cursor-pointer gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium transition-colors disabled:opacity-40 disabled:hover:bg-emerald-500"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
          ) : (
            <Send className="h-4 w-4 text-zinc-950" />
          )}
          <span className="text-xs font-semibold">Send</span>
        </Button>
      </form>
    </div>
  );
}

