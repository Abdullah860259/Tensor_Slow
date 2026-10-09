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

/**
 * Intelligent sanitizer for candidate profile text (e.g. from pasted LinkedIn text or scraped PDF resumes).
 * Strips web navigation boilerplate, noise, repeated headers, tracking URLs, and collapses excess whitespace.
 */
export function cleanCandidateProfileText(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";

  const lines = raw.split(/\r?\n/);
  const boilerplatePatterns = [
    /^skip to main content/i,
    /^sign in\b/i,
    /^join now\b/i,
    /^join to view full profile/i,
    /^see all \d+ (experiences|skills|connections|details|updates)/i,
    /^show all \d+ (experiences|skills|connections|details|updates)/i,
    /^show more\b/i,
    /^show less\b/i,
    /^report this profile/i,
    /^people also viewed/i,
    /^people you may know/i,
    /^page \d+ of \d+/i,
    /^printed from linkedin/i,
    /^©\s*\d{4}\s*linkedin/i,
    /^activity\s*$/i,
    /^endorse(d)?\b/i,
    /^message\s*$/i,
    /^more\s*$/i,
    /^connect\s*$/i,
    /^follow\s*$/i,
  ];

  const cleanedLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      cleanedLines.push("");
      continue;
    }

    // Skip lines matching boilerplate
    const isBoilerplate = boilerplatePatterns.some((p) => p.test(trimmed));
    if (isBoilerplate) continue;

    // Strip tracking parameters from inline URLs (e.g. ?trk=... or &lipi=...)
    const sanitizedLine = line
      .replace(/[?&](trk|lipi|miniProfileUrn|trackingId|originalReferer)=[^&\s)]+/gi, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, ""); // remove invisible zero-width characters

    cleanedLines.push(sanitizedLine);
  }

  // Join and collapse 3+ consecutive newlines to 2, and trim ends
  return cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
