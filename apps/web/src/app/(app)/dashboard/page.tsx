import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  Gauge,
  Plus,
  Search,
  Sparkles,
  Users,
  Trophy,
  Medal,
  Award
} from "lucide-react";
import { auth } from "@/lib/auth";
import { connectMongoose } from "@/lib/db";
import { ItemModel } from "@/lib/models";
import { processItem } from "@/lib/items/process";
import { domain } from "@/lib/domain";
import { logger } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImportCandidateButton } from "./import-candidate-button";
import { JobCriteriaModal } from "./job-criteria-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { CandidateLeaderboard } from "./candidate-leaderboard";

const L = domain.labels;
const SELECT_CLASS =
  "h-10 rounded-lg border border-input bg-background/50 backdrop-blur-md px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

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

function timestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

async function createItemAction(formData: FormData) {
  "use server";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const title = formData.get("title")?.toString().trim();
  const content = formData.get("content")?.toString().trim() || "";
  if (!title) return;

  await connectMongoose();
  const created = await ItemModel.create({
    ownerId: session.user.id,
    title,
    content,
    status: "pending",
    aiTags: [],
  });
  const id = created._id.toString();

  try {
    await processItem(id, session.user.id);
  } catch (err) {
    logger.warn("[dashboard] processItem threw", { error: String(err) });
  }

  revalidatePath("/dashboard");
  redirect(`/items/${id}`);
}

function CreateForm({ idPrefix }: { idPrefix: string }): React.JSX.Element {
  return (
    <form action={createItemAction} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-title`}
          className="text-muted-foreground text-xs font-medium"
        >
          Candidate name and role
        </label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          required
          placeholder={L.titlePlaceholder}
          className="text-sm bg-background/50 backdrop-blur-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-content`}
          className="text-muted-foreground text-xs font-medium"
        >
          LinkedIn profile text
        </label>
        <Textarea
          id={`${idPrefix}-content`}
          name="content"
          placeholder={L.contentPlaceholder}
          className="min-h-[140px] text-sm bg-background/50 backdrop-blur-sm"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" className="cursor-pointer gap-1.5 shadow-md">
          <Sparkles className="h-3.5 w-3.5" />
          {L.createCta}
        </Button>
      </div>
    </form>
  );
}

function scoreTone(score: number | undefined): string {
  if (score === undefined) return "bg-muted text-muted-foreground";
  if (score >= 80)
    return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
  if (score >= 60) return "bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
  return "bg-rose-500/20 text-rose-700 dark:text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
}

const rankStyles = (index: number, score?: number) => {
  if (score === undefined) return "bg-white/40 dark:bg-black/40 border-white/20";
  if (index === 0) return "bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/30 shadow-[0_8px_30px_rgba(245,158,11,0.15)]";
  if (index === 1) return "bg-gradient-to-r from-slate-400/10 to-gray-400/5 border-slate-400/30 shadow-[0_8px_30px_rgba(148,163,184,0.1)]";
  if (index === 2) return "bg-gradient-to-r from-orange-600/10 to-red-600/5 border-orange-600/30 shadow-[0_8px_30px_rgba(234,88,12,0.1)]";
  return "bg-white/40 dark:bg-black/40 border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]";
};

