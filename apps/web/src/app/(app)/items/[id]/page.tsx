import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  FileText,
  Gauge,
  ListChecks,
  MessageSquare,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { connectMongoose } from "@/lib/db";
import { ItemModel, JobCriteriaModel } from "@/lib/models";
import { processItem } from "@/lib/items/process";
import {
  candidateDisplayName,
  clampScore,
  extractHeadline,
  formatYears,
  getScoreStyle,
  pad2,
} from "@/lib/candidate-ui";
import { Button } from "@/components/ui/button";
import { Chat } from "@/components/ai/chat";
import {
  FitBadge,
  Panel,
  ScoreBar,
  ScoreRing,
  StatusBadge,
  Tag,
} from "@/components/ui/foundry";

type Competency = { label: string; value: number };

type CandidateFields = {
  strengths: string[];
  weaknesses: string[];
  verdict?: string;
  yearsOfExperience?: number;
  competencies: Competency[];
};

function getCandidateFields(value: unknown): CandidateFields {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { strengths: [], weaknesses: [], competencies: [] };
  }

  const fields = value as Record<string, unknown>;
  return {
    strengths: Array.isArray(fields.strengths)
      ? fields.strengths.filter((entry): entry is string => typeof entry === "string")
      : [],
    weaknesses: Array.isArray(fields.weaknesses)
      ? fields.weaknesses.filter((entry): entry is string => typeof entry === "string")
      : [],
    verdict: typeof fields.verdict === "string" ? fields.verdict : undefined,
    yearsOfExperience:
      typeof fields.yearsOfExperience === "number" && Number.isFinite(fields.yearsOfExperience)
        ? fields.yearsOfExperience
        : undefined,
    competencies: Array.isArray(fields.competencies)
      ? fields.competencies
          .map((entry): Competency | null => {
            if (!entry || typeof entry !== "object") return null;
            const e = entry as Record<string, unknown>;
            const label = typeof e.name === "string" ? e.name : e.label;
            const score = typeof e.score === "number" ? e.score : e.value;
            if (typeof label !== "string" || typeof score !== "number") return null;
            if (!Number.isFinite(score)) return null;
            return { label, value: clampScore(score) };
          })
          .filter((entry): entry is Competency => entry !== null)
          .slice(0, 8)
      : [],
  };
}

/* -------------------------------------------------------------------------- */
/* Local blocks                                                               */
/* -------------------------------------------------------------------------- */

