"use client";

import React, { useState } from "react";
import { ArrowRight, Sparkles, Shield, Database, Cpu, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";

export default function MarketingPage(): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartAnonymous = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authClient.signIn.anonymous();
      if (res && "error" in res && res.error) {
        setError(res.error.message || "Failed to start anonymous session.");
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start anonymous session.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Navigation Bar */}
      <header className="flex h-16 items-center justify-between border-b border-border px-6 md:px-12">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>AICON Starter</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartAnonymous}
          disabled={loading}
          className="cursor-pointer"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Instant Demo"}
        </Button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center max-w-4xl mx-auto">
        <Badge variant="secondary" className="mb-4 gap-1.5 py-1 px-3 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Production-Ready AI Spine</span>
        </Badge>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
          The App-Agnostic <span className="text-primary">AI Foundation</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Powered by Next.js 16, React 19, Vercel AI SDK v7, MongoDB Atlas Vector Search,
          and Better Auth. Built for rapid hackathon iteration and instant zero-friction demos.
        </p>

        {/* Clear Primary CTA */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={handleStartAnonymous}
            disabled={loading}
            className="h-12 px-8 text-base font-semibold shadow-md gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Starting Session...</span>
              </>
            ) : (
              <>
                <span>Launch Demo Anonymously</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <span className="text-xs text-muted-foreground">
            Zero sign-up required. Instant anonymous session for judges & testers.
          </span>

          {error && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Architectural Highlights */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Anonymous-First Auth</CardTitle>
              <CardDescription>
                Better Auth anonymous plugin enables judges and demo viewers to explore immediately
                with optional upgrade to permanent accounts.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Atlas Vector Search & RAG</CardTitle>
              <CardDescription>
                Unified MongoDB Atlas datastore with 768-dimensional Gemini embeddings and semantic
                vector retrieval with keyword fallback.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Cpu className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">AI SDK v7 Streaming & Tools</CardTitle>
              <CardDescription>
                Real-time streaming chat, structured data extraction, multi-step tool execution,
                and comprehensive run auditing.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        AICON Hackathon 2026 · App-Agnostic Starter Foundation
      </footer>
    </div>
  );
}

