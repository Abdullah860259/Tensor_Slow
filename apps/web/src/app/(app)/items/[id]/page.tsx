import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  FileText,
  Flag,
  Gauge,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { connectMongoose } from "@/lib/db";
import { ItemModel } from "@/lib/models";
import { processItem } from "@/lib/items/process";
import { domain } from "@/lib/domain";
import { clampScore, getScoreStyle, pad2 } from "@/lib/candidate-ui";
import { Button } from "@/components/ui/button";
import { Chat } from "@/components/ai/chat";
import {
  Panel,
  RadarChart,
  ScoreRing,
  SegmentedBar,
  StatusReadout,
  type Accent,
  type RadarAxis,
} from "@/components/hud/hud";

type CandidateFields = {
  strengths: string[];
  weaknesses: string[];
  verdict?: string;
  yearsOfExperience?: number;
  /**
   * Optional. Rendered as a radar chart when the evaluation provides at least
   * three entries shaped like { name: string; score: number } (0-100).
   */
  competencies: RadarAxis[];
};

function getCandidateFields(value: unknown): CandidateFields {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { strengths: [], weaknesses: [], competencies: [] };
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
    competencies: Array.isArray(fields.competencies)
      ? fields.competencies
          .map((entry): RadarAxis | null => {
            if (!entry || typeof entry !== "object") return null;
            const e = entry as Record<string, unknown>;
            const label = typeof e.name === "string" ? e.name : e.label;
            const score = typeof e.score === "number" ? e.score : e.value;
            if (typeof label !== "string" || typeof score !== "number") {
              return null;
            }
            if (!Number.isFinite(score)) return null;
            return { label, value: clampScore(score) };
          })
          .filter((entry): entry is RadarAxis => entry !== null)
          .slice(0, 8)
      : [],
  };
}

/* -------------------------------------------------------------------------- */
/* Local blocks                                                               */
/* -------------------------------------------------------------------------- */

function InsightPanel({
  title,
  items,
  kind,
  className = "",
}: {
  title: string;
  items: string[];
  kind: "strength" | "weakness";
  className?: string;
}): React.JSX.Element {
  const positive = kind === "strength";
  const accent: Accent = positive ? "cyan" : "orange";
  const tone = positive ? "text-neon-cyan" : "text-neon-orange";
  const rail = positive ? "border-neon-cyan/30" : "border-neon-orange/30";
  const prefix = positive ? "S" : "F";

  return (
    <Panel
      accent={accent}
      title={title}
      icon={positive ? Check : Flag}
      className={className}
      aside={
        <span
          className={`font-mono text-xs font-semibold tabular-nums ${tone}`}
        >
          {pad2(items.length)}
        </span>
      }
    >
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={`${index}-${item}`}
              className={`flex items-start gap-3 border-l py-0.5 pl-3 ${rail}`}
            >
              <span
                className={`pt-[3px] font-mono text-[11px] font-semibold ${tone}`}
              >
                {prefix}
                {pad2(index + 1)}
              </span>
              <span className="text-sm leading-6 text-slate-200">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-slate-800 p-6 text-center font-mono text-xs text-slate-400">
          {positive
            ? "No strengths were extracted for this candidate yet."
            : "No weaknesses were extracted for this candidate yet."}
        </p>
      )}
    </Panel>
  );
}

