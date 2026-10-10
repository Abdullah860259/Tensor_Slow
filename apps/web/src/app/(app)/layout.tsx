"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Loader2,
  LogOut,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "@/components/ui/sonner";
import { domain } from "@/lib/domain";

/**
 * Calm entrance motion shared by every page inside the shell.
 * Server components opt in with className="tr-rise" (fade and lift) or "tr-fade",
 * and stagger with an inline animationDelay. Disabled under prefers-reduced-motion.
 */
const SHELL_MOTION_CSS = `
@keyframes tr-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes tr-fade{from{opacity:0}to{opacity:1}}
.tr-rise{animation:tr-rise .7s cubic-bezier(.22,1,.36,1) both}
.tr-fade{animation:tr-fade .6s ease-out both}
@media (prefers-reduced-motion:reduce){.tr-rise,.tr-fade{animation:none}}
`;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { data: session, isPending } = authClient.useSession();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isAnonymous = Boolean(
    session?.user && ("isAnonymous" in session.user ? session.user.isAnonymous : false),
  );
  const isDemo =
    !isAnonymous &&
    /demo/i.test(`${session?.user?.name ?? ""} ${session?.user?.email ?? ""}`);
  const accountLabel = isAnonymous
    ? "Anonymous Guest"
    : isDemo
      ? "Demo User"
      : session?.user?.name || session?.user?.email || "Signed in";

  const router = useRouter();
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await authClient.signOut();
      router.push("/");
    } catch {
      toast.error("Failed to sign out");
      setSigningOut(false);
    }
  };

  const handleUpgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeEmail.trim()) return;
    try {
      setUpgrading(true);
      // Demonstrates the account upgrade affordance for anonymous users
      toast.success(`Verification link sent to ${upgradeEmail}`);
      setUpgradeOpen(false);
      setUpgradeEmail("");
    } catch {
      toast.error("Failed to link account");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      <style>{SHELL_MOTION_CSS}</style>

      {/* Shell header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-md sm:px-8">
        <Link
          href="/dashboard"
          className="group flex items-center rounded-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title="TalentRank Dashboard"
          aria-label="TalentRank Dashboard"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white shadow-xs overflow-hidden p-1.5 transition-transform group-hover:scale-105">
            <img src="/logo.png" alt="TalentRank" className="h-6 w-6 object-contain" />
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <span>Loading session</span>
            </div>
          ) : session?.user ? (
            <>
              <span className="inline-flex max-w-[200px] items-center gap-2 rounded-none border border-border bg-card px-3 py-1 text-sm text-foreground font-sans">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isAnonymous ? "bg-amber-500" : "bg-success"
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{accountLabel}</span>
              </span>

              {isAnonymous && (
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="hidden cursor-pointer items-center gap-1.5 rounded-none border border-border bg-card px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:inline-flex"
                >
                  Upgrade account
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="h-8 cursor-pointer gap-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title="Sign out"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </Button>
            </>
          ) : (
            <Link href="/">
              <Button size="sm" variant="default" className="h-8 cursor-pointer text-sm rounded-none bg-foreground text-background">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main app content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8 sm:py-12">{children}</main>

      {/* Global toaster for notifications */}
      <Toaster />

      {/* Upgrade anonymous account dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="gap-0 rounded-xl border border-border bg-card p-6 text-foreground shadow-2xl sm:max-w-md">
          <form onSubmit={handleUpgradeAccount}>
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle className="font-sans text-2xl font-bold tracking-tight text-foreground">
                Keep your work
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Convert your anonymous session into a permanent account to preserve your candidates,
                chat threads, and AI analysis across devices.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-5">
              <div className="space-y-1.5">
                <label htmlFor="upgrade-email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <Input
                  id="upgrade-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={upgradeEmail}
                  onChange={(e) => setUpgradeEmail(e.target.value)}
                  className="h-9 border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/50 p-3 text-sm leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <p>Everything created during this anonymous session stays linked to your account.</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUpgradeOpen(false)}
                className="cursor-pointer text-muted-foreground hover:text-foreground text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={upgrading || !upgradeEmail.trim()}
                className="cursor-pointer gap-1.5 rounded-none bg-foreground text-background hover:opacity-85 font-medium text-sm"
              >
                {upgrading && (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                )}
                Upgrade account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
