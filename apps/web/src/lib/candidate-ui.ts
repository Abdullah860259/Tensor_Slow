/**
 * Shared presentational helpers for the leaderboard and candidate detail views.
 * Pure functions, no React: safe to import from server and client components.
 *
 * Class names are written out in full so Tailwind v4's source scanner picks them up.
 */

export type ScoreStyle = {
  /** Qualitative band shown next to the score. */
  label: string;
  /** Text color for the score number when it needs to carry the band color. */
  text: string;
  /** SVG stroke color for the progress ring. */
  stroke: string;
  /** Solid background for dot badges. */
  dot: string;
  /** Solid background for progress bars. */
  bar: string;
};

const STRONG: ScoreStyle = {
  label: "Strong match",
  text: "text-emerald-400",
  stroke: "stroke-emerald-400",
  dot: "bg-emerald-400",
  bar: "bg-emerald-400",
};

const MODERATE: ScoreStyle = {
  label: "Moderate match",
  text: "text-amber-400",
  stroke: "stroke-amber-400",
  dot: "bg-amber-400",
  bar: "bg-amber-400",
};

const WEAK: ScoreStyle = {
  label: "Weak match",
  text: "text-rose-400",
  stroke: "stroke-rose-400",
  dot: "bg-rose-400",
  bar: "bg-rose-400",
};

const UNSCORED: ScoreStyle = {
  label: "Not scored",
  text: "text-zinc-400",
  stroke: "stroke-zinc-600",
  dot: "bg-zinc-600",
  bar: "bg-zinc-600",
};

/** Same thresholds as the previous scoreTone(): 80+ strong, 60+ moderate, else weak. */
export function getScoreStyle(score: number | null | undefined): ScoreStyle {
  if (typeof score !== "number" || !Number.isFinite(score)) return UNSCORED;
  if (score >= 80) return STRONG;
  if (score >= 60) return MODERATE;
  return WEAK;
}

export function clampScore(score: number | null | undefined): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score));
}

/** Dot color for the processing status badge. */
export function getStatusDot(status: string): string {
  if (status === "processed") return "bg-emerald-400";
  if (status === "failed") return "bg-rose-400";
  return "bg-amber-400";
}
