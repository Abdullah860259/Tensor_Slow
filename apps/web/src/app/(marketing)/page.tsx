"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Shield,
  Database,
  Cpu,
  Loader2,
  AlertCircle,
  User,
  Target,
  SlidersHorizontal,
  Bot,
  Zap,
  CheckCircle2,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Terminal,
  ShieldCheck,
  Scale,
  Compass,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { domain } from "@/lib/domain";
import { InteractiveSimulator } from "@/components/marketing/interactive-simulator";

export default function MarketingPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
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
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start anonymous session.");
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setDemoLoading(true);
      setError(null);
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to sign in as demo user.");
        setDemoLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in as demo user.");
      setDemoLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#09090b] text-[#fafafa] selection:bg-blue-500/30">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-800/80 bg-[#09090b]/80 px-4 backdrop-blur-md sm:px-8 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-[#11141a]">
            <Compass className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <span className="font-mono text-sm font-bold tracking-wider text-white">
              TALENTRANK<span className="text-emerald-400"> // </span>AI
            </span>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 font-mono text-[11px] text-emerald-300 md:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span>OPERATIONAL · FOUNDRY CORE</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDemoLogin}
            disabled={demoLoading || loading}
            className="h-8 cursor-pointer border-zinc-800 bg-zinc-900/80 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            {demoLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <User className="h-3.5 w-3.5 text-zinc-400" />
            )}
            <span className="hidden sm:inline">Demo Account</span>
          </Button>

          <Button
            size="sm"
            onClick={handleStartAnonymous}
            disabled={loading || demoLoading}
            className="h-8 cursor-pointer gap-1.5 bg-zinc-100 text-xs font-semibold text-zinc-950 shadow-sm transition-transform hover:scale-[1.02] hover:bg-white active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <span>Instant Demo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="max-w-4xl text-center">
          {/* Kicker Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#11141a] px-3.5 py-1 text-xs font-mono text-zinc-300 shadow-inner">
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <span>DEFENSE-GRADE CANDIDATE INTELLIGENCE & MATCHING</span>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
            Autonomous Candidate Ranking &amp; Evidence-Grounded Scoring
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Evaluate engineering talent against deterministic, custom job criteria. Ingest LinkedIn
            profiles and PDF resumes, detect disqualifying red flags, and query candidate dossiers
            with MongoDB Atlas Vector RAG.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={handleStartAnonymous}
              disabled={loading || demoLoading}
              className="h-11 cursor-pointer gap-2 bg-white px-7 text-sm font-semibold text-zinc-950 shadow-lg transition-transform hover:scale-[1.02] hover:bg-zinc-100 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting Anonymous Session...</span>
                </>
              ) : (
                <>
                  <span>Launch Live Evaluation Demo</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleDemoLogin}
              disabled={demoLoading || loading}
              className="h-11 cursor-pointer gap-2 border-zinc-800 bg-zinc-900/80 px-6 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4 text-zinc-400" />
                  <span>Sign In with Demo Account</span>
                </>
              )}
            </Button>
          </div>

          <p className="mt-3 text-xs text-zinc-500 font-mono">
            Zero sign-up required · 1-click ephemeral sandbox · MongoDB Atlas &amp; Gemini 2.5/3.0
          </p>

          {error && (
            <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-md border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Interactive Simulator Console Section */}
        <section aria-label="Interactive Product Console" className="mt-12 w-full max-w-5xl">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span className="font-mono text-xs font-semibold text-zinc-300">
                LIVE INTERACTIVE SIMULATION CONSOLE
              </span>
            </div>
            <span className="font-mono text-[11px] text-zinc-500">
              CLICK TABS &amp; FILTERS TO EXPLORE
            </span>
          </div>

          <InteractiveSimulator onLaunchDemo={handleStartAnonymous} />
        </section>

        {/* Telemetry / Metrics Strip */}
        <section
          aria-label="System Metrics"
          className="mt-16 grid w-full max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-4"
        >
          <div className="bg-[#11141a] p-4 text-left">
            <span className="font-mono text-[11px] text-zinc-500">01 / INGESTION</span>
            <div className="mt-1 font-mono text-2xl font-bold text-white">&lt; 850ms</div>
            <p className="mt-1 text-xs text-zinc-400">PDF &amp; LinkedIn profile parsing latency</p>
          </div>

          <div className="bg-[#11141a] p-4 text-left">
            <span className="font-mono text-[11px] text-zinc-500">02 / EMBEDDINGS</span>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">768-D</div>
            <p className="mt-1 text-xs text-zinc-400">Gemini vectors in MongoDB Atlas</p>
          </div>

          <div className="bg-[#11141a] p-4 text-left">
            <span className="font-mono text-[11px] text-zinc-500">03 / CRITERIA</span>
            <div className="mt-1 font-mono text-2xl font-bold text-white">100%</div>
            <p className="mt-1 text-xs text-zinc-400">Deterministic scoring &amp; red-flag audit</p>
          </div>

          <div className="bg-[#11141a] p-4 text-left">
            <span className="font-mono text-[11px] text-zinc-500">04 / QUALITY</span>
            <div className="mt-1 font-mono text-2xl font-bold text-blue-400">33 / 33</div>
            <p className="mt-1 text-xs text-zinc-400">Automated test suites passing</p>
          </div>
        </section>

        {/* Architectural Pillars / Features Grid */}
        <section aria-labelledby="architecture-heading" className="mt-20 w-full max-w-5xl text-left">
          <div className="mb-6">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-emerald-400">
              <Zap className="h-3.5 w-3.5" />
              <span>CORE ARCHITECTURAL PILLARS</span>
            </div>
            <h2 id="architecture-heading" className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Engineered for High-Confidence Engineering Hiring
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Traditional ATS software searches for static keywords. TalentRank AI analyzes career
              trajectory, architectural contributions, and role alignment.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Pillar 1 */}
            <div className="rounded-lg border border-zinc-800 bg-[#11141a] p-6 transition-all hover:border-zinc-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                Dynamic Job Criteria &amp; Rubric Synthesizer
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Provide rough job notes or technical bullet points. Our AI engine compiles them into
                structured Must-Haves, Nice-to-Haves, and explicit Red Flags. Re-score your entire
                candidate pipeline with one click when requirements shift.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[11px] text-zinc-400">
                <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5">
                  1-Click Batch Rescore
                </span>
                <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5">
                  Rubric Prompt Inspector
                </span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-lg border border-zinc-800 bg-[#11141a] p-6 transition-all hover:border-zinc-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-500/30 bg-blue-950/40 text-blue-400">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                Atlas Vector Search &amp; Grounded RAG Copilot
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Every candidate profile is split, vectorized into 768 dimensions using Google
                Gemini, and indexed in MongoDB Atlas. Recruiter chat queries are answered with exact
                provenance citations to specific resume lines and timestamps.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[11px] text-zinc-400">
                <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5">
                  Cosine Similarity HNSW
                </span>
                <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5">
                  BM25 Keyword Fallback
                </span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-lg border border-zinc-800 bg-[#11141a] p-6 transition-all hover:border-zinc-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-amber-500/30 bg-amber-950/40 text-amber-400">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                Tri-Modal Ingestion Engine
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Ingest candidates through three friction-free channels: scrape LinkedIn profiles
                via URL, drag-and-drop raw PDF resumes with binary text extraction, or paste
                clipboard summaries. Automated validation ensures zero malformed records.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[11px] text-zinc-400">
                <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5">
                  PDF Binary Parsing
                </span>
                <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5">
                  Direct LinkedIn Scraping
                </span>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="rounded-lg border border-zinc-800 bg-[#11141a] p-6 transition-all hover:border-zinc-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-rose-500/30 bg-rose-950/40 text-rose-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                Defensive Audit &amp; Red-Flag Detection
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Identify unexplained employment gaps, exaggerated titles, and missing baseline
                qualifications automatically. The system delivers a transparent hiring verdict:
                Strong Fit, Potential, or Unqualified.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[11px] text-zinc-400">
                <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5">
                  Anti-Hallucination Guardrails
                </span>
                <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5">
                  Screening Question Generator
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Matrix: Legacy ATS vs TalentRank AI */}
        <section aria-labelledby="comparison-heading" className="mt-20 w-full max-w-5xl text-left">
          <div className="mb-6">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-blue-400">
              <Scale className="h-3.5 w-3.5" />
              <span>SYSTEM COMPARISON MATRIX</span>
            </div>
            <h2 id="comparison-heading" className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Why Keyword-Based ATS Tools Fail Technical Hiring
            </h2>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-[#11141a]">
            <table className="w-full min-w-[600px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#0c0f14] font-mono text-zinc-400">
                  <th className="p-3 w-1/3">CAPABILITY</th>
                  <th className="p-3 w-1/3 text-zinc-500">LEGACY ATS &amp; KEYWORD FILTERS</th>
                  <th className="p-3 w-1/3 text-emerald-400 font-semibold">TALENTRANK AI (FOUNDRY CORE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                <tr>
                  <td className="p-3 font-medium text-white">Evaluation Logic</td>
                  <td className="p-3 text-zinc-500">Keyword counts (easily gamed by buzzword stuffing)</td>
                  <td className="p-3 text-emerald-300 font-medium">Deep semantic understanding against strict rubric</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">Rubric Adaptability</td>
                  <td className="p-3 text-zinc-500">Rigid dropdowns and static Boolean filters</td>
                  <td className="p-3 text-emerald-300 font-medium">Dynamic AI-expanded rubrics with 1-click batch rescoring</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">Verification &amp; Citations</td>
                  <td className="p-3 text-zinc-500">None; recruiter must manually read 10-page PDFs</td>
                  <td className="p-3 text-emerald-300 font-medium">Direct provenance citations linked to resume sections</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">Interview Readiness</td>
                  <td className="p-3 text-zinc-500">Manual prep by engineering managers</td>
                  <td className="p-3 text-emerald-300 font-medium">Auto-generated high-signal technical screening questions</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Final CTA Strip */}
        <section className="mt-20 w-full max-w-5xl rounded-xl border border-zinc-800 bg-gradient-to-b from-[#11141a] to-[#0c0f14] p-8 text-center sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
            <Compass className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Evaluate Candidates with Defense-Grade Precision
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
            Test the live ranking pipeline, inspect candidate dossiers, and experience vector
            retrieval in real time with zero setup friction.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={handleStartAnonymous}
              disabled={loading || demoLoading}
              className="h-11 cursor-pointer gap-2 bg-white px-8 text-sm font-semibold text-zinc-950 shadow-md hover:bg-zinc-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Launch Instant Demo</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleDemoLogin}
              disabled={demoLoading || loading}
              className="h-11 cursor-pointer gap-2 border-zinc-800 bg-zinc-900 text-sm font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <User className="h-4 w-4 text-zinc-400" />
              <span>Explore as Demo User</span>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-zinc-800/80 bg-[#09090b] py-8 text-xs font-mono text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2 text-zinc-400">
            <Compass className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-white">TalentRank AI</span>
            <span>· Defense-Grade Talent Intelligence</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-500">
            <span>Next.js 16.4</span>
            <span>·</span>
            <span>MongoDB Atlas</span>
            <span>·</span>
            <span>Google Gemini</span>
            <span>·</span>
            <span className="text-emerald-400">33/33 Tests Passing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
