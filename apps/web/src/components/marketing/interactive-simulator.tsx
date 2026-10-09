"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Target,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Bot,
  Terminal,
  Layers,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreBar, FitBadge } from "@/components/ui/foundry";
import { getScoreStyle } from "@/lib/candidate-ui";

interface MockCandidate {
  id: string;
  name: string;
  headline: string;
  score: number;
  category: "Strong Fit" | "Potential" | "Unqualified";
  experience: number;
  tags: string[];
  verdict: string;
}

const MOCK_CANDIDATES: MockCandidate[] = [
  {
    id: "cand-1",
    name: "Alex Rivera",
    headline: "Senior Frontend Architect · Coursera Alum",
    score: 94,
    category: "Strong Fit",
    experience: 6.5,
    tags: ["Next.js App Router", "React 19", "EdTech LMS", "TypeScript"],
    verdict: "Strong Hire. Led large-scale Next.js App Router migration at Coursera. Exceptional architecture and 0 red flags.",
  },
  {
    id: "cand-2",
    name: "Sarah Lin",
    headline: "Staff Fullstack & AI Systems Engineer",
    score: 89,
    category: "Strong Fit",
    experience: 7.0,
    tags: ["Gemini API", "MongoDB Atlas", "Next.js", "Python"],
    verdict: "Strong Hire. Deep AI SDK v7 tool calling experience with production Vector Search implementations.",
  },
  {
    id: "cand-3",
    name: "Marcus Vance",
    headline: "Senior Backend Developer transitioning to AI",
    score: 72,
    category: "Potential",
    experience: 5.0,
    tags: ["Node.js", "PostgreSQL", "Docker", "REST"],
    verdict: "Potential. Excellent backend fundamentals, but limited production Next.js App Router experience.",
  },
  {
    id: "cand-4",
    name: "Kevin Chen",
    headline: "Junior Web Developer · Bootcamp Graduate",
    score: 41,
    category: "Unqualified",
    experience: 1.5,
    tags: ["JavaScript", "HTML/CSS", "Express", "Mongo"],
    verdict: "Unqualified. Fails must-have criteria for senior level architecture and multi-year production Next.js experience.",
  },
];

const ROLES_CRITERIA = {
  edtech: {
    title: "Senior React/Next.js Engineer (EdTech)",
    mustHave: [
      "4+ years building high-traffic web applications with Next.js App Router",
      "Production mastery of TypeScript, React 19 Server Components & Actions",
      "Prior engineering experience at an EdTech or high-scale consumer platform",
    ],
    niceToHave: [
      "MongoDB Atlas Vector Search or Gemini 2.5 / 3.0 API integrations",
      "Turbopack, Tailwind CSS v4, and sub-1s Core Web Vitals optimization",
    ],
    redFlags: [
      "Fewer than 3 years hands-on frontend experience",
      "Over 3 distinct companies in under 12 months with no contract context",
      "No production experience with React Server Components (client-only SPA background)",
    ],
    screeningQuestions: [
      "How do you handle stream cancellation and partial UI fallback in Next.js Server Actions?",
      "Describe how you architected an educational dashboard for zero cumulative layout shift (CLS).",
    ],
  },
  ai_infra: {
    title: "Staff AI Systems & RAG Infrastructure Engineer",
    mustHave: [
      "5+ years software engineering with 2+ years production LLM/RAG pipelines",
      "Deep expertise in vector indexing, HNSW, cosine embeddings, and hybrid search",
      "Strong proficiency in TypeScript / Node.js and Python ML services",
    ],
    niceToHave: [
      "Experience with Gemini Interactions API & Google Antigravity Agent framework",
      "High-throughput document chunking with metadata provenance tracking",
    ],
    redFlags: [
      "No real production vector deployment (only local toy scripts)",
      "Lack of defensive rate limiting or token cost governance strategies",
    ],
    screeningQuestions: [
      "How do you ensure semantic retrieval accuracy when vector similarity search drops below threshold?",
      "Explain your strategy for deduplicating cross-chunk citations in multi-turn RAG chat.",
    ],
  },
};

