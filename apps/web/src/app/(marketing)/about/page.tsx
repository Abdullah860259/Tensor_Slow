"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { SmoothScroll } from "@/components/smooth-scroll";

/* ================================================================== */
/* Team Data                                                          */
/* ================================================================== */

interface TeamMember {
  id: string;
  name: string;
  role: string;
  focus: string;
  description: string;
  type: "linkedin" | "github";
  profileUrl: string;
  // Percentage on photo
  faceCoords: { top: string; left: string };
  initials: string;
  badge: string;
  side: "left" | "right";
  // Organic scrambled offset & subtle tilt
  cardOffsetClass: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "ahmed",
    name: "Muhammad Ahmed",
    role: "Full-Stack Engineer",
    focus: "End-to-End System Integration",
    description:
      "Bridged frontend interfaces, API routes, and MongoDB Atlas databases for seamless evaluation flows.",
    type: "linkedin",
    profileUrl: "https://www.linkedin.com/in/muhammad-ahmed-asif-5b0842318/",
    faceCoords: { top: "33%", left: "27%" },
    initials: "MA",
    badge: "Full-Stack Lead",
    side: "left",
    cardOffsetClass: "lg:-translate-x-3 lg:-translate-y-4 lg:-rotate-1.5 hover:rotate-0 hover:scale-[1.02] transition-transform duration-300",
  },
  {
    id: "abdullah",
    name: "Abdullah Anwar",
    role: "Backend & API Systems",
    focus: "API Endpoints & Sourcing Flow",
    description:
      "Built backend data pipelines, criteria generation endpoints, and Apify sourcing actor orchestrations.",
    type: "linkedin",
    profileUrl: "https://www.linkedin.com/in/abdullah-anwar-cs/",
    faceCoords: { top: "64%", left: "20%" },
    initials: "AA",
    badge: "Backend & APIs",
    side: "left",
    cardOffsetClass: "lg:translate-x-4 lg:translate-y-4 lg:rotate-1.5 hover:rotate-0 hover:scale-[1.02] transition-transform duration-300",
  },
  {
    id: "yahya",
    name: "Muhammad Yahya",
    role: "Frontend & UI/UX Engineer",
    focus: "User Interface & Recruiter Experience",
    description:
      "Crafted the standardized design system, high-density leaderboard cards, responsive layouts, and motion micro-interactions.",
    type: "linkedin",
    profileUrl: "https://www.linkedin.com/in/myahyashahzad/",
    faceCoords: { top: "43%", left: "75%" },
    initials: "MY",
    badge: "Frontend & UI/UX",
    side: "right",
    cardOffsetClass: "lg:-translate-x-10 xl:-translate-x-14 lg:-translate-y-6 lg:rotate-2 z-40 shadow-md backdrop-blur-xs hover:rotate-0 hover:scale-[1.02] transition-transform duration-300",
  },
  {
    id: "mahad",
    name: "Mahad Hashmi",
    role: "Backend & API Development",
    focus: "Scoring Engine & Data Schemas",
    description:
      "Engineered rubric scoring validations, candidate ingest pipelines, and backend schema constraints.",
    type: "github",
    profileUrl: "https://github.com/mahad-hashmi2804",
    faceCoords: { top: "67%", left: "84%" },
    initials: "MH",
    badge: "Backend Engineer",
    side: "right",
    cardOffsetClass: "lg:translate-x-4 lg:translate-y-6 lg:rotate-2 hover:rotate-0 hover:scale-[1.02] transition-transform duration-300",
  },
];

