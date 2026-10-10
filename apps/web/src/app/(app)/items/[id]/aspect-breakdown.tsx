import React from "react";
import { ScoreBar } from "@/components/ui/foundry";
import { clampScore, getScoreStyle } from "@/lib/candidate-ui";
import { EVALUATION_ASPECTS } from "@/lib/domain";

export interface AspectScore {
  aspect: string;
  score: number;
  evidence: string;
  assessed: boolean;
}

/** Reads aspects from stored extraction fields, in the canonical aspect order. */
export function readAspects(value: unknown): AspectScore[] {
  if (!Array.isArray(value)) return [];
  const byName = new Map<string, AspectScore>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.aspect !== "string" || typeof e.score !== "number" || !Number.isFinite(e.score)) continue;
    byName.set(e.aspect, {
      aspect: e.aspect,
      score: clampScore(e.score),
      evidence: typeof e.evidence === "string" ? e.evidence : "",
      assessed: e.assessed !== false,
    });
  }
  return EVALUATION_ASPECTS.map((a) => byName.get(a.label)).filter((a): a is AspectScore => Boolean(a));
}

/** One row per aspect: label, bar, score and the evidence behind it. Server-safe. */
export function AspectBreakdown({ aspects }: { aspects: AspectScore[] }): React.JSX.Element {
  return (
    <ul className="divide-y divide-border">
      {aspects.map(({ aspect, score, evidence, assessed }) => {
        const style = getScoreStyle(assessed ? score : undefined);
        return (
          <li key={aspect} className="grid gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-zinc-100">{aspect}</h3>
                <span className={`font-mono text-sm font-semibold tabular-nums ${assessed ? style.text : "text-zinc-500"}`}>
                  {assessed ? Math.round(score) : "--"}
                </span>
              </div>
              <ScoreBar score={assessed ? score : undefined} />
            </div>
            <p className={`text-sm leading-relaxed ${assessed ? "text-zinc-300" : "text-zinc-500 italic"}`}>
              {assessed ? evidence : evidence || "Not enough information to judge."}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