const RAG_PREVIEWS = [
  {
    q: "Does Alex Rivera meet the Next.js App Router requirement?",
    answer:
      "Yes, Alex exceeds this requirement. At Coursera (2022–2024), Alex served as Senior Frontend Architect, leading the migration of 14 core learner dashboards to Next.js App Router with React Server Components, reducing initial bundle size by 38% and achieving a 99/100 Core Web Vitals score.",
    citation: "Coursera § Experience (2022–2024) · Match Confidence 98%",
    verdict: "VERIFIED CRITERION",
  },
  {
    q: "Were any disqualifying red flags detected in Sarah Lin's background?",
    answer:
      "Zero red flags detected. Sarah has maintained stable, continuous tenure across top engineering organizations (3.5 years at Datadog, 3.5 years at scale-up tech). All stated skills in Gemini API integration, vector indexing, and TypeScript are substantiated by patent filings and open-source contributions.",
    citation: "Tenure & Verification Audit § Log ID: AUD-9921 · 0 Red Flags",
    verdict: "PASSED AUDIT",
  },
  {
    q: "Why is Kevin Chen classified as Unqualified?",
    answer:
      "Kevin has 1.5 years of total experience, primarily building introductory client-side React components. The active job criteria strictly mandate 4+ years of professional engineering and verified production Next.js App Router experience. Kevin fails 2 of 3 must-have requirements.",
    citation: "Gap Analysis § Experience Deficit (1.5y vs 4.0y minimum)",
    verdict: "DISQUALIFIED",
  },
];

