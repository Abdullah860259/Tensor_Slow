"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

/**
 * Re-runs scoring against the active job criteria.
 * Uses the existing /api/criteria "rescore_all" action, because no per-candidate
 * evaluation route was provided. If you add one, change the request below.
 */
export function ReevaluateButton({ itemId }: { itemId?: string }): React.JSX.Element {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);

  const run = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          itemId ? { action: "rescore_item", itemId } : { action: "rescore_all" }
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to re-evaluate.");

      toast.success(data?.message || "Re-evaluated against the active criteria.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to re-evaluate.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={run}
      disabled={isRunning}
      title="Re-scores this candidate against the active job criteria"
      className={`h-9 cursor-pointer gap-2 text-sm font-medium rounded-none border transition-all ${
        isRunning
          ? "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/40 animate-pulse"
          : "border-border bg-card text-foreground hover:border-foreground hover:bg-secondary"
      }`}
    >
      {isRunning ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600 dark:text-amber-400" aria-hidden="true" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      )}
      {isRunning ? "Re-evaluating candidate..." : "Re-evaluate"}
    </Button>
  );
}