const rankIcon = (index: number) => {
  if (index === 0) return <Trophy className="h-6 w-6 text-amber-500 drop-shadow-md" />;
  if (index === 1) return <Medal className="h-6 w-6 text-slate-400 drop-shadow-md" />;
  if (index === 2) return <Award className="h-6 w-6 text-orange-500 drop-shadow-md" />;
  return <span className="text-lg font-bold text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}): Promise<React.JSX.Element> {
  const { q = "", status = "" } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  await connectMongoose();
  const all = await ItemModel.find({ ownerId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const needle = q.trim().toLowerCase();
  const rows = all
    .filter((item) => {
      const fields = getCandidateFields(item.fields);
      return (
        (!status || item.status === status) &&
        (!needle ||
          [
            item.title,
            item.aiSummary ?? "",
            fields.verdict ?? "",
            ...(item.aiTags ?? []),
          ]
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
    ? Math.round(
        scored.reduce((sum, item) => sum + (item.score ?? 0), 0) /
          scored.length,
      )
    : null;
  const filtering = Boolean(q || status);

  const kpis = [
    { label: "In your pipeline", value: all.length, icon: Users },
    { label: "AI evaluated", value: analyzed, icon: BadgeCheck },
    { label: "Top matches (80%+)", value: topMatches, icon: Sparkles },
    {
      label: "Average match",
      value: avgScore === null ? "—" : `${avgScore}%`,
      icon: Gauge,
    },
  ];

  return (
    <div className="space-y-10 pb-10">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-primary flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase drop-shadow-sm">
            <span className="bg-primary h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]" /> TalentRank AI
          </p>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Talent pipeline
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl text-base font-medium">
              {L.tagline}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <JobCriteriaModal />
          <ImportCandidateButton />
          {all.length > 0 && (
            <details className="group relative shrink-0">
              <summary className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer list-none items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl select-none">
                <Plus className="h-4 w-4" /> Add candidate
              </summary>
              <div className="border-border bg-card/80 backdrop-blur-2xl absolute top-full right-0 z-30 mt-3 w-80 max-w-[calc(100vw_-_2rem)] rounded-3xl border p-6 shadow-2xl sm:w-96">
                <h2 className="mb-5 font-bold text-lg">Evaluate a candidate</h2>
                <CreateForm idPrefix="top" />
              </div>
            </details>
          )}
        </div>
      </section>

      {all.length === 0 ? (
        <section className="border-border bg-card/40 backdrop-blur-xl mx-auto w-full max-w-xl rounded-[2.5rem] border border-dashed p-8 text-center sm:p-12 shadow-xl">
          <div className="bg-primary/10 text-primary mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl shadow-inner">
            <BriefcaseBusiness className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Start building your talent pipeline
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md text-base leading-relaxed font-medium">
            Add a candidate&apos;s LinkedIn profile to get an AI match score,
            experience estimate, and interview recommendation.
          </p>
          <Card className="mt-8 text-left shadow-2xl rounded-[2rem] overflow-hidden border-border/50 bg-background/50 backdrop-blur-xl">
            <CardContent className="p-6 sm:p-8">
              <CreateForm idPrefix="first" />
            </CardContent>
          </Card>
        </section>
      ) : (
        <>
          <section
            aria-label="Pipeline overview"
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {kpis.map(({ label, value, icon: Icon }) => (
              <div key={label} className="relative overflow-hidden rounded-[2rem] bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 transition-all hover:bg-white/50 dark:hover:bg-black/50 hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/15 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground truncate text-xs font-bold uppercase tracking-widest">
                      {label}
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums drop-shadow-sm">
                      {value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section aria-labelledby="leaderboard-heading" className="space-y-6">
            <div className="border-border flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    id="leaderboard-heading"
                    className="text-2xl font-extrabold tracking-tight"
                  >
                    Candidate Leaderboard
                  </h2>
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-1 font-bold bg-secondary/50 backdrop-blur-md"
                  >
                    {rows.length} candidates
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-2 text-sm font-medium">
                  Ranked by AI match score, highest first
                </p>
              </div>
              <form method="get" className="flex flex-wrap items-end gap-3">
                <div className="relative min-w-[220px] flex-1 sm:flex-none">
                  <label htmlFor="q" className="sr-only">
                    Search candidates
                  </label>
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="q"
                    name="q"
                    defaultValue={q}
                    placeholder="Search candidates"
                    className="h-10 rounded-xl pl-9 text-sm sm:w-56 bg-background/50 backdrop-blur-md shadow-inner"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="sr-only">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={status}
                    className={SELECT_CLASS}
                  >
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
                  className="h-10 gap-2 rounded-xl px-4 shadow-sm backdrop-blur-md bg-background/50 hover:bg-background/80"
                >
                  <Search className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Filter</span>
                </Button>
                {filtering && (
                  <Link
                    href="/dashboard"
                    className="text-muted-foreground px-2 pb-2.5 text-xs font-semibold underline underline-offset-4 hover:text-foreground"
                  >
                    Clear
                  </Link>
                )}
              </form>
            </div>

            {rows.length === 0 ? (
              <div className="border-border bg-card/40 backdrop-blur-xl rounded-[2rem] border border-dashed px-6 py-16 text-center shadow-inner">
                <FileText className="text-muted-foreground/50 mx-auto h-12 w-12" />
                <p className="mt-4 text-lg font-bold">
                  No candidates match these filters
                </p>
                <p className="text-muted-foreground mt-2 text-sm font-medium">
                  Try a different search or clear your filters.
                </p>
              </div>
            ) : (
              <CandidateLeaderboard
                candidates={rows.map((item) => ({
                  id: String(item._id),
                  title: item.title,
                  score: typeof item.score === "number" ? item.score : undefined,
                  status: item.status,
                  category: item.category,
                  aiTags: item.aiTags,
                  yearsOfExperience: getCandidateFields(item.fields).yearsOfExperience,
                }))}
              />
            )}
            <p className="text-muted-foreground text-right text-xs font-semibold tracking-wide">
              Showing {rows.length} of {all.length} candidates
            </p>
          </section>
        </>
      )}
    </div>
  );
}
