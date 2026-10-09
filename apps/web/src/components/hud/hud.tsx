import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  clampScore,
  getScoreStyle,
  getStatusStyle,
} from "@/lib/candidate-ui";

/**
 * Aerospace / HUD primitives.
 *
 * Everything here is presentational: no hooks, no browser APIs, no "use client".
 * That keeps them usable from React Server Components and from client components.
 * Hover effects are pure CSS.
 */

/* -------------------------------------------------------------------------- */
/* Accents                                                                    */
/* -------------------------------------------------------------------------- */

export type Accent = "cyan" | "orange" | "plasma" | "slate";

const ACCENT: Record<
  Accent,
  { text: string; via: string; edge: string; glow: string; hover: string }
> = {
  cyan: {
    text: "text-neon-cyan",
    via: "via-neon-cyan",
    edge: "border-neon-cyan",
    glow: "shadow-[0_0_14px_rgb(34_229_255/0.7)]",
    hover:
      "bg-[radial-gradient(circle_at_50%_0%,rgb(34_229_255/0.16),transparent_65%)]",
  },
  orange: {
    text: "text-neon-orange",
    via: "via-neon-orange",
    edge: "border-neon-orange",
    glow: "shadow-[0_0_14px_rgb(255_122_26/0.7)]",
    hover:
      "bg-[radial-gradient(circle_at_50%_0%,rgb(255_122_26/0.16),transparent_65%)]",
  },
  plasma: {
    text: "text-neon-plasma",
    via: "via-neon-plasma",
    edge: "border-neon-plasma",
    glow: "shadow-[0_0_14px_rgb(183_139_255/0.7)]",
    hover:
      "bg-[radial-gradient(circle_at_50%_0%,rgb(183_139_255/0.16),transparent_65%)]",
  },
  slate: {
    text: "text-slate-300",
    via: "via-slate-500",
    edge: "border-slate-500",
    glow: "",
    hover:
      "bg-[radial-gradient(circle_at_50%_0%,rgb(148_163_184/0.12),transparent_65%)]",
  },
};

/* -------------------------------------------------------------------------- */
/* Panel                                                                      */
/* -------------------------------------------------------------------------- */

/** Sharp-edged panel with a glowing top edge and two corner brackets. */
export function Panel({
  accent = "cyan",
  title,
  icon: Icon,
  aside,
  className = "",
  bodyClassName = "p-4",
  children,
}: {
  accent?: Accent;
  title?: string;
  icon?: LucideIcon;
  aside?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const a = ACCENT[accent];
  return (
    <div
      className={`group/panel relative flex flex-col rounded-sm border border-slate-800/90 bg-black/60 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent ${a.via} to-transparent ${a.glow}`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -top-px -left-px h-2 w-2 border-t border-l ${a.edge}`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-px -bottom-px h-2 w-2 border-r border-b ${a.edge}`}
      />
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/90 px-4 py-2.5">
          <h2 className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.18em] text-slate-400 uppercase">
            {Icon && (
              <Icon className={`h-3.5 w-3.5 ${a.text}`} aria-hidden="true" />
            )}
            {title}
          </h2>
          {aside}
        </div>
      )}
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Score readouts                                                             */
/* -------------------------------------------------------------------------- */

