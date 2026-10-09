import React from "react";
import Link from "next/link";
import { clampScore, getScoreStyle, getStatusDot } from "@/lib/candidate-ui";

/**
 * Presentational only: no data fetching, no hooks, so it stays a React Server
 * Component. Map whatever your dashboard query returns into this shape.
 */
export type LeaderboardCandidate = {
  id: string;
  title: string;
  score?: number;
  status: string;
  category?: string;
  aiTags?: string[];
  yearsOfExperience?: number;
};

const GRID =
  "grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-4 md:grid-cols-[2rem_minmax(0,1fr)_5.5rem_7rem_8.5rem]";

export function CandidateLeaderboard({
  candidates,
}: {
  candidates: LeaderboardCandidate[];
}): React.JSX.Element {
  const ranked = [...candidates].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-zinc-50">Candidates</h2>
          <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300 tabular-nums">
            {ranked.length}
          </span>
        </div>
        <p className="text-xs text-zinc-400">Sorted by ATS score</p>
      </div>

      {ranked.length === 0 ? (
        <div className="px-4 py-14 text-center">
          <p className="text-sm font-medium text-zinc-100">No candidates yet</p>
          <p className="mt-1 text-sm text-zinc-400">
            Import a LinkedIn profile to score your first candidate.
          </p>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={`${GRID} border-b border-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-400`}
          >
            <span>#</span>
            <span>Candidate</span>
            <span className="hidden md:block">Experience</span>
            <span className="hidden md:block">Status</span>
            <span className="text-right">ATS score</span>
          </div>

          <ul className="divide-y divide-zinc-800/80">
            {ranked.map((candidate, index) => {
              const style = getScoreStyle(candidate.score);
              const safe = clampScore(candidate.score);
              const subline = [
                candidate.category,
                ...(candidate.aiTags ?? []).slice(0, 3),
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <li key={candidate.id}>
                  <Link
                    href={`/items/${candidate.id}`}
                    className={`${GRID} items-center px-4 py-3 transition-colors hover:bg-zinc-800/50 focus-visible:bg-zinc-800/50 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none focus-visible:ring-inset`}
                  >
                    <span
                      className={`text-sm tabular-nums ${
                        index < 3 ? "font-medium text-zinc-50" : "text-zinc-400"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-50">
                        {candidate.title}
                      </span>
                      {subline && (
                        <span className="block truncate text-xs text-zinc-400">
                          {subline}
                        </span>
                      )}
                    </span>

                    <span className="hidden text-sm text-zinc-300 tabular-nums md:block">
                      {candidate.yearsOfExperience === undefined
                        ? "—"
                        : `${candidate.yearsOfExperience} yrs`}
                    </span>

                    <span className="hidden items-center gap-1.5 text-xs text-zinc-300 capitalize md:flex">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${getStatusDot(candidate.status)}`}
                        aria-hidden="true"
                      />
                      {candidate.status}
                    </span>

                    <span className="flex items-center justify-end gap-3">
                      <span
                        className="hidden h-1 w-12 overflow-hidden rounded-full bg-zinc-800 sm:block"
                        aria-hidden="true"
                      >
                        <span
                          className={`block h-full rounded-full ${style.bar}`}
                          style={{ width: `${safe}%` }}
                        />
                      </span>
                      <span
                        className="flex min-w-[3.25rem] items-center justify-end gap-2"
                        title={style.label}
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-semibold text-zinc-50 tabular-nums">
                          {candidate.score === undefined ? "—" : candidate.score}
                        </span>
                        <span className="sr-only">{style.label}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
