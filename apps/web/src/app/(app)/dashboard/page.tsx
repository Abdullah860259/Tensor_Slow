import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { connectMongoose } from "@/lib/db";
import { ItemModel, JobCriteriaModel, StarModel } from "@/lib/models";
import { domain } from "@/lib/domain";
import { candidateDisplayName, extractHeadline } from "@/lib/candidate-ui";
import { normalizeLinkedinUrl } from "@/lib/sourcing/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportCandidateButton } from "./import-candidate-button";
import { JobCriteriaModal, type ActiveCriteria } from "./job-criteria-modal";
import { CandidateLeaderboard } from "./candidate-leaderboard";
import { SourceCandidatesModal } from "./source-candidates-modal";

const L = domain.labels;

const SELECT_CLASS =
  "h-9 rounded-full border border-border bg-card px-3.5 text-sm font-sans text-foreground transition-all hover:border-foreground/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none cursor-pointer";

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

function extractCandidateSummary(item: {
  aiSummary?: string | null;
  content?: string | null;
  fields?: unknown;
}): string | undefined {
  if (item.aiSummary && typeof item.aiSummary === "string" && item.aiSummary.trim().length > 0) {
    return item.aiSummary.trim();
  }
  const fields = getCandidateFields(item.fields);
  if (fields.verdict && typeof fields.verdict === "string" && fields.verdict.trim().length > 0) {
    return fields.verdict.trim();
  }
  if (item.content && typeof item.content === "string") {
    const summaryMatch = item.content.match(/^\s*Summary:\s*(.+)$/im)?.[1]?.trim();
    if (summaryMatch) return summaryMatch;
    const headlineMatch = item.content.match(/^\s*Headline:\s*(.+)$/im)?.[1]?.trim();
    if (headlineMatch) return headlineMatch;
  }
  return undefined;
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
  const [all, activeDoc, starredIds] = await Promise.all([
    ItemModel.find({ ownerId: session.user.id }).sort({ createdAt: -1 }).limit(500).lean(),
    JobCriteriaModel.findOne({ ownerId: session.user.id, isActive: true }).lean(),
    StarModel.getStarredItemIds(session.user.id),
  ]);
  const starred = new Set(starredIds);

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

  const kpis = [
    {
      label: "Total candidates",
      value: all.length,
      hint: `${scored.length} scored`,
      icon: Users,
      accent: "from-blue-500/15 via-blue-500/5 to-transparent",
      iconColor: "text-blue-400",
    },
    {
      label: "Top matches (80+)",
      value: topMatches,
      hint: all.length ? `${Math.round((topMatches / all.length) * 100)}% of pipeline` : "No candidates",
      icon: Award,
      accent: "from-success/15 via-success/5 to-transparent",
      iconColor: "text-success",
    },
    {
      label: "Average match score",
      value: avgScore === null ? "--" : `${avgScore}%`,
      hint: scored.length ? `Across ${scored.length} scored` : "Nothing scored yet",
      icon: TrendingUp,
      accent: "from-amber-500/15 via-amber-500/5 to-transparent",
      iconColor: "text-amber-400",
    },
    {
      label: "Active criteria",
      value: activeCriteria ? criteriaTotal : "--",
      hint: activeCriteria ? "Rubric items in force" : "No role set",
      icon: CheckCircle2,
      accent: "from-purple-500/15 via-purple-500/5 to-transparent",
      iconColor: "text-purple-400",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-10">
      {/* Hero and primary actions */}
      <header className="tr-rise flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase">{L.product}</p>
          <h1 className="mt-2.5 font-sans text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Talent pipeline
          </h1>
          <p className="mt-2.5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
            {L.tagline}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <JobCriteriaModal initialCriteria={activeCriteria} />
          <SourceCandidatesModal />
          <ImportCandidateButton />
        </div>
      </header>

      {/* Active role strip */}
      <section
        aria-label="Active job criteria"
        style={delay(80)}
        className="tr-rise relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        {activeCriteria ? (
          <>
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(72,183,104,0.4)]" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-sans font-medium text-muted-foreground tracking-wide uppercase">Active rubric</p>
                <p className="truncate text-base font-semibold tracking-tight text-foreground">{activeCriteria.roleTitle}</p>
              </div>
            </div>
            <dl className="flex flex-wrap items-center gap-2 text-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/15 px-3 py-1 shadow-xs">
                <dd className="font-semibold text-success tabular-nums">{mustHaveCount}</dd>
                <dt className="text-success font-medium">must-have</dt>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 shadow-xs">
                <dd className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{niceToHaveCount}</dd>
                <dt className="text-amber-700 dark:text-amber-400 font-medium">nice-to-have</dt>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/15 px-3 py-1 shadow-xs">
                <dd className="font-semibold text-destructive tabular-nums">{redFlagCount}</dd>
                <dt className="text-destructive font-medium">red flags</dt>
              </div>
            </dl>
          </>
        ) : (
          <div className="flex items-center gap-3.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">No active role</p>
              <p className="text-sm text-muted-foreground">
                Set job criteria so candidates are scored against your requirements.
              </p>
            </div>
          </div>
        )}
      </section>

      {all.length === 0 ? (
        <section
          style={delay(160)}
          className="tr-rise mx-auto w-full max-w-xl rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-xs"
        >
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
            <BriefcaseBusiness className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground">
            No candidates yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-pretty text-muted-foreground">
            Paste a profile, upload a resume or scrape a LinkedIn URL to get a match score, an
            experience estimate and a hiring recommendation.
          </p>
          <div className="mt-7 flex justify-center">
            <ImportCandidateButton />
          </div>
        </section>
      ) : (
        <>
          {/* Bento KPI strip */}
          <section
            aria-label="Pipeline overview"
            style={delay(160)}
            className="tr-rise"
          >
            <dl className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map(({ label, value, hint, icon: Icon, accent, iconColor }) => (
                <div
                  key={label}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-foreground/20"
                >
                  <dt className="flex items-center justify-between text-sm font-sans font-medium text-muted-foreground">
                    <span>{label}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </dt>
                  <dd className="mt-3 font-figure text-3xl font-normal tracking-tight text-foreground tabular-nums sm:text-4xl">
                    {value}
                  </dd>
                  <p className="mt-2 text-[13px] font-sans font-medium text-muted-foreground tabular-nums">
                    {hint}
                  </p>
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
                    className="font-sans text-2xl font-bold tracking-tight text-foreground"
                  >
                    Candidate leaderboard
                  </h2>
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 font-sans text-[13px] font-medium text-foreground tabular-nums">
                    {rows.length} {rows.length === 1 ? "candidate" : "candidates"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">Ranked by match score, highest first</p>
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
                    className="h-9 w-64 rounded-full border border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-all focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring"
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
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="h-9 cursor-pointer rounded-full border border-border bg-card px-4 text-sm font-sans font-medium text-foreground shadow-xs transition-all hover:bg-secondary"
                >
                  Filter
                </Button>
                {filtering && (
                  <Link
                    href="/dashboard"
                    className="px-2 text-sm font-sans font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Clear
                  </Link>
                )}
              </form>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                <FileText className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
                <p className="mt-4 font-sans text-xl font-semibold tracking-tight text-foreground">
                  No candidates match these filters
                </p>
                <p className="mt-1.5 text-base text-muted-foreground">
                  Try a different search or clear the filters.
                </p>
              </div>
            ) : (
              <CandidateLeaderboard
                candidates={rows.map((item) => {
                  const fields = getCandidateFields(item.fields);
                  return {
                    id: String(item._id),
                    title: candidateDisplayName(item.title),
                    headline: extractHeadline(item.content),
                    summary: extractCandidateSummary(item),
                    score: typeof item.score === "number" ? item.score : undefined,
                    status: item.status,
                    category: item.category,
                    aiTags: item.aiTags,
                    yearsOfExperience: fields.yearsOfExperience,
                    starred: starred.has(String(item._id)),
                    linkedinUrl: normalizeLinkedinUrl(item.sourceUrl) ?? undefined,
                  };
                })}
              />
            )}

            <p className="text-right font-figure text-sm text-muted-foreground tabular-nums">
              Showing {rows.length} of {all.length}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
