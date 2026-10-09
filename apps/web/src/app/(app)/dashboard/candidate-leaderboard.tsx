import React from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { pad2 } from "@/lib/candidate-ui";
import {
  Panel,
  ScoreRing,
  SegmentedBar,
  StatusReadout,
} from "@/components/hud/hud";

/**
 * Presentational only: no data fetching, no hooks, so it stays a React Server
 * Component. Map whatever the dashboard query returns into this shape.
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
  "grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-4 md:grid-cols-[2.5rem_minmax(0,1fr)_6rem_9rem_15rem]";

export function CandidateLeaderboard({
  candidates,
}: {
  candidates: LeaderboardCandidate[];
}): React.JSX.Element {
  const ranked = [...candidates].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  );

  return (
    <Panel
      accent="cyan"
      title="Candidate telemetry"
      icon={Radio}
      bodyClassName="p-0"
      aside={
        <p className="font-mono text-[11px] tracking-[0.14em] text-slate-400 uppercase">
          <span className="text-white tabular-nums">{pad2(ranked.length)}</span>{" "}
          tracked / sort: ats desc
        </p>
      }
    >
      {ranked.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="font-mono text-xs tracking-[0.18em] text-neon-cyan uppercase">
            No signal
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Import a LinkedIn profile to score your first candidate.
          </p>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={`${GRID} border-b border-slate-800/90 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase`}
          >
            <span>Rk</span>
            <span>Candidate</span>
            <span className="hidden md:block">Exp</span>
            <span className="hidden md:block">Status</span>
            <span className="text-right">Match</span>
          </div>

          <ul className="divide-y divide-slate-800/70">
            {ranked.map((candidate, index) => {
              const subline = [
                candidate.category,
                ...(candidate.aiTags ?? []).slice(0, 3),
              ]
                .filter(Boolean)
                .join(" / ");

              return (
                <li key={candidate.id}>
                  <Link
                    href={`/items/${candidate.id}`}
                    className={`${GRID} items-center px-4 py-3 transition-colors hover:bg-neon-cyan/[0.04] hover:shadow-[inset_2px_0_0_0_var(--color-neon-cyan)] focus-visible:bg-neon-cyan/[0.04] focus-visible:ring-1 focus-visible:ring-neon-cyan focus-visible:outline-none focus-visible:ring-inset`}
                  >
                    <span
                      className={`font-mono text-sm tabular-nums ${
                        index < 3 ? "font-semibold text-neon-cyan" : "text-slate-400"
                      }`}
                    >
                      {pad2(index + 1)}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate font-display text-[15px] font-semibold text-white">
                        {candidate.title}
                      </span>
                      {subline && (
                        <span className="block truncate font-mono text-[11px] text-slate-400">
                          {subline}
                        </span>
                      )}
                    </span>

                    <span className="hidden font-mono text-sm text-slate-100 tabular-nums md:block">
                      {candidate.yearsOfExperience === undefined
                        ? "--"
                        : `${pad2(candidate.yearsOfExperience)} yrs`}
                    </span>

                    <StatusReadout
                      status={candidate.status}
                      className="hidden md:inline-flex"
                    />

                    <span className="flex items-center justify-end gap-4">
                      <SegmentedBar
                        score={candidate.score}
                        segments={10}
                        className="hidden w-28 sm:flex"
                      />
                      <ScoreRing score={candidate.score} size={44} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