/** Glowing radial ring. Color comes from the score band via currentColor. */
export function ScoreRing({
  score,
  size = 48,
  ticks = false,
}: {
  score: number | undefined;
  size?: number;
  ticks?: boolean;
}): React.JSX.Element {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const safe = clampScore(score);
  const style = getScoreStyle(score);

  return (
    <div
      className={`relative shrink-0 ${style.text}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        score === undefined
          ? "ATS score unavailable"
          : `ATS score ${score} out of 100`
      }
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90 drop-shadow-[0_0_5px_currentColor]"
        aria-hidden="true"
      >
        {ticks && (
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.3"
            strokeWidth="2.5"
            strokeDasharray="1 3.92"
          />
        )}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={ticks ? 6 : 8}
          className="stroke-slate-800"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={ticks ? 6 : 8}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-mono font-semibold text-white tabular-nums"
          style={{ fontSize: Math.round(size * 0.3) }}
        >
          {score === undefined ? "--" : score}
        </span>
      </div>
    </div>
  );
}

/** Segmented bar, e.g. 10 slanted cells; filled cells glow in the band color. */
export function SegmentedBar({
  score,
  segments = 10,
  className = "",
}: {
  score: number | undefined;
  segments?: number;
  className?: string;
}): React.JSX.Element {
  const filled = Math.round((clampScore(score) / 100) * segments);
  const style = getScoreStyle(score);
  return (
    <div
      className={`flex gap-[3px] ${style.text} ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 flex-1 -skew-x-[18deg] ${
            i < filled ? "bg-current shadow-[0_0_6px_currentColor]" : "bg-slate-800"
          }`}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

/** Mono system-log status. "processed" gets a pulsing indicator. */
export function StatusReadout({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}): React.JSX.Element {
  const s = getStatusStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase ${s.text} ${className}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {status === "processed" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {status}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Radar chart                                                                */
/* -------------------------------------------------------------------------- */

export type RadarAxis = { label: string; value: number };

/** Pure-SVG radar chart. Needs at least 3 axes; values are 0-100. */
export function RadarChart({
  axes,
  accent = "cyan",
}: {
  axes: RadarAxis[];
  accent?: Accent;
}): React.JSX.Element | null {
  if (axes.length < 3) return null;

  const cx = 160;
  const cy = 120;
  const radius = 72;
  const labelRadius = 90;
  const n = axes.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, level: number, r = radius) =>
    `${(cx + r * level * Math.cos(angle(i))).toFixed(2)},${(cy + r * level * Math.sin(angle(i))).toFixed(2)}`;
  const ring = (level: number) =>
    axes.map((_, i) => point(i, level)).join(" ");
  const shape = axes
    .map((axis, i) => point(i, clampScore(axis.value) / 100))
    .join(" ");

  const a = ACCENT[accent];
  const fill: Record<Accent, string> = {
    cyan: "fill-neon-cyan/15 stroke-neon-cyan",
    orange: "fill-neon-orange/15 stroke-neon-orange",
    plasma: "fill-neon-plasma/15 stroke-neon-plasma",
    slate: "fill-slate-400/15 stroke-slate-400",
  };

  return (
    <div className={a.text}>
      <svg
        viewBox="0 0 320 240"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Competency radar: ${axes.map((x) => `${x.label} ${x.value}`).join(", ")}`}
      >
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            points={ring(level)}
            fill="none"
            className="stroke-slate-800"
            strokeWidth={level === 1 ? 1.25 : 1}
          />
        ))}
        {axes.map((_, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={point(i, 1).split(",")[0]}
            y2={point(i, 1).split(",")[1]}
            className="stroke-slate-800"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={shape}
          strokeWidth="1.5"
          strokeLinejoin="round"
          className={`${fill[accent]} drop-shadow-[0_0_6px_currentColor]`}
        />
        {axes.map((axis, i) => {
          const [x, y] = point(i, clampScore(axis.value) / 100).split(",");
          return (
            <rect
              key={axis.label}
              x={Number(x) - 2}
              y={Number(y) - 2}
              width="4"
              height="4"
              fill="currentColor"
            />
          );
        })}
        {axes.map((axis, i) => {
          const cos = Math.cos(angle(i));
          const sin = Math.sin(angle(i));
          return (
            <text
              key={axis.label}
              x={cx + labelRadius * cos}
              y={cy + labelRadius * sin + 3 + sin * 4}
              textAnchor={cos > 0.2 ? "start" : cos < -0.2 ? "end" : "middle"}
              className="fill-slate-400 font-mono"
              fontSize="8.5"
              letterSpacing="0.8"
            >
              {axis.label.toUpperCase()}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard blocks                                                           */
/* -------------------------------------------------------------------------- */

/** Page heading: pulsing eyebrow, massive title, description, right-aligned actions. */
export function PipelineHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="space-y-4">
        <p className="flex items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.28em] text-neon-cyan uppercase">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-cyan" />
          </span>
          {eyebrow}
        </p>
        <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tighter text-white sm:text-7xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-xl text-base text-slate-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/** Single metric: mono label, big mono value, icon. */
export function StatTile({
  label,
  value,
  icon: Icon,
  accent = "cyan",
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: Accent;
}): React.JSX.Element {
  const a = ACCENT[accent];
  return (
    <Panel accent={accent} bodyClassName="flex items-center justify-between gap-4 p-5">
      <div className="space-y-2">
        <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-slate-400 uppercase">
          {label}
        </p>
        <p className="font-mono text-4xl font-semibold tracking-tight text-white tabular-nums">
          {value}
        </p>
      </div>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-sm border border-slate-800 bg-slate-950 ${a.text}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Landing blocks                                                             */
/* -------------------------------------------------------------------------- */

/**
 * "Server blade" feature card. A radial gradient fades in on hover (CSS only)
 * and the status LEDs along the bottom read like a rack unit.
 */
export function FeatureBlade({
  icon: Icon,
  title,
  description,
  specs = [],
  accent = "cyan",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  specs?: { label: string; value: string }[];
  accent?: Accent;
}): React.JSX.Element {
  const a = ACCENT[accent];
  return (
    <Panel accent={accent} bodyClassName="relative flex flex-col gap-5 p-6" className="h-full">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/panel:opacity-100 ${a.hover}`}
      />
      <div className="relative flex items-start justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-sm border border-slate-800 bg-slate-950 ${a.text}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className={`flex gap-1 ${a.text}`} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 w-3 bg-current ${i === 0 ? "animate-pulse motion-reduce:animate-none" : "opacity-30"}`}
            />
          ))}
        </span>
      </div>
      <div className="relative space-y-2">
        <h3 className="font-display text-xl font-semibold tracking-tight text-white">
          {title}
        </h3>
        <p className="text-sm leading-6 text-slate-400">{description}</p>
      </div>
      {specs.length > 0 && (
        <dl className="relative mt-auto divide-y divide-slate-800/80 border-t border-slate-800/80 font-mono text-[11px]">
          {specs.map((spec) => (
            <div key={spec.label} className="flex justify-between gap-4 py-2">
              <dt className="tracking-[0.14em] text-slate-400 uppercase">
                {spec.label}
              </dt>
              <dd className="text-slate-100">{spec.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Angled, glowing call-to-action                                             */
/* -------------------------------------------------------------------------- */

/** Class strings for chamfered buttons. Apply to <Button>, <a>, <Link>, etc. */
export const ctaPrimaryClass =
  "clip-chamfer h-10 cursor-pointer rounded-none border-0 bg-neon-cyan px-5 font-mono text-xs font-semibold tracking-[0.16em] text-black uppercase transition-colors hover:bg-white";
export const ctaSecondaryClass =
  "clip-chamfer h-10 cursor-pointer rounded-none border-0 bg-slate-800 px-5 font-mono text-xs font-semibold tracking-[0.16em] text-slate-100 uppercase transition-colors hover:bg-slate-700";

/**
 * Wrap a chamfered button so its glow is not cut off by its own clip-path:
 * clip-path clips the element's filters, so the drop-shadow lives on the wrapper.
 */
export function CtaFrame({
  children,
  tone = "cyan",
}: {
  children: React.ReactNode;
  tone?: "cyan" | "none";
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex transition-[filter] duration-200 ${
        tone === "cyan"
          ? "drop-shadow-[0_0_12px_rgb(34_229_255/0.4)] hover:drop-shadow-[0_0_20px_rgb(34_229_255/0.7)]"
          : ""
      }`}
    >
      {children}
    </span>
  );
}