export function InteractiveSimulator({
  onLaunchDemo,
}: {
  onLaunchDemo: () => void;
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "criteria" | "rag">("leaderboard");
  const [statusFilter, setStatusFilter] = useState<"all" | "Strong Fit" | "Potential" | "Unqualified">("all");
  const [selectedRole, setSelectedRole] = useState<"edtech" | "ai_infra">("edtech");
  const [activeRagIndex, setActiveRagIndex] = useState(0);

  const filteredCandidates =
    statusFilter === "all"
      ? MOCK_CANDIDATES
      : MOCK_CANDIDATES.filter((c) => c.category === statusFilter);

  const criteria = ROLES_CRITERIA[selectedRole];
  const activeRag = RAG_PREVIEWS[activeRagIndex] ?? {
    q: "Does candidate meet requirements?",
    answer: "Candidate profile evaluated against criteria.",
    citation: "System Audit § Provenance",
    verdict: "EVALUATED",
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#11141a] shadow-2xl">
      {/* Console Top Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800/80 bg-[#0c0f14] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="font-mono text-xs font-medium text-zinc-400">
            TALENTRANK_CORE // EVALUATION_CONSOLE
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer ${
              activeTab === "leaderboard"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>01 Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("criteria")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer ${
              activeTab === "criteria"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <span>02 Criteria Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rag")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer ${
              activeTab === "rag"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Bot className="h-3.5 w-3.5 text-amber-400" />
            <span>03 Vector RAG</span>
          </button>
        </div>
      </div>

      {/* Console Body */}
      <div className="p-4 sm:p-6">
        {/* TAB 1: LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            {/* Filter Pill Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-xs text-zinc-500 mr-1">FILTER:</span>
                {(["all", "Strong Fit", "Potential", "Unqualified"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`rounded px-2.5 py-1 font-mono text-xs transition-all cursor-pointer ${
                      statusFilter === filter
                        ? "border border-zinc-700 bg-zinc-800 text-white font-semibold"
                        : "border border-transparent bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    {filter === "all" ? "All (4)" : filter}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Active Rubric: EdTech Senior Next.js</span>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/60">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-mono">
                    <th className="py-2.5 px-3 w-14">RANK</th>
                    <th className="py-2.5 px-3">CANDIDATE & ROLE</th>
                    <th className="py-2.5 px-3 w-36">SCORE</th>
                    <th className="py-2.5 px-3 w-24">EXP</th>
                    <th className="py-2.5 px-3 w-28">FIT</th>
                    <th className="py-2.5 px-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredCandidates.map((c, idx) => {
                    const style = getScoreStyle(c.score);
                    return (
                      <tr
                        key={c.id}
                        className="group transition-colors hover:bg-zinc-800/40"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-zinc-400">
                          #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate max-w-[280px]">
                            {c.headline}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center gap-2">
                            <ScoreBar score={c.score} segments={10} className="w-16" />
                            <span className={`font-mono font-bold text-xs ${style.text}`}>
                              {c.score}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-300">
                          {c.experience} yrs
                        </td>
                        <td className="py-3 px-3">
                          <FitBadge score={c.score} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={onLaunchDemo}
                            className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white cursor-pointer whitespace-nowrap"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="h-3 w-3 text-zinc-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
              <span>Showing {filteredCandidates.length} evaluated records</span>
              <button
                type="button"
                onClick={onLaunchDemo}
                className="text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Open full interactive pipeline</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CRITERIA ENGINE */}
        {activeTab === "criteria" && (
          <div className="space-y-4">
            {/* Role Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-500">SELECT TARGET ROLE:</span>
                <button
                  type="button"
                  onClick={() => setSelectedRole("edtech")}
                  className={`rounded px-3 py-1 font-mono text-xs transition-colors cursor-pointer ${
                    selectedRole === "edtech"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  EdTech Next.js Lead
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("ai_infra")}
                  className={`rounded px-3 py-1 font-mono text-xs transition-colors cursor-pointer ${
                    selectedRole === "ai_infra"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  Staff AI Systems Engineer
                </button>
              </div>

              <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                1-CLICK PIPELINE RESCORING ENABLED
              </span>
            </div>

            {/* Rubric Breakdown Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Must Haves */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mandatory (Must-Have) Requirements</span>
                </div>
                <ul className="space-y-1.5 pl-5 text-xs text-zinc-300 list-disc leading-relaxed">
                  {criteria.mustHave.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Red Flags / Disqualifiers */}
              <div className="rounded-lg border border-rose-950/60 bg-rose-950/15 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider font-mono">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Disqualifying Red Flags (Automated Detection)</span>
                </div>
                <ul className="space-y-1.5 pl-5 text-xs text-rose-200/90 list-disc leading-relaxed">
                  {criteria.redFlags.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Nice to Haves */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                  <Sparkles className="h-4 w-4" />
                  <span>Preferred Qualifications (Nice-to-Have)</span>
                </div>
                <ul className="space-y-1.5 pl-5 text-xs text-zinc-300 list-disc leading-relaxed">
                  {criteria.niceToHave.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Screening Questions */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider font-mono">
                  <HelpCircle className="h-4 w-4" />
                  <span>Generated Screening Interview Questions</span>
                </div>
                <ol className="space-y-1.5 pl-5 text-xs text-zinc-300 list-decimal leading-relaxed">
                  {criteria.screeningQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VECTOR RAG */}
        {activeTab === "rag" && (
          <div className="space-y-4">
            <div className="border-b border-zinc-800/60 pb-3">
              <span className="font-mono text-xs text-zinc-500">
                INTERACTIVE GEMINI RAG SIMULATOR (MONGODB ATLAS VECTOR RETRIEVAL):
              </span>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {RAG_PREVIEWS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveRagIndex(idx)}
                    className={`rounded-lg p-2.5 text-left text-xs transition-all cursor-pointer ${
                      activeRagIndex === idx
                        ? "border border-blue-500/60 bg-blue-950/30 text-white font-medium shadow-sm"
                        : "border border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-mono text-[10px] text-zinc-500 mb-1">PROMPT #{idx + 1}</div>
                    <div className="line-clamp-2">{item.q}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Answer Display */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-400" />
                  <span className="font-mono text-xs font-semibold text-zinc-200">
                    Grounded AI Dossier Audit
                  </span>
                </div>
                <span className="rounded border border-emerald-500/40 bg-emerald-950/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                  {activeRag.verdict}
                </span>
              </div>

              <div className="space-y-2">
                <div className="font-mono text-xs text-zinc-500">QUERY:</div>
                <div className="text-sm font-medium text-white">{activeRag.q}</div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                <div className="font-mono text-xs text-zinc-500">SYNTHESIZED ANSWER:</div>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-200">
                  {activeRag.answer}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-mono">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>CITATION PROVENANCE:</span>
                </span>
                <span className="text-blue-300 truncate max-w-[340px]">
                  {activeRag.citation}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Console Bottom Action Strip */}
      <div className="flex flex-wrap items-center justify-between border-t border-zinc-800/80 bg-[#0c0f14] px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
          <span>Real-time evaluation powered by Google Gemini 2.5/3.0 & MongoDB Atlas</span>
        </div>
        <Button
          size="sm"
          onClick={onLaunchDemo}
          className="cursor-pointer gap-2 bg-zinc-100 text-zinc-950 hover:bg-white font-medium text-xs h-8"
        >
          <span>Try with live candidates</span>
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