function FindingsPanel({
  title,
  items,
  kind,
  emptyText,
  className = "",
}: {
  title: string;
  items: string[];
  kind: "strength" | "risk";
  emptyText: string;
  className?: string;
}): React.JSX.Element {
  const positive = kind === "strength";
  const Icon = positive ? Check : AlertTriangle;
  const iconTone = positive ? "text-emerald-500" : "text-rose-500";

  return (
    <Panel
      title={title}
      icon={positive ? BadgeCheck : AlertTriangle}
      className={className}
      aside={pad2(items.length)}
    >
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className="flex items-start gap-3 text-sm leading-6 text-zinc-200">
              <Icon className={`mt-1 h-4 w-4 shrink-0 ${iconTone}`} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      )}
    </Panel>
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
  const [rawItem, criteriaDoc] = await Promise.all([
    ItemModel.findOne({ _id: id, ownerId: session.user.id }).lean(),
    JobCriteriaModel.findOne({ ownerId: session.user.id, isActive: true }).lean(),
  ]);
  if (!rawItem) notFound();

  const updatedAt = (rawItem as { updatedAt?: Date | string }).updatedAt;
  const item = {
    _id: rawItem._id.toString(),
    title: rawItem.title,
    content: rawItem.content || "",
    status: rawItem.status || "pending",
    aiSummary: rawItem.aiSummary,
    aiTags: rawItem.aiTags || [],
    category: rawItem.category,
    score: rawItem.score,
    fields: getCandidateFields(rawItem.fields),
    updatedAt: new Date(updatedAt ?? rawItem.createdAt ?? Date.now()),
  };

  const rubric = (criteriaDoc?.rubric ?? {}) as { interviewQuestions?: unknown };
  const screeningQuestions = Array.isArray(rubric.interviewQuestions)
    ? rubric.interviewQuestions.filter((q): q is string => typeof q === "string")
    : [];

  async function reRunExtractionAction() {
    "use server";
    const currentSession = await auth.api.getSession({ headers: await headers() });
    if (!currentSession?.user) redirect("/");
    await processItem(id, currentSession.user.id);
    revalidatePath(`/items/${id}`);
    revalidatePath("/dashboard");
  }

  const score = typeof item.score === "number" ? item.score : undefined;
  const scoreStyle = getScoreStyle(score);
  const years = item.fields.yearsOfExperience;
  const name = candidateDisplayName(item.title);
  const headline = extractHeadline(item.content);
  const competencies = item.fields.competencies;
  const hasOverview = Boolean(item.aiSummary);
  const hasCompetencies = competencies.length > 0;

  const verdictText =
    item.fields.verdict ||
    (item.status === "pending"
      ? "This profile is waiting for an AI evaluation."
      : "No hiring recommendation is available for this profile yet.");

  const stamp = item.updatedAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-14">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 py-1 text-sm text-muted-foreground transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Candidate leaderboard
        </Link>
        <form action={reRunExtractionAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer gap-2 border-input bg-transparent text-zinc-200 hover:bg-secondary hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Re-evaluate
          </Button>
        </form>
      </div>

      {/* Dossier header */}
      <header className="space-y-3">
        <p className="font-mono text-xs text-muted-foreground">
          Candidate file <span className="text-zinc-600">/</span>{" "}
          <span className="text-zinc-300">{item._id.slice(-8)}</span>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{name}</h1>
        {headline && <p className="max-w-3xl text-base text-zinc-300">{headline}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatusBadge status={item.status} />
          <FitBadge score={score} />
          {years !== undefined && (
            <span className="font-mono text-xs text-zinc-300 tabular-nums">
              {formatYears(years)} yrs experience
            </span>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {item.status === "processed" ? "Evaluated" : "Updated"} {stamp}
          </span>
          {item.category && <Tag>{item.category}</Tag>}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Hiring recommendation */}
        <Panel
          title="Hiring recommendation"
          icon={Sparkles}
          className="lg:col-span-8"
          bodyClassName="p-5"
        >
          <div className="flex gap-4">
            <span className={`w-0.5 shrink-0 self-stretch ${scoreStyle.bar}`} aria-hidden="true" />
            <p className="text-lg leading-8 font-medium text-white">{verdictText}</p>
          </div>
        </Panel>

        {/* Match gauge */}
        <Panel
          title="Match score"
          icon={Gauge}
          aside="0 to 100"
          className="lg:col-span-4"
          bodyClassName="flex flex-col items-center gap-4 p-5"
        >
          <ScoreRing score={score} size={116} />
          <ScoreBar score={score} segments={20} className="w-full" />
          <p className={`text-sm font-medium ${scoreStyle.text}`}>{scoreStyle.label}</p>
        </Panel>

        {/* Strengths and risks */}
        <FindingsPanel
          title="Verified strengths"
          items={item.fields.strengths}
          kind="strength"
          emptyText="No strengths extracted yet. Re-evaluate to try again."
          className="lg:col-span-6"
        />
        <FindingsPanel
          title="Risk flags and missing requirements"
          items={item.fields.weaknesses}
          kind="risk"
          emptyText="No risks or gaps extracted yet. Re-evaluate to try again."
          className="lg:col-span-6"
        />

        {/* Overview */}
        {hasOverview && (
          <Panel
            title="Candidate overview"
            icon={BadgeCheck}
            className={hasCompetencies ? "lg:col-span-7" : "lg:col-span-12"}
            bodyClassName="space-y-4 p-5"
          >
            <p className="text-sm leading-6 text-zinc-200">{item.aiSummary}</p>
            {item.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.aiTags.map((tag: string) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Competencies */}
        {hasCompetencies && (
          <Panel
            title="Competencies"
            icon={Activity}
            className={hasOverview ? "lg:col-span-5" : "lg:col-span-12"}
            bodyClassName="p-5"
          >
            <ul className="space-y-3">
              {competencies.map((c) => {
                const style = getScoreStyle(c.value);
                return (
                  <li key={c.label}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate text-zinc-200">{c.label}</span>
                      <span className={`font-mono text-xs tabular-nums ${style.text}`}>
                        {Math.round(c.value)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800" aria-hidden="true">
                      <div className={`h-full ${style.bar}`} style={{ width: `${c.value}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}

        {/* Screening questions */}
        <Panel
          title="Tailored screening questions"
          icon={ListChecks}
          aside={criteriaDoc?.roleTitle ? `For ${criteriaDoc.roleTitle}` : undefined}
          className="lg:col-span-12"
          bodyClassName="p-5"
        >
          {screeningQuestions.length > 0 ? (
            <ol className="space-y-3">
              {screeningQuestions.map((question, index) => (
                <li key={`${index}-${question}`} className="flex items-start gap-3 text-sm leading-6 text-zinc-200">
                  <span className="pt-px font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                    {pad2(index + 1)}
                  </span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No screening questions yet. Set job criteria from the dashboard to generate questions for
              this role.
            </p>
          )}
        </Panel>

        {/* Source profile */}
        <details className="group overflow-hidden rounded-md border border-border bg-card lg:col-span-12">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 select-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-[13px] font-medium text-zinc-100">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Source profile
            </span>
            <span className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {item.content.length.toLocaleString("en-US")} characters
              </span>
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </span>
          </summary>
          <div className="border-t border-border p-4">
            {item.content ? (
              <pre className="max-h-[480px] overflow-auto rounded border border-border bg-well p-4 font-mono text-xs leading-6 whitespace-pre-wrap text-zinc-300">
                {item.content}
              </pre>
            ) : (
              <p className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                The original profile text was not saved with this candidate.
              </p>
            )}
          </div>
        </details>

        {/* Recruiter chat */}
        <Panel
          title="Ask about this candidate"
          icon={MessageSquare}
          className="lg:col-span-12"
          bodyClassName="p-4"
        >
          <div className="rounded border border-border bg-well p-3">
            <Chat itemId={item._id} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
