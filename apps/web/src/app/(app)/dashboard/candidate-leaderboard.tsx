"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MoreVertical,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { clampScore, formatYears, getScoreStyle, getStatusStyle } from "@/lib/candidate-ui";
import { FitBadge } from "@/components/ui/foundry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

export type LeaderboardCandidate = {
  id: string;
  title: string;
  headline?: string;
  summary?: string;
  score?: number;
  status: string;
  category?: string;
  aiTags?: string[];
  yearsOfExperience?: number;
  starred?: boolean;
};

const FIT_LABELS = new Set(["Strong Fit", "Potential", "Unqualified"]);

function getInitials(name: string): string {
  const clean = name.replace(/\s+-\s+LinkedIn Profile$/i, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || "C";
}

function RankBadge({ rank }: { rank: number }): React.JSX.Element {
  if (rank === 1) {
    return (
      <span
        title="Rank 1 · Top Match"
        className="inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 font-sans text-[11px] font-semibold text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.12)]"
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        title="Rank 2"
        className="inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full border border-slate-300/25 bg-slate-300/10 px-1.5 font-sans text-[11px] font-semibold text-slate-200"
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        title="Rank 3"
        className="inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full border border-amber-700/30 bg-amber-700/15 px-1.5 font-sans text-[11px] font-semibold text-amber-400/90"
      >
        3
      </span>
    );
  }
  return (
    <span className="inline-flex h-5.5 min-w-5.5 items-center justify-center px-1 font-sans text-[11px] font-medium text-zinc-500 tabular-nums">
      {rank}
    </span>
  );
}

export function CandidateLeaderboard({
  candidates,
}: {
  candidates: LeaderboardCandidate[];
}): React.JSX.Element {
  const router = useRouter();
  const ranked = [...candidates].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    candidate: LeaderboardCandidate;
  } | null>(null);

  // Active dropdown menu state (for 3-dots button with viewport positioning)
  const [activeDropdown, setActiveDropdown] = useState<{
    id: string;
    top: number;
    left: number;
    candidate: LeaderboardCandidate;
  } | null>(null);

  // Active rescoring candidates
  const [rescoringIds, setRescoringIds] = useState<Set<string>>(new Set());

  // Starred candidates: seeded from the server, updated optimistically, persisted via /api/stars
  const serverStarredKey = candidates
    .filter((c) => c.starred)
    .map((c) => c.id)
    .join(",");
  const [starredIds, setStarredIds] = useState<Set<string>>(
    () => new Set(serverStarredKey ? serverStarredKey.split(",") : []),
  );
  const [starPendingIds, setStarPendingIds] = useState<Set<string>>(new Set());

  // Re-sync after router.refresh() delivers fresh server state
  useEffect(() => {
    setStarredIds(new Set(serverStarredKey ? serverStarredKey.split(",") : []));
  }, [serverStarredKey]);

  const setStarLocally = (id: string, starred: boolean) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (starred) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleStar = async (candidate: LeaderboardCandidate) => {
    const { id } = candidate;
    if (starPendingIds.has(id)) return;
    const nextStarred = !starredIds.has(id);

    setStarLocally(id, nextStarred);
    setStarPendingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/stars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id, starred: nextStarred }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update star.");
      }
    } catch (err) {
      setStarLocally(id, !nextStarred);
      toast.error(err instanceof Error ? err.message : "Failed to update star.");
    } finally {
      setStarPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Declared before the empty-state early return so the hook order never changes between renders
  const [fitFilter, setFitFilter] = useState<"all" | "starred" | "strong" | "potential" | "unqualified">("all");

  // Delete candidate confirmation dialog
  const [deleteCandidate, setDeleteCandidate] = useState<LeaderboardCandidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClose = () => {
      setContextMenu(null);
      setActiveDropdown(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setActiveDropdown(null);
      }
    };
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleReevaluate = async (candidate: LeaderboardCandidate) => {
    setContextMenu(null);
    setActiveDropdown(null);
    setRescoringIds((prev) => new Set(prev).add(candidate.id));
    toast.info(`Re-evaluating ${candidate.title}...`);

    try {
      const res = await fetch("/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rescore_item", itemId: candidate.id }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to re-evaluate candidate.");
      }

      toast.success(`${candidate.title} re-evaluated successfully!`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to re-evaluate.");
    } finally {
      setRescoringIds((prev) => {
        const next = new Set(prev);
        next.delete(candidate.id);
        return next;
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/items?id=${encodeURIComponent(deleteCandidate.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete candidate.");
      }

      toast.success("Candidate deleted successfully.");
      setDeleteCandidate(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete candidate.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (ranked.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-14 text-center">
        <p className="font-serif text-xl font-normal tracking-tight text-white">No candidates yet</p>
        <p className="mt-1.5 text-sm text-zinc-400">
          Import a profile or resume to score your first candidate.
        </p>
      </div>
    );
  }

  const starredCount = ranked.filter((c) => starredIds.has(c.id)).length;
  const strongCount = ranked.filter((c) => (c.score ?? 0) >= 80).length;
  const potentialCount = ranked.filter((c) => (c.score ?? 0) >= 60 && (c.score ?? 0) < 80).length;
  const unqualifiedCount = ranked.filter((c) => (c.score ?? 0) < 60).length;

  const displayedCandidates = ranked.filter((c) => {
    if (fitFilter === "starred") return starredIds.has(c.id);
    if (fitFilter === "strong") return (c.score ?? 0) >= 80;
    if (fitFilter === "potential") return (c.score ?? 0) >= 60 && (c.score ?? 0) < 80;
    if (fitFilter === "unqualified") return (c.score ?? 0) < 60;
    return true;
  });

  return (
    <>
      {/* Segmented Filter Pills & Candidate Count Toolbar (Stitch / Linear / Apple Design) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
          <button
            type="button"
            onClick={() => setFitFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer ${
              fitFilter === "all"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            All Candidates <span className="opacity-70 tabular-nums">({ranked.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFitFilter("starred")}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer ${
              fitFilter === "starred"
                ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Star className={`h-3 w-3 ${fitFilter === "starred" ? "fill-current" : ""}`} aria-hidden="true" />
            Starred <span className="opacity-70 tabular-nums">({starredCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFitFilter("strong")}
            className={`px-3 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer ${
              fitFilter === "strong"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Strong Fit <span className="opacity-70 tabular-nums">({strongCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFitFilter("potential")}
            className={`px-3 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer ${
              fitFilter === "potential"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Potential <span className="opacity-70 tabular-nums">({potentialCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFitFilter("unqualified")}
            className={`px-3 py-1 rounded-full text-xs font-sans font-medium transition-all cursor-pointer ${
              fitFilter === "unqualified"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Unqualified <span className="opacity-70 tabular-nums">({unqualifiedCount})</span>
          </button>
        </div>

        <span className="text-xs font-sans text-zinc-400">
          Showing <span className="font-medium text-white">{displayedCandidates.length}</span> of {ranked.length} candidates
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/80 text-xs font-sans text-zinc-400">
                <th scope="col" className="w-20 px-4 py-3 font-medium">
                  Rank
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Candidate &amp; role
                </th>
                <th scope="col" className="w-48 px-2 py-3 font-medium">
                  Match score
                </th>
                <th scope="col" className="w-28 px-2 py-3 font-medium">
                  Experience
                </th>
                <th scope="col" className="w-28 px-2 py-3 font-medium">
                  Fit
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Signals
                </th>
                <th scope="col" className="w-36 px-4 py-3 text-right font-medium whitespace-nowrap">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedCandidates.map((candidate, index) => {
                const isRescoring = rescoringIds.has(candidate.id);
                const isStarred = starredIds.has(candidate.id);
                const hasScore = typeof candidate.score === "number";
                const scoreStyle = getScoreStyle(candidate.score);
                const status = getStatusStyle(candidate.status);
                const tags = candidate.aiTags ?? [];
                const displaySummary =
                  candidate.summary ||
                  candidate.headline ||
                  (candidate.category && !FIT_LABELS.has(candidate.category)
                    ? candidate.category
                    : "");

                return (
                  <tr
                    key={candidate.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: Math.min(e.clientX, window.innerWidth - 220),
                        y: Math.min(e.clientY, window.innerHeight - 180),
                        candidate,
                      });
                    }}
                    style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                    className={`tr-fade border-b border-white/[0.05] transition-colors last:border-b-0 hover:bg-white/[0.03] select-none ${
                      isRescoring ? "bg-amber-500/[0.04]" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-2">
                        <RankBadge rank={index + 1} />
                        {isRescoring ? (
                          <Loader2 className="h-3 w-3 animate-spin text-amber-400" aria-label="Re-evaluating" />
                        ) : candidate.status !== "processed" ? (
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
                            title={status.label}
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                    </td>

                    <td className="max-w-[360px] px-2 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-sans font-medium text-zinc-300 shadow-xs">
                          {getInitials(candidate.title)}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/items/${candidate.id}`}
                              className="truncate text-sm font-semibold text-white transition-colors hover:text-blue-400 hover:underline hover:underline-offset-4 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                            >
                              {candidate.title}
                            </Link>
                            {hasScore && candidate.score! >= 80 && (
                              <span title="Strong Fit (80%+)">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                              </span>
                            )}
                            {isRescoring ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-sans text-[11px] font-medium text-amber-300">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                Re-evaluating...
                              </span>
                            ) : candidate.status === "pending" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-sans text-[11px] font-medium text-amber-300">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                Evaluating...
                              </span>
                            ) : candidate.status !== "processed" ? (
                              <span
                                className={`inline-flex items-center gap-1 font-sans text-[11px] font-medium ${status.text}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                                {status.label}
                              </span>
                            ) : null}
                          </div>
                          {displaySummary && (
                            <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400 font-normal">
                              {displaySummary}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-2 py-3.5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-6 w-6 shrink-0">
                          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-zinc-800"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                            />
                            {hasScore && (
                              <path
                                className={
                                  candidate.score! >= 80
                                    ? "text-emerald-400"
                                    : candidate.score! >= 60
                                      ? "text-amber-400"
                                      : "text-rose-400"
                                }
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeDasharray={`${clampScore(candidate.score)}, 100`}
                                strokeLinecap="round"
                                strokeWidth="3.5"
                              />
                            )}
                          </svg>
                        </div>
                        <span
                          className={`font-sans text-xs font-semibold tabular-nums ${
                            isRescoring ? "text-amber-400" : scoreStyle.text
                          }`}
                        >
                          {isRescoring ? "..." : hasScore ? `${Math.round(candidate.score as number)}%` : "--"}
                        </span>
                      </div>
                    </td>

                    <td className="px-2 py-3.5 align-middle">
                      {candidate.yearsOfExperience === undefined ? (
                        <span className="text-xs text-zinc-600">--</span>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="font-semibold text-zinc-100 text-[13px] tracking-tight tabular-nums">
                            {formatYears(candidate.yearsOfExperience)}
                          </span>
                          <span className="text-[11px] font-medium text-zinc-500">yrs</span>
                        </div>
                      )}
                    </td>

                    <td className="px-2 py-3.5 align-middle">
                      <FitBadge score={candidate.score} />
                    </td>

                    <td className="px-2 py-3.5 align-middle">
                      {tags.length > 0 ? (
                        <span className="flex flex-wrap gap-1.5">
                          {tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-md border border-zinc-800/80 bg-zinc-850/40 px-2 py-0.5 text-[11px] font-sans font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 && (
                            <span className="self-center px-1 text-[11px] font-sans font-medium text-zinc-500">
                              +{tags.length - 3}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">--</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleStar(candidate)}
                          disabled={starPendingIds.has(candidate.id)}
                          aria-pressed={isStarred}
                          aria-label={`${isStarred ? "Unstar" : "Star"} ${candidate.title}`}
                          title={isStarred ? "Unstar candidate" : "Star candidate"}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-wait ${
                            isStarred
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.12)] hover:bg-amber-400/15"
                              : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                          }`}
                        >
                          <Star
                            className={`h-3.5 w-3.5 transition-transform motion-safe:active:scale-90 ${isStarred ? "fill-current" : ""}`}
                            aria-hidden="true"
                          />
                        </button>

                        <Link
                          href={`/items/${candidate.id}`}
                          aria-label={`Inspect profile: ${candidate.title}`}
                          className="group inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-[12px] font-sans font-medium text-zinc-200 shadow-xs transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:ring-1 focus-visible:ring-ring whitespace-nowrap"
                        >
                          <span>Inspect</span>
                          <ArrowRight
                            className="h-3 w-3 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                            aria-hidden="true"
                          />
                        </Link>

                        {/* More actions menu button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeDropdown?.id === candidate.id) {
                              setActiveDropdown(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              // Dropdown is 192px (w-48) wide. Align right edge of menu with right edge of button:
                              const menuWidth = 192;
                              const left = Math.max(12, rect.right - menuWidth);
                              const top = rect.bottom + 6;
                              setActiveDropdown({
                                id: candidate.id,
                                top,
                                left,
                                candidate,
                              });
                            }
                          }}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all cursor-pointer ${
                            activeDropdown?.id === candidate.id
                              ? "border-white/25 bg-white/[0.12] text-white shadow-xs"
                              : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                          }`}
                          title="More options (or right-click row)"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Dropdown Menu (Portalled to document.body to eliminate containing block & stacking issues) */}
      {mounted &&
        activeDropdown &&
        createPortal(
          <div
            style={{ top: `${activeDropdown.top}px`, left: `${activeDropdown.left}px` }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-48 rounded-xl border border-white/10 bg-zinc-900/90 p-1.5 text-left text-white shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
          >
            <button
              type="button"
              onClick={() => {
                const cand = activeDropdown.candidate;
                setActiveDropdown(null);
                void toggleStar(cand);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-sans text-zinc-200 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
            >
              <Star
                className={`h-3.5 w-3.5 text-amber-300 ${starredIds.has(activeDropdown.candidate.id) ? "fill-current" : ""}`}
              />
              <span>{starredIds.has(activeDropdown.candidate.id) ? "Unstar candidate" : "Star candidate"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleReevaluate(activeDropdown.candidate)}
              disabled={rescoringIds.has(activeDropdown.candidate.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-sans text-zinc-200 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
              <span>Re-evaluate criteria</span>
            </button>
            <Link
              href={`/items/${activeDropdown.candidate.id}`}
              onClick={() => setActiveDropdown(null)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-sans text-zinc-200 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
              <span>Inspect dossier</span>
            </Link>
            <div className="my-1 border-t border-white/10" />
            <button
              type="button"
              onClick={() => {
                const toDelete = activeDropdown.candidate;
                setActiveDropdown(null);
                setDeleteCandidate(toDelete);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-sans text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete candidate</span>
            </button>
          </div>,
          document.body
        )}

      {/* Floating Right-Click Context Menu (Portalled to document.body) */}
      {mounted &&
        contextMenu &&
        createPortal(
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-52 rounded-xl border border-white/10 bg-zinc-900/90 p-1.5 text-left text-white shadow-[0_16px_36px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
          >
            <div className="px-2.5 py-1.5 border-b border-white/10 mb-1">
              <p className="truncate text-xs font-semibold text-white">{contextMenu.candidate.title}</p>
              <p className="text-[10px] text-zinc-500 font-sans">Quick actions</p>
            </div>

            <button
              type="button"
              onClick={() => {
                const cand = contextMenu.candidate;
                setContextMenu(null);
                void toggleStar(cand);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-sans text-zinc-200 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
            >
              <Star
                className={`h-3.5 w-3.5 text-amber-300 ${starredIds.has(contextMenu.candidate.id) ? "fill-current" : ""}`}
              />
              <span>{starredIds.has(contextMenu.candidate.id) ? "Unstar candidate" : "Star candidate"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleReevaluate(contextMenu.candidate)}
              disabled={rescoringIds.has(contextMenu.candidate.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-sans text-zinc-200 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
              <span>Re-evaluate criteria</span>
            </button>

            <Link
              href={`/items/${contextMenu.candidate.id}`}
              onClick={() => setContextMenu(null)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-sans text-zinc-200 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
              <span>Inspect full dossier</span>
            </Link>

            <div className="my-1 border-t border-white/10" />

            <button
              type="button"
              onClick={() => {
                const cand = contextMenu.candidate;
                setContextMenu(null);
                setDeleteCandidate(cand);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-sans text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              <span>Delete candidate</span>
            </button>
          </div>,
          document.body
        )}

      {/* Delete confirmation dialog for leaderboard */}
      <Dialog open={Boolean(deleteCandidate)} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <DialogContent className="max-w-md border border-border bg-[#11141a] text-white shadow-2xl">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <DialogTitle className="font-serif text-xl font-normal tracking-tight text-white">
              Delete Candidate Dossier?
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-zinc-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-white">{deleteCandidate?.title}</span>? All match scores,
              extracted evidence, screening questions, and evaluation notes will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteCandidate(null)}
              disabled={isDeleting}
              className="cursor-pointer text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="cursor-pointer gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 h-9 shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Deleting candidate...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Permanently delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
