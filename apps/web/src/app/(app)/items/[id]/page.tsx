import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  FileText,
  Flag,
  Gauge,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { connectMongoose } from "@/lib/db";
import { ItemModel } from "@/lib/models";
import { processItem } from "@/lib/items/process";
import { domain } from "@/lib/domain";
import { clampScore, getScoreStyle, getStatusDot } from "@/lib/candidate-ui";
import { Button } from "@/components/ui/button";
import { Chat } from "@/components/ai/chat";

type CandidateFields = {
  strengths: string[];
  weaknesses: string[];
  verdict?: string;
  yearsOfExperience?: number;
};

function getCandidateFields(value: unknown): CandidateFields {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { strengths: [], weaknesses: [] };
  }

  const fields = value as Record<string, unknown>;
  return {
    strengths: Array.isArray(fields.strengths)
      ? fields.strengths.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
    weaknesses: Array.isArray(fields.weaknesses)
      ? fields.weaknesses.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
    verdict: typeof fields.verdict === "string" ? fields.verdict : undefined,
    yearsOfExperience:
      typeof fields.yearsOfExperience === "number" &&
      Number.isFinite(fields.yearsOfExperience)
        ? fields.yearsOfExperience
        : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Building blocks                                                            */
/* -------------------------------------------------------------------------- */

function BentoCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={`rounded-xl border border-zinc-800/80 bg-zinc-900 p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardLabel({
  icon: Icon,
  children,
  aside,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  aside?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-400">
        <Icon className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
        {children}
      </div>
      {aside}
    </div>
  );
}

function StatusPill({ status }: { status: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 capitalize">
      <span
        className={`h-1.5 w-1.5 rounded-full ${getStatusDot(status)}`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

function ScoreRing({ score }: { score: number | undefined }): React.JSX.Element {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const safe = clampScore(score);
  const style = getScoreStyle(score);

  return (
    <div
      className="relative h-24 w-24 shrink-0"
      role="img"
      aria-label={
        score === undefined
          ? "ATS score unavailable"
          : `ATS score ${score} out of 100`
      }
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="7"
          className="stroke-zinc-800"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className={style.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">
          {score === undefined ? "—" : score}
        </span>
      </div>
    </div>
  );
}

function InsightList({
  title,
  description,
  items,
  kind,
  className = "",
}: {
  title: string;
  description: string;
  items: string[];
  kind: "strength" | "weakness";
  className?: string;
}): React.JSX.Element {
  const positive = kind === "strength";
  const Icon = positive ? Check : Flag;
  const iconBox = positive
    ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
    : "bg-rose-500/10 text-rose-400 ring-rose-500/20";
  const itemIcon = positive ? "text-emerald-400" : "text-rose-400";

  return (
    <BentoCard className={className}>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${iconBox}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-zinc-50">{title}</h3>
          <p className="text-xs text-zinc-400">{description}</p>
        </div>
        <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300 tabular-nums">
          {items.length}
        </span>
      </div>

      {items.length ? (
        <ul className="mt-4 divide-y divide-zinc-800/80">
          {items.map((item, index) => (
            <li
              key={`${index}-${item}`}
              className="flex items-start gap-3 py-3 text-sm leading-6 text-zinc-200 first:pt-0 last:pb-0"
            >
              <Icon
                className={`mt-1.5 h-3.5 w-3.5 shrink-0 ${itemIcon}`}
                strokeWidth={2.5}
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-400">
          {positive
            ? "No strengths were extracted for this candidate yet."
            : "No weaknesses were extracted for this candidate yet."}
        </div>
      )}
    </BentoCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  await connectMongoose();
  const rawItem = await ItemModel.findOne({
    _id: id,
    ownerId: session.user.id,
  }).lean();
  if (!rawItem) notFound();

  const item = {
    _id: rawItem._id.toString(),
    title: rawItem.title,
    content: rawItem.content || "",
    status: rawItem.status || "pending",
    aiSummary: rawItem.aiSummary,
    aiTags: rawItem.aiTags || [],
    category: rawItem.category,
    severity: rawItem.severity,
    score: rawItem.score,
    fields: getCandidateFields(rawItem.fields),
    createdAt: rawItem.createdAt ? new Date(rawItem.createdAt) : new Date(),
  };

  async function reRunExtractionAction() {
    "use server";
    const currentSession = await auth.api.getSession({
      headers: await headers(),
    });
    if (!currentSession?.user) redirect("/");
    await processItem(id, currentSession.user.id);
    revalidatePath(`/items/${id}`);
    revalidatePath("/dashboard");
  }

  const score = typeof item.score === "number" ? item.score : undefined;
  const scoreStyle = getScoreStyle(score);
  const years = item.fields.yearsOfExperience;

  const verdictText =
    item.fields.verdict ||
    (item.status === "pending"
      ? "This profile is waiting for an AI evaluation."
      : "No hiring recommendation is available for this profile yet.");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12 text-zinc-100">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-md py-1 text-sm text-zinc-400 transition-colors hover:text-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Candidate leaderboard
        </Link>
        <form action={reRunExtractionAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="cursor-pointer gap-2 rounded-lg border-zinc-800 bg-zinc-900 text-zinc-200 shadow-sm hover:bg-zinc-800 hover:text-zinc-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Re-run evaluation
          </Button>
        </form>
      </div>

      {/* Title + meta */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={item.status} />
          {item.category && (
            <span className="inline-flex items-center rounded-full border border-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
              {item.category}
            </span>
          )}
          {item.severity && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  item.severity === "low"
                    ? "bg-emerald-400"
                    : item.severity === "medium"
                      ? "bg-amber-400"
                      : "bg-rose-400"
                }`}
                aria-hidden="true"
              />
              {domain.labels.severityLabel}:{" "}
              <span className="capitalize">{item.severity}</span>
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          {item.title}
        </h1>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        {/* Verdict */}
        <BentoCard className="flex flex-col gap-4 md:col-span-2 lg:col-span-6">
          <CardLabel icon={Sparkles}>AI verdict</CardLabel>
          <p className="text-lg leading-7 text-zinc-50">{verdictText}</p>
        </BentoCard>

        {/* ATS score */}
        <BentoCard className="flex flex-col gap-4 lg:col-span-3">
          <CardLabel icon={Gauge}>ATS score</CardLabel>
          <div className="flex items-center gap-4">
            <ScoreRing score={score} />
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium text-zinc-50">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${scoreStyle.dot}`}
                  aria-hidden="true"
                />
                {scoreStyle.label}
              </p>
              <p className="text-xs text-zinc-400">
                {score === undefined ? "No score yet" : "out of 100"}
              </p>
            </div>
          </div>
        </BentoCard>

        {/* Experience */}
        <BentoCard className="flex flex-col justify-between gap-4 lg:col-span-3">
          <CardLabel icon={BriefcaseBusiness}>Experience</CardLabel>
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight text-zinc-50 tabular-nums">
              {years === undefined ? "—" : years}
            </span>
            <span className="text-sm text-zinc-400">
              {years === 1 ? "year" : "years"}
            </span>
          </p>
        </BentoCard>

        {/* Strengths / Weaknesses */}
        <InsightList
          title="Strengths"
          description="Reasons to move forward"
          items={item.fields.strengths}
          kind="strength"
          className="lg:col-span-6"
        />
        <InsightList
          title="Weaknesses and flags"
          description="Points to discuss or validate"
          items={item.fields.weaknesses}
          kind="weakness"
          className="lg:col-span-6"
        />

        {/* Overview */}
        {item.aiSummary && (
          <BentoCard className="flex flex-col gap-4 md:col-span-2 lg:col-span-5">
            <CardLabel icon={BadgeCheck}>Candidate overview</CardLabel>
            <p className="text-sm leading-6 text-zinc-200">{item.aiSummary}</p>
            {item.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.aiTags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-md border border-zinc-800 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </BentoCard>
        )}

        {/* Scraped profile */}
        <BentoCard
          className={`flex flex-col gap-4 md:col-span-2 ${
            item.aiSummary ? "lg:col-span-7" : "lg:col-span-12"
          }`}
        >
          <CardLabel
            icon={FileText}
            aside={
              <span className="text-xs text-zinc-400">
                Source used for evaluation
              </span>
            }
          >
            Scraped LinkedIn profile
          </CardLabel>
          {item.content ? (
            <div className="max-h-[480px] overflow-y-auto rounded-lg border border-zinc-800/80 bg-zinc-950 p-4 text-[13px] leading-6 whitespace-pre-wrap text-zinc-300">
              {item.content}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center">
              <AlertCircle
                className="mx-auto h-6 w-6 text-zinc-500"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-zinc-100">
                No scraped profile text
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                The original profile content was not saved with this candidate.
              </p>
            </div>
          )}
        </BentoCard>

        {/* Chat */}
        <BentoCard className="flex flex-col gap-4 md:col-span-2 lg:col-span-12">
          <CardLabel icon={Sparkles}>Ask about this candidate</CardLabel>
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950 p-3">
            <Chat itemId={item._id} />
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