/** Tag styled as a bracketed system readout. */
function Tag({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-sm border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-[11px] tracking-[0.12em] text-slate-300 uppercase ${className}`}
    >
      {children}
    </span>
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
  const strengthCount = item.fields.strengths.length;
  const flagCount = item.fields.weaknesses.length;
  const hasRadar = item.fields.competencies.length >= 3;

  const verdictText =
    item.fields.verdict ||
    (item.status === "pending"
      ? "This profile is waiting for an AI evaluation."
      : "No hiring recommendation is available for this profile yet.");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-14">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 py-1 font-mono text-xs tracking-[0.16em] text-slate-400 uppercase transition-colors hover:text-neon-cyan focus-visible:ring-1 focus-visible:ring-neon-cyan focus-visible:outline-none"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Candidate leaderboard
        </Link>
        <form action={reRunExtractionAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer gap-2 rounded-sm border-neon-cyan/40 bg-transparent px-3 font-mono text-xs tracking-[0.16em] text-neon-cyan uppercase hover:bg-neon-cyan/10 hover:text-neon-cyan"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Re-run evaluation
          </Button>
        </form>
      </div>

      {/* Title block */}
      <header className="space-y-4">
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-slate-400 uppercase">
          <span className="h-1.5 w-1.5 bg-neon-cyan" aria-hidden="true" />
          Candidate file
          <span className="text-slate-600" aria-hidden="true">
            /
          </span>
          <span className="text-slate-200">{item._id.slice(-8)}</span>
        </p>
        <h1 className="font-display text-4xl leading-[1] font-bold tracking-tighter text-white sm:text-6xl">
          {item.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Tag>
            <StatusReadout status={item.status} />
          </Tag>
          {item.category && <Tag>{item.category}</Tag>}
          {item.severity && (
            <Tag>
              <span
                className={`mr-2 h-1.5 w-1.5 rounded-full ${
                  item.severity === "low"
                    ? "bg-neon-cyan"
                    : item.severity === "medium"
                      ? "bg-neon-orange"
                      : "bg-rose-500"
                }`}
                aria-hidden="true"
              />
              {domain.labels.severityLabel}: {item.severity}
            </Tag>
          )}
        </div>
      </header>

      {/* HUD grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        {/* Verdict */}
        <Panel
          accent="plasma"
          title="AI verdict"
          icon={Sparkles}
          className="md:col-span-2 lg:col-span-6"
          bodyClassName="p-5"
        >
          <p className="font-display text-xl leading-8 text-white sm:text-2xl sm:leading-9">
            {verdictText}
          </p>
        </Panel>

        {/* ATS match */}
        <Panel
          accent={score === undefined ? "slate" : score >= 80 ? "cyan" : "orange"}
          title="ATS match"
          icon={Gauge}
          className="lg:col-span-3"
          bodyClassName="flex flex-col items-center gap-4 p-5"
        >
          <ScoreRing score={score} size={136} ticks />
          <SegmentedBar score={score} segments={20} className="w-full" />
          <p
            className={`font-mono text-[11px] tracking-[0.18em] uppercase ${scoreStyle.text}`}
          >
            {scoreStyle.label}
          </p>
        </Panel>

        {/* Experience */}
        <Panel
          accent="slate"
          title="Experience"
          icon={BriefcaseBusiness}
          className="lg:col-span-3"
          bodyClassName="flex flex-col justify-center p-5"
        >
          <p className="flex items-baseline gap-2 font-mono">
            <span className="text-7xl font-semibold tracking-tighter text-white tabular-nums">
              {years === undefined ? "--" : pad2(years)}
            </span>
            <span className="text-sm tracking-[0.18em] text-slate-400 uppercase">
              yrs
            </span>
          </p>
        </Panel>

        {/* Strengths / flags */}
        <InsightPanel
          title="Strengths"
          items={item.fields.strengths}
          kind="strength"
          className="lg:col-span-4"
        />
        <InsightPanel
          title="Weaknesses and flags"
          items={item.fields.weaknesses}
          kind="weakness"
          className="lg:col-span-4"
        />

        {/* Signal profile: radar when competencies exist, always the balance bar */}
        <Panel
          accent="cyan"
          title="Signal profile"
          icon={Activity}
          className="md:col-span-2 lg:col-span-4"
          bodyClassName="space-y-5 p-5"
        >
          {hasRadar && <RadarChart axes={item.fields.competencies} />}
          <div className="space-y-3">
            <div className="flex h-3 gap-[3px]" aria-hidden="true">
              {strengthCount + flagCount === 0 ? (
                <span className="flex-1 -skew-x-[18deg] bg-slate-800" />
              ) : (
                <>
                  {strengthCount > 0 && (
                    <span
                      className="-skew-x-[18deg] bg-neon-cyan shadow-[0_0_8px_rgb(34_229_255/0.6)]"
                      style={{ flexGrow: strengthCount, flexBasis: 0 }}
                    />
                  )}
                  {flagCount > 0 && (
                    <span
                      className="-skew-x-[18deg] bg-neon-orange shadow-[0_0_8px_rgb(255_122_26/0.6)]"
                      style={{ flexGrow: flagCount, flexBasis: 0 }}
                    />
                  )}
                </>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-4 font-mono">
              <div>
                <dt className="text-[11px] tracking-[0.16em] text-slate-400 uppercase">
                  Strengths
                </dt>
                <dd className="text-3xl font-semibold text-neon-cyan tabular-nums">
                  {pad2(strengthCount)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-[0.16em] text-slate-400 uppercase">
                  Flags
                </dt>
                <dd className="text-3xl font-semibold text-neon-orange tabular-nums">
                  {pad2(flagCount)}
                </dd>
              </div>
            </dl>
          </div>
        </Panel>

        {/* Overview */}
        {item.aiSummary && (
          <Panel
            accent="plasma"
            title="Candidate overview"
            icon={BadgeCheck}
            className="md:col-span-2 lg:col-span-5"
            bodyClassName="space-y-4 p-5"
          >
            <p className="text-sm leading-6 text-slate-200">{item.aiSummary}</p>
            {item.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.aiTags.map((tag: string) => (
                  <Tag key={tag} className="normal-case tracking-normal">
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Source profile */}
        <Panel
          accent="slate"
          title="Scraped LinkedIn profile"
          icon={FileText}
          className={`md:col-span-2 ${
            item.aiSummary ? "lg:col-span-7" : "lg:col-span-12"
          }`}
          aside={
            <span className="font-mono text-[11px] tracking-[0.14em] text-slate-400 uppercase">
              Source
            </span>
          }
          bodyClassName="p-5"
        >
          {item.content ? (
            <div className="max-h-[480px] overflow-y-auto rounded-sm border border-slate-800/90 bg-black p-4 font-mono text-[12.5px] leading-6 whitespace-pre-wrap text-slate-300">
              {item.content}
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 p-8 text-center">
              <AlertCircle
                className="mx-auto h-6 w-6 text-slate-500"
                aria-hidden="true"
              />
              <p className="mt-3 font-mono text-xs tracking-[0.16em] text-slate-100 uppercase">
                No scraped profile text
              </p>
              <p className="mt-1 text-sm text-slate-400">
                The original profile content was not saved with this candidate.
              </p>
            </div>
          )}
        </Panel>

        {/* Chat */}
        <Panel
          accent="plasma"
          title="Ask about this candidate"
          icon={ShieldCheck}
          className="md:col-span-2 lg:col-span-12"
          bodyClassName="p-5"
        >
          <div className="rounded-sm border border-slate-800/90 bg-black p-3">
            <Chat itemId={item._id} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
