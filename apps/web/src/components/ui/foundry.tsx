import React from "react";
import type { LucideIcon } from "lucide-react";
import { clampScore, getScoreStyle, getStatusStyle } from "@/lib/candidate-ui";

/**
 * Small presentational primitives for the Foundry look.
 * No hooks and no client-only APIs, so they work in server components.
 * Replaces everything the old neon theme imported from "@/components/hud/hud".
 */

export function Panel({
  title,
  icon: Icon,
  aside,
  children,
  className = "",
  bodyClassName = "p-4",
}: {
  title: string;
  icon?: LucideIcon;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}): React.JSX.Element {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card shadow-xs ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 bg-secondary/20">
        <h2 className="flex items-center gap-2 text-[15px] font-sans font-semibold text-foreground">
          {Icon && <Icon className="h-4 w-4 text-primary" aria-hidden="true" />}
          {title}
        </h2>
        {aside && (
          <div className="font-mono text-[13px] text-muted-foreground tabular-nums">{aside}</div>
        )}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Circular 0-100 gauge. The arc takes the score color; no glow. */
export function ScoreRing({
  score,
  size = 120,
  stroke = 8,
  className = "",
}: {
  score?: number | null;
  size?: number;
  stroke?: number;
  className?: string;
}): React.JSX.Element {
  const has = typeof score === "number" && Number.isFinite(score);
  const value = clampScore(score);
  const style = getScoreStyle(score);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="img"
      aria-label={has ? `Match score ${Math.round(value)} out of 100` : "Not scored"}
      className={`relative inline-flex shrink-0 items-center justify-center ${style.text} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        {has && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - value / 100)}
            strokeLinecap="round"
          />
        )}
      </svg>
      <span
        className="absolute font-figure font-normal text-foreground tabular-nums"
        style={{ fontSize: Math.round(size * 0.3) }}
      >
        {has ? Math.round(value) : "--"}
      </span>
    </div>
  );
}

/** Flat segmented bar. Decorative: always pair it with a numeric readout. */
export function ScoreBar({
  score,
  segments = 10,
  className = "",
}: {
  score?: number | null;
  segments?: number;
  className?: string;
}): React.JSX.Element {
  const has = typeof score === "number" && Number.isFinite(score);
  const value = clampScore(score);
  const filled = has && value > 0 ? Math.max(1, Math.round((value / 100) * segments)) : 0;
  const style = getScoreStyle(score);

  return (
    <div className={`flex h-1.5 gap-[2px] ${className}`} aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={`flex-1 rounded-full ${i < filled ? style.bar : "bg-secondary"}`} />
      ))}
    </div>
  );
}

export function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}): React.JSX.Element {
  const style = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-sans font-medium ${style.text} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {style.label}
    </span>
  );
}

/** Strong Fit / Potential / Unqualified pill derived from the score. */
export function FitBadge({
  score,
  className = "",
}: {
  score?: number | null;
  className?: string;
}): React.JSX.Element {
  const style = getScoreStyle(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-sans font-medium tracking-tight ${style.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      <span>{style.label}</span>
    </span>
  );
}

export function Tag({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-border bg-secondary px-2.5 py-0.5 font-sans text-[13px] font-medium text-foreground transition-colors hover:bg-secondary/80 ${className}`}
    >
      {children}
    </span>
  );
}
