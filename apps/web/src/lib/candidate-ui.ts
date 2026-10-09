/**
 * Shared presentational helpers for the dashboard and candidate views.
 * Pure functions, no React: safe from server and client components.
 *
 * Class names are written out in full so Tailwind v4's source scanner finds them.
 */

export type ScoreStyle = {
  /** Qualitative band shown next to the score. */
  label: string;
  /** Text color. SVG rings and dots inherit it through currentColor. */
  text: string;
  /** Tinted pill: background, text and border. */
  badge: string;
  /** Solid fill for bars. */
  bar: string;
};

/** 80+ strong fit, 60+ potential, otherwise unqualified. */
export function getScoreStyle(score: number | null | undefined): ScoreStyle {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return {
      label: "Unscored",
      text: "text-zinc-500",
      badge: "bg-zinc-800 text-zinc-400 border-zinc-700",
      bar: "bg-zinc-700",
    };
  }
  if (score >= 80) {
    return {
      label: "Strong Fit",
      text: "text-emerald-400",
      badge: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
      bar: "bg-emerald-500",
    };
  }
  if (score >= 60) {
    return {
      label: "Potential",
      text: "text-amber-400",
      badge: "bg-amber-950/60 text-amber-300 border-amber-800/60",
      bar: "bg-amber-500",
    };
  }
  return {
    label: "Unqualified",
    text: "text-rose-400",
    badge: "bg-rose-950/60 text-rose-300 border-rose-800/60",
    bar: "bg-rose-500",
  };
}

export function clampScore(score: number | null | undefined): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score));
}

export type StatusStyle = {
  label: string;
  text: string;
  dot: string;
};

/** processed = evaluated (emerald), failed = rose, anything else = pending (amber). */
export function getStatusStyle(status: string): StatusStyle {
  if (status === "processed") {
    return { label: "Evaluated", text: "text-emerald-400", dot: "bg-emerald-500" };
  }
  if (status === "failed") {
    return { label: "Failed", text: "text-rose-400", dot: "bg-rose-500" };
  }
  return { label: "Pending", text: "text-amber-400", dot: "bg-amber-500" };
}

export function getStatusDot(status: string): string {
  return getStatusStyle(status).dot;
}

/** Zero-padded readout, e.g. 7 -> "07". */
export function pad2(value: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(2, "0");
}

/** Imported candidates are titled "Name - LinkedIn Profile"; show just the name. */
export function candidateDisplayName(title: string): string {
  return title.replace(/\s+-\s+LinkedIn Profile$/i, "").trim() || title;
}

/** Pulls a "Headline: ..." line out of stored profile text, when present. */
export function extractHeadline(content: string | null | undefined): string | undefined {
  if (!content) return undefined;
  const value = content.match(/^\s*Headline:\s*(.+)$/im)?.[1]?.trim();
  return value || undefined;
}

/** 5 -> "5", 5.5 -> "5.5" */
export function formatYears(years: number): string {
  return Number.isInteger(years) ? String(years) : years.toFixed(1);
}
