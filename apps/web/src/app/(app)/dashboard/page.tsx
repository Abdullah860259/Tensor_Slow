import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, FileText, Search } from "lucide-react";
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
  "h-9 rounded-md border border-input bg-well px-3 text-sm text-zinc-100 transition-colors hover:border-zinc-600 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none";

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

/** Stagger offsets for the calm entrance (classes defined in the shell layout). */
function delay(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` };
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
  const criteriaTotal = mustHaveCount + niceToHaveCount + redFlagCount;

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

  const topMatches = all.filter(
    (item) => typeof item.score === "number" && item.score >= 80,
  ).length;
  const scored = all.filter((item) => typeof item.score === "number");
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, item) => sum + (item.score ?? 0), 0) / scored.length)
    : null;
  const filtering = Boolean(q || status);

  const kpis: { label: string; value: string | number; hint: string }[] = [
    {
      label: "Total candidates",
      value: all.length,
      hint: `${scored.length} scored`,
    },
    {
      label: "Top matches (80+)",
      value: topMatches,
      hint: all.length ? `${Math.round((topMatches / all.length) * 100)}% of pipeline` : "No candidates",
    },
    {
      label: "Average match score",
      value: avgScore === null ? "--" : `${avgScore}%`,
      hint: scored.length ? `Across ${scored.length} scored` : "Nothing scored yet",
    },
    {
      label: "Active criteria",
      value: activeCriteria ? criteriaTotal : "--",
      hint: activeCriteria ? "Rubric items in force" : "No role set",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-10">
      {/* Hero and primary actions */}
      <header className="tr-rise flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-zinc-500">{L.product}</p>
          <h1 className="mt-3 font-serif text-3xl font-normal tracking-tight text-balance text-white sm:text-4xl">
            Talent pipeline
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-pretty text-zinc-400">
            {L.tagline}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JobCriteriaModal initialCriteria={activeCriteria} />
          <ImportCandidateButton />
        </div>
      </header>

      {/* Active role strip */}
      <section
        aria-label="Active job criteria"
        style={delay(80)}
        className="tr-rise flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
      >
        {activeCriteria ? (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Active role</p>
                <p className="truncate text-sm font-medium text-white">{activeCriteria.roleTitle}</p>
              </div>
            </div>
            <dl className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-2.5 py-1">
                <dd className="font-mono font-semibold text-emerald-300 tabular-nums">{mustHaveCount}</dd>
                <dt className="text-emerald-300/80">must-have</dt>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-800/60 bg-amber-950/60 px-2.5 py-1">
                <dd className="font-mono font-semibold text-amber-300 tabular-nums">{niceToHaveCount}</dd>
                <dt className="text-amber-300/80">nice-to-have</dt>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-800/60 bg-rose-950/60 px-2.5 py-1">
                <dd className="font-mono font-semibold text-rose-300 tabular-nums">{redFlagCount}</dd>
                <dt className="text-rose-300/80">red flags</dt>
              </div>
            </dl>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-white">No active role</p>
              <p className="text-xs text-zinc-500">
                Set job criteria so candidates are scored against your requirements.
              </p>
            </div>
          </div>
        )}
      </section>

      {all.length === 0 ? (
        <section
          style={delay(160)}
          className="tr-rise mx-auto w-full max-w-xl rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
        >
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-well text-zinc-500">
            <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="font-serif text-2xl font-normal tracking-tight text-white">
            No candidates yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty text-zinc-400">
            Paste a profile, upload a resume or scrape a LinkedIn URL to get a match score, an
            experience estimate and a hiring recommendation.
          </p>
          <div className="mt-7 flex justify-center">
            <ImportCandidateButton />
          </div>
        </section>
      ) : (
        <>
          {/* KPI strip */}
          <section
            aria-label="Pipeline overview"
            style={delay(160)}
            className="tr-rise"
          >
            <dl className="grid grid-cols-2 gap-y-8 lg:grid-cols-4">
              {kpis.map(({ label, value, hint }, i) => (
                <div
                  key={label}
                  className={`${
                    i % 2 === 1 ? "border-l border-border pl-5" : "pl-0"
                  } ${
                    i === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:border-border lg:pl-6"
                  }`}
                >
                  <dt className="text-xs text-zinc-500">{label}</dt>
                  <dd className="mt-2 font-serif text-4xl font-normal tracking-tight text-white tabular-nums">
                    {value}
                  </dd>
                  <p className="mt-1.5 font-mono text-[11px] text-zinc-500 tabular-nums">{hint}</p>
                </div>
              ))}
            </dl>
          </section>

          {/* Leaderboard */}
          <section
            aria-labelledby="leaderboard-heading"
            style={delay(240)}
            className="tr-rise space-y-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2
                    id="leaderboard-heading"
                    className="font-serif text-2xl font-normal tracking-tight text-white"
                  >
                    Candidate leaderboard
                  </h2>
                  <span className="rounded border border-border bg-well px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 tabular-nums">
                    {rows.length} {rows.length === 1 ? "candidate" : "candidates"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">Ranked by match score, highest first</p>
              </div>

              <form method="get" className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <label htmlFor="q" className="sr-only">
                    Search candidates
                  </label>
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
                    aria-hidden="true"
                  />
                  <Input
                    id="q"
                    name="q"
                    defaultValue={q}
                    placeholder="Search name, summary or tag"
                    className="h-9 w-64 border-input bg-well pl-9 text-sm text-zinc-50 placeholder:text-zinc-500"
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
                  Filter
                </Button>
                {filtering && (
                  <Link
                    href="/dashboard"
                    className="px-1 text-xs font-medium text-zinc-400 underline underline-offset-4 transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Clear
                  </Link>
                )}
              </form>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
                <FileText className="mx-auto h-7 w-7 text-zinc-600" aria-hidden="true" />
                <p className="mt-4 font-serif text-xl font-normal tracking-tight text-white">
                  No candidates match these filters
                </p>
                <p className="mt-1.5 text-sm text-zinc-400">
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

            <p className="text-right font-mono text-xs text-zinc-500 tabular-nums">
              Showing {rows.length} of {all.length}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
