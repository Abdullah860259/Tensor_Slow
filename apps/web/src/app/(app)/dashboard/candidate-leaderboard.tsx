import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clampScore, formatYears, getScoreStyle, getStatusStyle } from "@/lib/candidate-ui";
import { FitBadge } from "@/components/ui/foundry";

/**
 * Presentational only: no data fetching, no hooks, so it stays a React Server
 * Component. Map whatever the dashboard query returns into this shape.
 * Row entrance uses the .tr-fade class defined in the shell layout.
 */
export type LeaderboardCandidate = {
  id: string;
  title: string;
  headline?: string;
  summary?: string;
  score?: number;
  status: string;
  category?: string;
  aiTags?: string[];
  yearsOfExperience?: number;
};

const FIT_LABELS = new Set(["Strong Fit", "Potential", "Unqualified"]);

function RankBadge({ rank }: { rank: number }): React.JSX.Element {
  if (rank === 1) {
    return (
      <span
        title="Rank 1 · Top Match"
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-amber-500/35 bg-gradient-to-b from-amber-500/20 to-amber-500/5 px-2 font-mono text-xs font-semibold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        title="Rank 2"
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-300/35 bg-gradient-to-b from-slate-300/20 to-slate-400/5 px-2 font-mono text-xs font-semibold text-slate-200"
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        title="Rank 3"
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-amber-700/35 bg-gradient-to-b from-amber-700/20 to-amber-800/5 px-2 font-mono text-xs font-semibold text-amber-500"
      >
        3
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center px-1.5 font-mono text-xs text-zinc-500 tabular-nums">
      {rank}
    </span>
  );
}

export function CandidateLeaderboard({
  candidates,
}: {
  candidates: LeaderboardCandidate[];
}): React.JSX.Element {
  const ranked = [...candidates].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  if (ranked.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-14 text-center">
        <p className="font-serif text-xl font-normal tracking-tight text-white">No candidates yet</p>
        <p className="mt-1.5 text-sm text-zinc-400">
          Import a profile or resume to score your first candidate.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-xs text-zinc-500">
              <th scope="col" className="w-20 px-4 py-3 font-medium">
                Rank
              </th>
              <th scope="col" className="px-2 py-3 font-medium">
                Candidate &amp; role
              </th>
              <th scope="col" className="w-52 px-2 py-3 font-medium">
                Match score
              </th>
              <th scope="col" className="w-28 px-2 py-3 font-medium">
                Experience
              </th>
              <th scope="col" className="w-28 px-2 py-3 font-medium">
                Fit
              </th>
              <th scope="col" className="px-2 py-3 font-medium">
                Signals
              </th>
              <th scope="col" className="w-28 px-4 py-3 text-right font-medium whitespace-nowrap">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((candidate, index) => {
              const hasScore = typeof candidate.score === "number";
              const scoreStyle = getScoreStyle(candidate.score);
              const status = getStatusStyle(candidate.status);
              const tags = candidate.aiTags ?? [];
              const displaySummary =
                candidate.summary ||
                candidate.headline ||
                (candidate.category && !FIT_LABELS.has(candidate.category)
                  ? candidate.category
                  : "");

              return (
                <tr
                  key={candidate.id}
                  style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                  className="tr-fade border-b border-border/70 transition-colors last:border-b-0 hover:bg-white/[0.025]"
                >
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-2">
                      <RankBadge rank={index + 1} />
                      {candidate.status !== "processed" && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
                          title={status.label}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </td>

                  <td className="max-w-[360px] px-2 py-3.5 align-middle">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/items/${candidate.id}`}
                          className="truncate text-sm font-semibold text-white transition-colors hover:text-blue-400 hover:underline hover:underline-offset-4 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {candidate.title}
                        </Link>
                        {candidate.status !== "processed" && (
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[10px] font-medium ${status.text}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                            {status.label}
                          </span>
                        )}
                      </div>
                      {displaySummary && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400 font-normal">
                          {displaySummary}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="px-2 py-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${hasScore ? scoreStyle.bar : "bg-transparent"}`}
                          style={{ width: `${Math.max(hasScore ? 4 : 0, clampScore(candidate.score))}%` }}
                        />
                      </div>
                      <span
                        className={`w-10 font-mono text-xs font-semibold tabular-nums ${scoreStyle.text}`}
                      >
                        {hasScore ? `${Math.round(candidate.score as number)}%` : "--"}
                      </span>
                    </div>
                  </td>

                  <td className="px-2 py-3.5 align-middle font-mono text-sm text-zinc-200 tabular-nums">
                    {candidate.yearsOfExperience === undefined
                      ? "--"
                      : `${formatYears(candidate.yearsOfExperience)} yrs`}
                  </td>

                  <td className="px-2 py-3.5 align-middle">
                    <FitBadge score={candidate.score} />
                  </td>

                  <td className="px-2 py-3.5 align-middle">
                    {tags.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded border border-border bg-well px-1.5 py-0.5 font-mono text-[10px] text-zinc-300"
                          >
                            {tag}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="self-center font-mono text-[10px] text-zinc-500">
                            +{tags.length - 3}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-zinc-700">--</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                    <Link
                      href={`/items/${candidate.id}`}
                      aria-label={`Inspect profile: ${candidate.title}`}
                      className="group inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-card/60 px-3 text-xs font-medium text-zinc-200 transition-all hover:border-zinc-500 hover:bg-secondary hover:text-white focus-visible:ring-1 focus-visible:ring-ring whitespace-nowrap"
                    >
                      <span>Inspect</span>
                      <ArrowRight
                        className="h-3 w-3 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                        aria-hidden="true"
                      />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
