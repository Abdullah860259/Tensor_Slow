import React from "react";
import Link from "next/link";
import { formatYears, getScoreStyle, getStatusStyle, pad2 } from "@/lib/candidate-ui";
import { FitBadge, ScoreBar, Tag } from "@/components/ui/foundry";

/**
 * Presentational only: no data fetching, no hooks, so it stays a React Server
 * Component. Map whatever the dashboard query returns into this shape.
 */
export type LeaderboardCandidate = {
  id: string;
  title: string;
  headline?: string;
  score?: number;
  status: string;
  category?: string;
  aiTags?: string[];
  yearsOfExperience?: number;
};

const FIT_LABELS = new Set(["Strong Fit", "Potential", "Unqualified"]);

function rankTone(index: number, scored: boolean): string {
  if (!scored) return "text-zinc-600";
  if (index === 0) return "text-amber-300";
  if (index === 1) return "text-slate-300";
  if (index === 2) return "text-orange-400";
  return "text-zinc-500";
}

export function CandidateLeaderboard({
  candidates,
}: {
  candidates: LeaderboardCandidate[];
}): React.JSX.Element {
  const ranked = [...candidates].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  if (ranked.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-14 text-center">
        <p className="text-sm font-medium text-zinc-100">No candidates yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Import a profile or resume to score your first candidate.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th scope="col" className="w-20 px-4 py-2.5 font-medium">
                Rank
              </th>
              <th scope="col" className="px-2 py-2.5 font-medium">
                Candidate
              </th>
              <th scope="col" className="w-48 px-2 py-2.5 font-medium">
                Match
              </th>
              <th scope="col" className="w-24 px-2 py-2.5 font-medium">
                Experience
              </th>
              <th scope="col" className="w-28 px-2 py-2.5 font-medium">
                Fit
              </th>
              <th scope="col" className="px-2 py-2.5 font-medium">
                Signals
              </th>
              <th scope="col" className="w-32 px-4 py-2.5 text-right font-medium">
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
              const subline =
                candidate.headline ||
                (candidate.category && !FIT_LABELS.has(candidate.category)
                  ? candidate.category
                  : "");

              return (
                <tr
                  key={candidate.id}
                  className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-white/[0.025]"
                >
                  <td className="px-4 py-3 align-middle">
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
                        aria-hidden="true"
                      />
                      <span className="sr-only">{status.label}, rank</span>
                      <span
                        className={`font-mono text-sm font-semibold tabular-nums ${rankTone(index, hasScore)}`}
                      >
                        {pad2(index + 1)}
                      </span>
                    </span>
                  </td>

                  <td className="max-w-[320px] px-2 py-3 align-middle">
                    <Link
                      href={`/items/${candidate.id}`}
                      className="block truncate text-sm font-medium text-white hover:underline focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {candidate.title}
                    </Link>
                    {subline && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {subline}
                      </span>
                    )}
                  </td>

                  <td className="px-2 py-3 align-middle">
                    <span className="flex items-center gap-3">
                      <ScoreBar score={candidate.score} segments={10} className="w-24" />
                      <span
                        className={`w-10 font-mono text-sm font-semibold tabular-nums ${scoreStyle.text}`}
                      >
                        {hasScore ? `${Math.round(candidate.score as number)}%` : "--"}
                      </span>
                    </span>
                  </td>

                  <td className="px-2 py-3 align-middle font-mono text-sm text-zinc-200 tabular-nums">
                    {candidate.yearsOfExperience === undefined
                      ? "--"
                      : `${formatYears(candidate.yearsOfExperience)} yrs`}
                  </td>

                  <td className="px-2 py-3 align-middle">
                    <FitBadge score={candidate.score} />
                  </td>

                  <td className="px-2 py-3 align-middle">
                    {tags.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                        {tags.length > 3 && (
                          <span className="self-center font-mono text-[11px] text-muted-foreground">
                            +{tags.length - 3}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-zinc-600">--</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right align-middle">
                    <Link
                      href={`/items/${candidate.id}`}
                      aria-label={`Inspect profile: ${candidate.title}`}
                      className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-secondary hover:text-white focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      Inspect profile
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
