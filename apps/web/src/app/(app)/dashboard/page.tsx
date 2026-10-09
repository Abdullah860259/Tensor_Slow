import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  Gauge,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { connectMongoose } from "@/lib/db";
import { ItemModel, JobCriteriaModel } from "@/lib/models";
import { domain } from "@/lib/domain";
import { candidateDisplayName, extractHeadline } from "@/lib/candidate-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportCandidateButton } from "./import-candidate-button";
import { JobCriteriaModal, type ActiveCriteria } from "./job-criteria-modal";
import { CandidateLeaderboard } from "./candidate-leaderboard";

const L = domain.labels;

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-well px-3 text-sm text-zinc-100 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none";

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
      ? fields.strengths.filter((entry): entry is string => typeof entry === "string")
      : [],
    weaknesses: Array.isArray(fields.weaknesses)
      ? fields.weaknesses.filter((entry): entry is string => typeof entry === "string")
      : [],
    verdict: typeof fields.verdict === "string" ? fields.verdict : undefined,
    yearsOfExperience:
      typeof fields.yearsOfExperience === "number" &&
      Number.isFinite(fields.yearsOfExperience)
        ? fields.yearsOfExperience
        : undefined,
  };
}

function timestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}): Promise<React.JSX.Element> {
  const { q = "", status = "" } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  await connectMongoose();
  const [all, activeDoc] = await Promise.all([
    ItemModel.find({ ownerId: session.user.id }).sort({ createdAt: -1 }).limit(500).lean(),
    JobCriteriaModel.findOne({ ownerId: session.user.id, isActive: true }).lean(),
  ]);

  // Serialize for the client modal (ObjectIds and Mongoose internals can't cross the boundary).
  const activeCriteria: ActiveCriteria | null = activeDoc
    ? {
        _id: String(activeDoc._id),
        roleTitle: activeDoc.roleTitle,
        rawRequirements: activeDoc.rawRequirements ?? "",
        expandedCriteria: activeDoc.expandedCriteria ?? "",
        rubric: activeDoc.rubric ? JSON.parse(JSON.stringify(activeDoc.rubric)) : undefined,
        isActive: true,
      }
    : null;
  const mustHaveCount = activeCriteria?.rubric?.mustHave?.length ?? 0;
  const niceToHaveCount = activeCriteria?.rubric?.niceToHave?.length ?? 0;
  const redFlagCount = activeCriteria?.rubric?.redFlags?.length ?? 0;

  const needle = q.trim().toLowerCase();
  const rows = all
    .filter((item) => {
      const fields = getCandidateFields(item.fields);
      return (
        (!status || item.status === status) &&
        (!needle ||
          [item.title, item.aiSummary ?? "", fields.verdict ?? "", ...(item.aiTags ?? [])]
            .join(" ")
            .toLowerCase()
            .includes(needle))
      );
    })
    .sort((a, b) => {
      const scoreA = typeof a.score === "number" ? a.score : -1;
      const scoreB = typeof b.score === "number" ? b.score : -1;
      return scoreB - scoreA || timestamp(b.createdAt) - timestamp(a.createdAt);
    });

  const analyzed = all.filter((item) => item.status === "processed").length;
  const topMatches = all.filter(
    (item) => typeof item.score === "number" && item.score >= 80,
  ).length;
  const scored = all.filter((item) => typeof item.score === "number");
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, item) => sum + (item.score ?? 0), 0) / scored.length)
    : null;
  const filtering = Boolean(q || status);

  const kpis = [
    { label: "In pipeline", value: all.length, icon: Users },
    { label: "AI evaluated", value: analyzed, icon: BadgeCheck },
    { label: "Top matches (80+)", value: topMatches, icon: Sparkles },
    { label: "Average match", value: avgScore === null ? "--" : `${avgScore}%`, icon: Gauge },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{L.product}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Talent pipeline
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{L.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JobCriteriaModal initialCriteria={activeCriteria} />
          <ImportCandidateButton />
        </div>
      </header>

      {/* Active job criteria */}
      <section
        aria-label="Active job criteria"
        className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        {activeCriteria ? (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Active role</p>
                <p className="truncate text-sm font-medium text-white">{activeCriteria.roleTitle}</p>
              </div>
            </div>
            <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs">
              <div className="flex items-baseline gap-1.5">
                <dd className="text-sm font-semibold text-emerald-400 tabular-nums">{mustHaveCount}</dd>
                <dt className="text-muted-foreground">must-have</dt>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dd className="text-sm font-semibold text-blue-400 tabular-nums">{niceToHaveCount}</dd>
                <dt className="text-muted-foreground">nice-to-have</dt>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dd className="text-sm font-semibold text-rose-400 tabular-nums">{redFlagCount}</dd>
                <dt className="text-muted-foreground">red flags</dt>
              </div>
            </dl>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-white">No active role</p>
              <p className="text-xs text-muted-foreground">
                Set job criteria so candidates are scored against your requirements.
              </p>
            </div>
          </div>
        )}
      </section>

      {all.length === 0 ? (
        <section className="mx-auto w-full max-w-xl rounded-md border border-dashed border-border bg-card px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-well text-muted-foreground">
            <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-white">No candidates yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Paste a profile, upload a resume or scrape a LinkedIn URL to get a match score, an
            experience estimate and a hiring recommendation.
          </p>
          <div className="mt-6 flex justify-center">
            <ImportCandidateButton />
          </div>
        </section>
      ) : (
        <>
          <section
            aria-label="Pipeline overview"
            className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4"
          >
            {kpis.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between gap-3 bg-card px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-white tabular-nums">
                    {value}
                  </p>
                </div>
                <Icon className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden="true" />
              </div>
            ))}
          </section>

          <section aria-labelledby="leaderboard-heading" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 id="leaderboard-heading" className="text-base font-semibold text-white">
                    Candidate leaderboard
                  </h2>
                  <span className="rounded border border-border bg-well px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 tabular-nums">
                    {rows.length} {rows.length === 1 ? "candidate" : "candidates"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ranked by match score, highest first
                </p>
              </div>

              <form method="get" className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <label htmlFor="q" className="sr-only">
                    Search candidates
                  </label>
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="q"
                    name="q"
                    defaultValue={q}
                    placeholder="Search name, summary or tag"
                    className="h-9 w-64 border-input bg-well pl-9 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="sr-only">
                    Status
                  </label>
                  <select id="status" name="status" defaultValue={status} className={SELECT_CLASS}>
                    <option value="">Any status</option>
                    <option value="processed">Evaluated</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <Button type="submit" variant="outline" size="sm" className="h-9 cursor-pointer">
                  Apply
                </Button>
                {filtering && (
                  <Link
                    href="/dashboard"
                    className="px-1 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-white"
                  >
                    Clear
                  </Link>
                )}
              </form>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
                <FileText className="mx-auto h-8 w-8 text-zinc-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-white">No candidates match these filters</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different search or clear the filters.
                </p>
              </div>
            ) : (
              <CandidateLeaderboard
                candidates={rows.map((item) => ({
                  id: String(item._id),
                  title: candidateDisplayName(item.title),
                  headline: extractHeadline(item.content),
                  score: typeof item.score === "number" ? item.score : undefined,
                  status: item.status,
                  category: item.category,
                  aiTags: item.aiTags,
                  yearsOfExperience: getCandidateFields(item.fields).yearsOfExperience,
                }))}
              />
            )}

            <p className="text-right font-mono text-xs text-muted-foreground tabular-nums">
              Showing {rows.length} of {all.length}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
