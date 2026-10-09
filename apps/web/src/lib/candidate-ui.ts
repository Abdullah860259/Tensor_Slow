/**
 * Shared presentational helpers for the dashboard and candidate views.
 * Pure functions, no React: safe from server and client components.
 *
 * Class names are written out in full so Tailwind v4's source scanner finds them.
 * Each style only sets a text color; rings, bars and dots use `currentColor`
 * (bg-current / stroke="currentColor") so one class drives the whole readout.
 */

export type ScoreStyle = {
  /** Qualitative band shown next to the score. */
  label: string;
  /** Text color; descendants use currentColor. */
  text: string;
  stroke?: string;
  dot?: string;
  bar?: string;
};

/** Same thresholds as before: 80+ strong, 60+ moderate, else weak. */
export function getScoreStyle(score: number | null | undefined): ScoreStyle {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return {
      label: "Not scored",
      text: "text-slate-500",
      stroke: "stroke-slate-500",
      dot: "bg-slate-500",
      bar: "bg-slate-500",
    };
  }
  if (score >= 80)
    return {
      label: "Strong match",
      text: "text-neon-cyan",
      stroke: "stroke-neon-cyan",
      dot: "bg-neon-cyan",
      bar: "bg-neon-cyan",
    };
  if (score >= 60)
    return {
      label: "Moderate match",
      text: "text-neon-orange",
      stroke: "stroke-neon-orange",
      dot: "bg-neon-orange",
      bar: "bg-neon-orange",
    };
  return {
    label: "Weak match",
    text: "text-rose-500",
    stroke: "stroke-rose-500",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  };
}

export function clampScore(score: number | null | undefined): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score));
}

/** processed = nominal (cyan), failed = alert (red), anything else = pending (orange). */
export function getStatusStyle(status: string): { text: string } {
  if (status === "processed") return { text: "text-neon-cyan" };
  if (status === "failed") return { text: "text-rose-500" };
  return { text: "text-neon-orange" };
}

export function getStatusDot(status: string): string {
  if (status === "processed") return "bg-neon-cyan";
  if (status === "failed") return "bg-rose-500";
  return "bg-neon-orange";
}

/** Zero-padded readout, e.g. 7 -> "07". */
export function pad2(value: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(2, "0");
}
