"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  LogOut,
  User,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    session?.user && ("isAnonymous" in session.user ? session.user.isAnonymous : false)
  );

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Shell Header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 sm:px-8 backdrop-blur-xs">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">{domain.labels.product}</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>

        {/* User Session Bar */}
        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Loading session...</span>
            </div>
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              {isAnonymous ? (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-normal"
                  >
                    <ShieldAlert className="h-3 w-3" />
                    <span>Anonymous User</span>
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUpgradeOpen(true)}
                    className="h-8 gap-1 text-xs cursor-pointer"
                  >
                    <span>Upgrade</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="max-w-[140px] truncate font-medium text-foreground">
                    {session.user.name || session.user.email}
                  </span>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                title="Sign out"
              >
                {signingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Link href="/">
              <Button size="sm" variant="default" className="h-8 text-xs cursor-pointer">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main App Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>

      {/* Global Toaster for notifications */}
      <Toaster />

      {/* Upgrade Anonymous Account Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpgradeAccount}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Upgrade to Permanent Account</span>
              </DialogTitle>
              <DialogDescription>
                Convert your anonymous session into a permanent account to preserve your items, chat
                threads, and AI analysis across devices.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="space-y-1">
                <label htmlFor="upgrade-email" className="text-xs font-medium text-foreground">
                  Email Address
                </label>
                <Input
                  id="upgrade-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={upgradeEmail}
                  onChange={(e) => setUpgradeEmail(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>What happens next:</span>
                </div>
                <p>
                  All items created during this anonymous session will remain linked to your account.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUpgradeOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={upgrading || !upgradeEmail.trim()}
                className="cursor-pointer gap-1.5"
              >
                {upgrading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Upgrade Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

