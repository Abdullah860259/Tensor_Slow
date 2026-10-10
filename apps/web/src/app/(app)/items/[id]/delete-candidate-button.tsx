"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

export function DeleteCandidateButton({
  candidateId,
  candidateName,
}: {
  candidateId: string;
  candidateName: string;
}): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/items?id=${encodeURIComponent(candidateId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete candidate.");
      }

      toast.success(data?.message || "Candidate profile deleted successfully.");
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete candidate.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 cursor-pointer gap-2 rounded-none border border-border bg-card text-sm font-medium text-muted-foreground hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
        title={`Delete ${candidateName}`}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" aria-hidden="true" />
        <span>Delete profile</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border border-border bg-card text-foreground shadow-2xl">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-none border border-destructive/30 bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <DialogTitle className="font-sans text-xl font-bold tracking-tight text-foreground">
              Delete Candidate Dossier?
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">{candidateName}</span>?
              All extracted evidence, match score benchmarks, screening questions, and evaluation notes will be
              permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
              className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer gap-2 rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium px-4 h-9 shadow-xs"
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