/* Social Icons */
function LinkedInIcon({ className = "h-4 w-4" }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

function GitHubIcon({ className = "h-4 w-4" }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

/* ================================================================== */
/* Page Component                                                     */
/* ================================================================== */

export default function AboutPage(): React.JSX.Element {
  const router = useRouter();
  const [activeMember, setActiveMember] = useState<string>("ahmed");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Dynamic measuring of connection line endpoints
  const diagramContainerRef = useRef<HTMLDivElement | null>(null);
  const faceDotRefs = useRef<Record<string, HTMLElement | null>>({});
  const cardNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lineCoords, setLineCoords] = useState<
    Record<string, { x1: number; y1: number; x2: number; y2: number }>
  >({});

  const handleStartAnonymous = async () => {
    try {
      setLoading(true);
      const res = await authClient.signIn.anonymous();
      if (res && "error" in res && res.error) {
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setDemoLoading(true);
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (!res.ok) {
        setDemoLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setDemoLoading(false);
    }
  };

  // Recalculate line coordinates on mount, resize, and state changes
  useEffect(() => {
    const measure = () => {
      const container = diagramContainerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const updated: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {};

      TEAM_MEMBERS.forEach((m) => {
        const faceEl = faceDotRefs.current[m.id];
        const cardNodeEl = cardNodeRefs.current[m.id];
        if (faceEl && cardNodeEl) {
          const fRect = faceEl.getBoundingClientRect();
          const cnRect = cardNodeEl.getBoundingClientRect();

          updated[m.id] = {
            x1: fRect.left + fRect.width / 2 - cRect.left,
            y1: fRect.top + fRect.height / 2 - cRect.top,
            x2: cnRect.left + cnRect.width / 2 - cRect.left,
            y2: cnRect.top + cnRect.height / 2 - cRect.top,
          };
        }
      });

      setLineCoords(updated);
    };

    measure();
    const timer1 = setTimeout(measure, 150);
    const timer2 = setTimeout(measure, 400);
    const timer3 = setTimeout(measure, 700);
    window.addEventListener("resize", measure);

    let ro: ResizeObserver | null = null;
    if (diagramContainerRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(diagramContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      <SmoothScroll />

      {/* Header matching landing page */}
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between border-x border-border/80 px-6 sm:px-12">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white shadow-2xs overflow-hidden p-0.5 transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="TalentRank" className="h-5 w-5 object-contain" />
            </span>
            <span className="font-sans text-base font-semibold tracking-tight text-foreground">TalentRank</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/#process"
              className="font-sans text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Process
            </Link>
            <Link
              href="/#features"
              className="font-sans text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="/#faqs"
              className="font-sans text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQs
            </Link>
            <Link
              href="/about"
              className="font-sans text-sm font-semibold text-foreground border-b border-foreground pb-0.5"
            >
              About
            </Link>
            <Link
              href="/#demo"
              className="font-sans text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Live Demo
            </Link>
          </nav>

          {/* CTA Group */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDemoLogin}
              disabled={demoLoading || loading}
              className="hidden font-sans text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              {demoLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <User className="h-4 w-4" aria-hidden="true" />}
              <span>Sign in</span>
            </Button>
            <Button
              size="sm"
              onClick={handleStartAnonymous}
              disabled={loading || demoLoading}
              className="rounded-none bg-foreground px-5 font-sans text-sm font-medium text-background hover:opacity-85 transition-opacity"
            >
              {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 animate-fade-in-up">
        {/* ========================================================== */}
        {/* 1. Team Section: Centered Clear Photo + External Cards      */}
        {/* ========================================================== */}
        <section className="relative overflow-hidden border-b border-border bg-background pt-14 pb-20 sm:pt-20 sm:pb-28">
          <div className="mx-auto max-w-7xl border-x border-border/80 px-4 sm:px-8 lg:px-12">
            {/* Section Header */}
            <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                Meet Team TensorSlow
              </span>
              <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                The Engineers Behind TalentRank
              </h1>
              <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
                Built for the <strong>AICON Hackathon 2026</strong>. Four engineers joining forces to bring mathematical
                determinism, sub-second vector search, and autonomous LinkedIn talent sourcing to technical recruitment.
              </p>
            </div>

            {/* Diagram Container: External Cards on Left/Right + Unobstructed Image in Center */}
            <div
              ref={diagramContainerRef}
              className="relative mt-12 sm:mt-16 mx-auto w-full max-w-7xl animate-fade-in-scale animation-delay-100"
            >
              {/* Dynamic SVG Connecting Lines Layer (Active on lg+ desktop) */}
              <svg
                className="absolute inset-0 h-full w-full pointer-events-none z-30 hidden lg:block"
                aria-hidden="true"
              >
                {TEAM_MEMBERS.map((m) => {
                  const pts = lineCoords[m.id];
                  if (!pts) return null;

                  // Smooth horizontal Bezier curve between person's face and card anchor dot
                  const midX = (pts.x1 + pts.x2) / 2;
                  const path = `M ${pts.x1} ${pts.y1} C ${midX} ${pts.y1}, ${midX} ${pts.y2}, ${pts.x2} ${pts.y2}`;

                  return (
                    <g key={`svg-line-${m.id}`}>
                      {/* Main connecting stroke (steady, neutral) */}
                      <path
                        d={path}
                        fill="none"
                        stroke="currentColor"
                        className="text-border"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        strokeOpacity={0.65}
                        strokeLinecap="round"
                      />
                      {/* Card endpoint simple blue anchor dot */}
                      <circle
                        cx={pts.x2}
                        cy={pts.y2}
                        r="2.5"
                        className="fill-blue-500"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Responsive Layout: 3 Columns on desktop, Stack on tablet/mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)_230px] xl:grid-cols-[250px_minmax(0,1fr)_250px] items-center gap-5 lg:gap-7">
                {/* ── Left Column: Ahmed (Top) & Abdullah (Bottom) ── */}
                <div className="hidden lg:flex flex-col justify-around gap-6 h-full py-2 z-30 animate-fade-in-up animation-delay-150">
                  {TEAM_MEMBERS.filter((m) => m.side === "left").map((member) => (
                    <div
                      key={member.id}
                      className={`group relative rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-2xs transition-all duration-300 hover:shadow-md ${member.cardOffsetClass}`}
                    >
                      {/* Anchor Node 2 on right edge facing the center image (Simple Blue) */}
                      <div
                        ref={(el) => {
                          cardNodeRefs.current[member.id] = el;
                        }}
                        className="absolute -right-1.5 top-1/2 -translate-y-1/2 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-blue-500 shadow-xs"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary font-sans text-[11px] font-bold text-foreground">
                          {member.initials}
                        </span>
                        <span className="rounded-full border border-border bg-secondary/80 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {member.badge}
                        </span>
                      </div>

                      <h3 className="mt-2.5 font-sans text-sm font-bold text-foreground">
                        {member.name}
                      </h3>
                      <p className="font-sans text-[11px] font-medium text-muted-foreground">
                        {member.role}
                      </p>
                      <p className="mt-1 font-sans text-[11px] leading-relaxed text-muted-foreground">
                        {member.description}
                      </p>

                      <div className="mt-3 border-t border-border/80 pt-2.5">
                        <a
                          href={member.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/70 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                        >
                          <LinkedInIcon className="h-3 w-3 text-[#0A66C2]" />
                          <span>LinkedIn Profile</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Center Column: Unobstructed Team Photograph ── */}
                <div className="relative mx-auto w-full z-10 animate-fade-in-scale animation-delay-100">
                  <div className="relative rounded-2xl border border-border bg-card p-2 sm:p-3 shadow-lg overflow-hidden">
                    <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-xl overflow-hidden bg-black/5 dark:bg-black/30">
                      {/* Crystal clear image with completely visible faces */}
                      <img
                        src="/team.jpg"
                        alt="Team TensorSlow at AICON Hackathon: Abdullah Anwar, Muhammad Ahmed, Muhammad Yahya, and Mahad Hashmi"
                        className="w-full h-full object-cover object-center filter contrast-[1.03]"
                      />

                      {/* Subtle dark vignette only at bottom edge to frame photo */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

                      {/* Node 1 Simple Blue Small Pointers on Persons' Heads/Faces */}
                      {TEAM_MEMBERS.map((member) => (
                        <div
                          key={`face-dot-${member.id}`}
                          ref={(el) => {
                            faceDotRefs.current[member.id] = el;
                          }}
                          style={{ top: member.faceCoords.top, left: member.faceCoords.left }}
                          className="group absolute -translate-x-1/2 -translate-y-1/2 z-30"
                          aria-label={member.name}
                        >
                          {/* Small, simple blue face marker dot */}
                          <span className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full border border-white bg-blue-500 shadow-xs" />
                          {/* Name tooltip on hover */}
                          <span className="absolute left-1/2 -top-6 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 px-2 py-0.5 text-[10px] font-sans font-semibold text-white shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            {member.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="mt-2.5 text-center font-sans text-xs text-muted-foreground lg:hidden">
                    Team TensorSlow at AICON Hackathon 2026
                  </p>
                </div>

                {/* ── Right Column: Yahya (Top) & Mahad (Bottom) ── */}
                <div className="hidden lg:flex flex-col justify-around gap-6 h-full py-2 z-30 animate-fade-in-up animation-delay-150">
                  {TEAM_MEMBERS.filter((m) => m.side === "right").map((member) => (
                    <div
                      key={member.id}
                      className={`group relative rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-2xs transition-all duration-300 hover:shadow-md ${member.cardOffsetClass}`}
                    >
                      {/* Anchor Node 2 on left edge facing the center image (Simple Blue) */}
                      <div
                        ref={(el) => {
                          cardNodeRefs.current[member.id] = el;
                        }}
                        className="absolute -left-1.5 top-1/2 -translate-y-1/2 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-blue-500 shadow-xs"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary font-sans text-[11px] font-bold text-foreground">
                          {member.initials}
                        </span>
                        <span className="rounded-full border border-border bg-secondary/80 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {member.badge}
                        </span>
                      </div>

                      <h3 className="mt-2.5 font-sans text-sm font-bold text-foreground">
                        {member.name}
                      </h3>
                      <p className="font-sans text-[11px] font-medium text-muted-foreground">
                        {member.role}
                      </p>
                      <p className="mt-1 font-sans text-[11px] leading-relaxed text-muted-foreground">
                        {member.description}
                      </p>

                      <div className="mt-3 border-t border-border/80 pt-2.5">
                        <a
                          href={member.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/70 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                        >
                          {member.type === "linkedin" ? (
                            <>
                              <LinkedInIcon className="h-3 w-3 text-[#0A66C2]" />
                              <span>LinkedIn Profile</span>
                            </>
                          ) : (
                            <>
                              <GitHubIcon className="h-3 w-3 text-foreground" />
                              <span>GitHub Profile</span>
                            </>
                          )}
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile & Tablet Card Grid (Shown below on smaller viewports) */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden animate-fade-in-up animation-delay-150">
              {TEAM_MEMBERS.map((member) => (
                <div
                  key={`mobile-grid-${member.id}`}
                  className="rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary font-sans text-[11px] font-bold text-foreground">
                      {member.initials}
                    </span>
                    <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {member.badge}
                    </span>
                  </div>

                  <h3 className="mt-2.5 font-sans text-sm font-bold text-foreground">
                    {member.name}
                  </h3>
                  <p className="font-sans text-[11px] font-medium text-muted-foreground">
                    {member.role}
                  </p>
                  <p className="mt-1 font-sans text-[11px] leading-relaxed text-muted-foreground">
                    {member.description}
                  </p>

                  <div className="mt-3 border-t border-border/80 pt-2.5">
                    <a
                      href={member.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/70 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      {member.type === "linkedin" ? (
                        <>
                          <LinkedInIcon className="h-3 w-3 text-[#0A66C2]" />
                          <span>LinkedIn Profile</span>
                        </>
                      ) : (
                        <>
                          <GitHubIcon className="h-3 w-3 text-foreground" />
                          <span>GitHub Profile</span>
                        </>
                      )}
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/* 2. Product Section: Mission & Technical Pillars            */}
        {/* ========================================================== */}
        <section className="border-b border-border bg-card/30 py-20 sm:py-28 animate-fade-in-up animation-delay-200">
          <div className="mx-auto max-w-7xl border-x border-border/80 px-6 sm:px-12">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                About Our Product
              </span>
              <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Engineered for Objective Truth in Technical Hiring
              </h2>
              <p className="mt-4 font-sans text-base leading-relaxed text-muted-foreground">
                Traditional ATS platforms rely on brittle keyword string matching, while ungrounded LLM screening
                invents hallucinations. TalentRank delivers deterministic, repeatable candidate intelligence.
              </p>
            </div>

            {/* Architecture Grid */}
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-sans text-lg font-bold text-foreground">
                  Deterministic Rubric Evaluation
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                  Plain-English job criteria expand into strict mathematical rubrics: Must-Haves, Nice-to-Haves, and Red Flags.
                  Scored from 0 to 100 with zero model drift.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                  <Database className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-sans text-lg font-bold text-foreground">
                  MongoDB Atlas Vector Search
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                  Every resume is indexed into 768-dimensional Gemini vector embeddings in MongoDB Atlas in under 450ms,
                  enabling instant semantic similarity and hybrid retrieval.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-sans text-lg font-bold text-foreground">
                  Apify Autonomous Sourcing
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                  Recruiters can trigger autonomous LinkedIn scraping runs with customized filters. Profiles are imported,
                  deduplicated, and scored automatically into live leaderboards.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-sans text-lg font-bold text-foreground">
                  Verifiable Source Citations
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                  Every competency credit anchors to an exact, quoted text span in the candidate's PDF resume or public work.
                  Zero phantom credentials or fabricated claims.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-sans text-lg font-bold text-foreground">
                  Blind Anti-Bias Screening
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                  Removes candidate identity markers, demographic details, photos, and university prestige bias so engineers
                  are benchmarked exclusively on verified technical competency.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-sans text-lg font-bold text-foreground">
                  Tenure Anomaly Detection
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                  Algorithms analyze career timeline discontinuities, overlapping tenures, and inflated seniority jumps,
                  flagging risks for recruiters before interview scheduling.
                </p>
              </div>
            </div>

            {/* Hackathon Submission Showcase Box */}
            <div className="mt-14 rounded-2xl border border-border bg-card p-8 sm:p-12 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-primary font-semibold">
                    AICON Hackathon 2026
                  </span>
                  <h3 className="mt-1 font-sans text-2xl font-bold text-foreground sm:text-3xl">
                    Built by Team TensorSlow
                  </h3>
                  <p className="mt-2 max-w-2xl font-sans text-sm text-muted-foreground">
                    Developed collaboratively under tight hackathon deadlines to pioneer a new standard for AI-native talent evaluation.
                    Open-source and deployed for demonstration.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <a
                    href="https://gitlab.com/ahmed-group802741/talentrank-ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-none border border-border bg-secondary px-5 py-2.5 font-sans text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <GitHubIcon className="h-4 w-4" />
                    <span>GitLab Repo</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/* 3. Pre-Footer Call to Action                                */}
        {/* ========================================================== */}
        <section className="bg-background py-20 sm:py-28 animate-fade-in-up animation-delay-300">
          <div className="mx-auto max-w-7xl border-x border-border/80 px-6 sm:px-12">
            <div className="rounded-2xl border border-border bg-card p-10 text-center sm:p-16 shadow-xs">
              <h2 className="mx-auto max-w-2xl font-sans text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Experience TalentRank In Action
              </h2>
              <p className="mx-auto mt-4 max-w-xl font-sans text-base text-muted-foreground">
                Test our deterministic scoring rubrics, upload your own resumes, or inspect real-time candidate dossiers in a live demo.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={handleStartAnonymous}
                  disabled={loading || demoLoading}
                  className="h-12 rounded-none bg-foreground px-8 font-sans text-base font-medium text-background hover:opacity-85 transition-opacity"
                >
                  {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  Launch Live Demo →
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDemoLogin}
                  disabled={loading || demoLoading}
                  className="h-12 rounded-none border border-border bg-card px-8 font-sans text-base font-medium text-foreground hover:bg-secondary"
                >
                  {demoLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <User className="mr-1 h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                  Explore as Demo User
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer matching standard minimal layout */}
      <footer className="border-t border-border bg-card text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl border-x border-border/80 px-6 py-16 sm:px-12">
          <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white shadow-2xs overflow-hidden p-0.5">
                  <img src="/logo.png" alt="TalentRank" className="h-5 w-5 object-contain" />
                </span>
                <span className="font-sans text-base font-semibold tracking-tight text-foreground">TalentRank</span>
              </div>
              <p className="mt-3 max-w-sm font-sans text-sm leading-relaxed text-muted-foreground">
                Autonomous multi-agent candidate intelligence engineered for high-signal technical recruitment.
              </p>
              <p className="mt-6 font-mono text-[13px] text-muted-foreground">
                © {new Date().getFullYear()} TalentRank AI. All rights reserved.
              </p>
            </div>
            <div>
              <h4 className="font-sans text-sm font-semibold uppercase tracking-wider text-foreground">Product</h4>
              <ul className="mt-4 space-y-3 font-sans text-sm">
                <li><Link href="/#process" className="hover:text-foreground transition-colors">How It Works</Link></li>
                <li><Link href="/#features" className="hover:text-foreground transition-colors">Core Capabilities</Link></li>
                <li><Link href="/#process" className="hover:text-foreground transition-colors">Deterministic Rubrics</Link></li>
                <li><Link href="/about" className="hover:text-foreground text-foreground font-medium transition-colors">About Our Team</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-sans text-sm font-semibold uppercase tracking-wider text-foreground">Stack</h4>
              <ul className="mt-4 space-y-3 font-sans text-sm">
                <li><span className="text-muted-foreground">Next.js 16.4</span></li>
                <li><span className="text-muted-foreground">MongoDB Atlas 768-D</span></li>
                <li><span className="text-muted-foreground">Google Gemini 2.5</span></li>
                <li><span className="text-muted-foreground">Apify Actors</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-sans text-sm font-semibold uppercase tracking-wider text-foreground">Resources</h4>
              <ul className="mt-4 space-y-3 font-sans text-sm">
                <li><Link href="/#faqs" className="hover:text-foreground transition-colors">System FAQs</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Live Dashboard</Link></li>
                <li><Link href="/#demo" className="hover:text-foreground transition-colors">Interactive Demo</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
              </span>
              <span className="font-sans text-sm text-foreground font-medium">All systems operational</span>
            </div>
            <p className="font-sans text-sm text-muted-foreground">
              Built for the AICON Hackathon 2026 by Team TensorSlow
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
