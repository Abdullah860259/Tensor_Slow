"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  MoreVertical,
  RotateCcw,
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
import { toast } from "sonner";

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
};

const FIT_LABELS = new Set(["Strong Fit", "Potential", "Unqualified"]);

function RankBadge({ rank }: { rank: number }): React.JSX.Element {
  if (rank === 1) {
    return (
      <span
        title="Rank 1 · Top Match"
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-amber-500/35 bg-gradient-to-b from-amber-500/20 to-amber-500/5 px-2 font-mono text-xs font-semibold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        title="Rank 2"
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-300/35 bg-gradient-to-b from-slate-300/20 to-slate-400/5 px-2 font-mono text-xs font-semibold text-slate-200"
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        title="Rank 3"
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-amber-700/35 bg-gradient-to-b from-amber-700/20 to-amber-800/5 px-2 font-mono text-xs font-semibold text-amber-500"
      >
        3
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center px-1.5 font-mono text-xs text-zinc-500 tabular-nums">
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

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    candidate: LeaderboardCandidate;
  } | null>(null);

  // Active dropdown menu state (for 3-dots button)
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Active rescoring candidates
  const [rescoringIds, setRescoringIds] = useState<Set<string>>(new Set());

  // Delete candidate confirmation dialog
  const [deleteCandidate, setDeleteCandidate] = useState<LeaderboardCandidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClose = () => {
      setContextMenu(null);
      setActiveDropdownId(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setActiveDropdownId(null);
      }
    };
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleReevaluate = async (candidate: LeaderboardCandidate) => {
    setContextMenu(null);
    setActiveDropdownId(null);
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

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs text-zinc-500">
                <th scope="col" className="w-20 px-4 py-3 font-medium">
                  Rank
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Candidate &amp; role
                </th>
                <th scope="col" className="w-52 px-2 py-3 font-medium">
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
              {ranked.map((candidate, index) => {
                const isRescoring = rescoringIds.has(candidate.id);
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
                    className={`tr-fade border-b border-border/70 transition-colors last:border-b-0 hover:bg-white/[0.025] select-none ${
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/items/${candidate.id}`}
                            className="truncate text-sm font-semibold text-white transition-colors hover:text-blue-400 hover:underline hover:underline-offset-4 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {candidate.title}
                          </Link>
                          {isRescoring ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-300">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              Re-evaluating...
                            </span>
                          ) : candidate.status === "pending" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-300">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              Evaluating...
                            </span>
                          ) : candidate.status !== "processed" ? (
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-[10px] font-medium ${status.text}`}
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
                    </td>

                    <td className="px-2 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isRescoring ? "bg-amber-400 animate-pulse" : hasScore ? scoreStyle.bar : "bg-transparent"
                            }`}
                            style={{ width: `${Math.max(hasScore ? 4 : 0, clampScore(candidate.score))}%` }}
                          />
                        </div>
                        <span
                          className={`w-10 font-mono text-xs font-semibold tabular-nums ${
                            isRescoring ? "text-amber-400" : scoreStyle.text
                          }`}
                        >
                          {isRescoring ? "..." : hasScore ? `${Math.round(candidate.score as number)}%` : "--"}
                        </span>
                      </div>
                    </td>

                    <td className="px-2 py-3.5 align-middle font-mono text-sm text-zinc-200 tabular-nums">
                      {candidate.yearsOfExperience === undefined
                        ? "--"
                        : `${formatYears(candidate.yearsOfExperience)} yrs`}
                    </td>

                    <td className="px-2 py-3.5 align-middle">
                      <FitBadge score={candidate.score} />
                    </td>

                    <td className="px-2 py-3.5 align-middle">
                      {tags.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded border border-border bg-well px-1.5 py-0.5 font-mono text-[10px] text-zinc-300"
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 && (
                            <span className="self-center font-mono text-[10px] text-zinc-500">
                              +{tags.length - 3}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-zinc-700">--</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/items/${candidate.id}`}
                          aria-label={`Inspect profile: ${candidate.title}`}
                          className="group inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-card/60 px-3 text-xs font-medium text-zinc-200 transition-all hover:border-zinc-500 hover:bg-secondary hover:text-white focus-visible:ring-1 focus-visible:ring-ring whitespace-nowrap"
                        >
                          <span>Inspect</span>
                          <ArrowRight
                            className="h-3 w-3 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                            aria-hidden="true"
                          />
                        </Link>

                        {/* More actions menu button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === candidate.id ? null : candidate.id);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-card/60 text-zinc-400 hover:border-zinc-500 hover:bg-secondary hover:text-white transition-colors cursor-pointer"
                            title="More options (or right-click row)"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          {activeDropdownId === candidate.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-9 z-40 w-48 rounded-lg border border-border bg-[#11141a] p-1.5 shadow-2xl text-left"
                            >
                              <button
                                type="button"
                                onClick={() => handleReevaluate(candidate)}
                                disabled={isRescoring}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Re-evaluate criteria</span>
                              </button>
                              <Link
                                href={`/items/${candidate.id}`}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                                <span>Inspect dossier</span>
                              </Link>
                              <div className="my-1 border-t border-border/80" />
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setDeleteCandidate(candidate);
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete candidate</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-52 rounded-xl border border-border bg-[#11141a] p-1.5 text-left text-white shadow-2xl animate-in fade-in-0 zoom-in-95 backdrop-blur-md"
        >
          <div className="px-2.5 py-1.5 border-b border-border/70 mb-1">
            <p className="truncate text-xs font-semibold text-white">{contextMenu.candidate.title}</p>
            <p className="text-[10px] text-zinc-500 font-mono">Right-click actions</p>
          </div>

          <button
            type="button"
            onClick={() => handleReevaluate(contextMenu.candidate)}
            disabled={rescoringIds.has(contextMenu.candidate.id)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
            <span>Re-evaluate against criteria</span>
          </button>

          <Link
            href={`/items/${contextMenu.candidate.id}`}
            onClick={() => setContextMenu(null)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
            <span>Inspect full dossier</span>
          </Link>

          <div className="my-1 border-t border-border/70" />

          <button
            type="button"
            onClick={() => {
              const cand = contextMenu.candidate;
              setContextMenu(null);
              setDeleteCandidate(cand);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>Delete candidate</span>
          </button>
        </div>
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
