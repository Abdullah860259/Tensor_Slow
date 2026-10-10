import React from "react";
import { ExternalLink } from "lucide-react";

/** LinkedIn's "in" mark, drawn as text (lucide no longer ships brand icons). */
function InMark({ className = "" }: { className?: string }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[3px] bg-[#0A66C2] font-sans font-bold leading-none text-white ${className}`}
    >
      in
    </span>
  );
}

/**
 * Link to a candidate's LinkedIn profile, opening in a new tab.
 * `href` must already be a normalized linkedin.com/in/ URL (see normalizeLinkedinUrl).
 * "icon" fits inside table rows; "button" is the labelled version for page headers.
 */
export function LinkedInLink({
  href,
  name,
  variant = "icon",
}: {
  href: string;
  name: string;
  variant?: "icon" | "button";
}): React.JSX.Element {
  const label = `Open ${name}'s LinkedIn profile (opens in a new tab)`;

  if (variant === "button") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="group inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] pr-3.5 pl-2 text-xs font-medium text-zinc-200 shadow-xs transition-all hover:border-[#0A66C2]/60 hover:bg-[#0A66C2]/10 hover:text-white focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
      >
        <InMark className="h-4.5 w-4.5 text-[10px]" />
        LinkedIn profile
        <ExternalLink className="h-3 w-3 text-zinc-500 transition-colors group-hover:text-white" aria-hidden="true" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title="View LinkedIn profile"
      className="inline-flex rounded-[4px] opacity-80 transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
    >
      <InMark className="h-4 w-4 text-[9px]" />
    </a>
  );
}
