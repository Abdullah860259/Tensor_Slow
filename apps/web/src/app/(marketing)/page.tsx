"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  EyeOff,
  Loader2,
  Scale,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/* ================================================================== */
/* Motion primitives. Everything respects prefers-reduced-motion.      */
/* ================================================================== */

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = () => setReduced(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/** Soft fade and rise, once, when the block scrolls into view. */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}): React.JSX.Element {
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-1000 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        seen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Headline text that resolves word by word (fade, lift, un-blur). */
function Words({
  text,
  step = 55,
  delay = 0,
}: {
  text: string;
  step?: number;
  delay?: number;
}): React.JSX.Element {
  const [ref, seen] = useInView<HTMLSpanElement>(0.3);
  return (
    <span ref={ref}>
      {text.split(" ").map((word, i) => (
        <React.Fragment key={`${word}-${i}`}>
          <span
            style={{ transitionDelay: `${delay + i * step}ms` }}
            className={`inline-block transition-[opacity,transform,filter] duration-1000 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-none motion-reduce:transition-none ${
              seen ? "translate-y-0 opacity-100 blur-0" : "translate-y-2 opacity-0 blur-sm"
            }`}
          >
            {word}
          </span>{" "}
        </React.Fragment>
      ))}
    </span>
  );
}

/** Paragraph whose words brighten one by one as it scrolls through the viewport. */
function ScrollText({ text, className = "" }: { text: string; className?: string }): React.JSX.Element {
  const ref = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const value = (vh * 0.85 - top) / (height + vh * 0.45);
      setProgress(Math.min(1, Math.max(0, value)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => {
        const lit = reduced ? 1 : Math.min(1, Math.max(0, (progress * (words.length + 4) - i) / 4));
        return (
          <React.Fragment key={`${word}-${i}`}>
            <span className="transition-opacity duration-300" style={{ opacity: 0.16 + 0.84 * lit }}>
              {word}
            </span>{" "}
          </React.Fragment>
        );
      })}
    </p>
  );
}

/* ================================================================== */
/* Typography + shared UI                                              */
/* ================================================================== */

function Kicker({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="text-sm text-zinc-500">{children}</p>;
}

function H2({ id, text, className = "" }: { id?: string; text: string; className?: string }): React.JSX.Element {
  return (
    <h2
      id={id}
      className={`font-serif text-balance text-4xl font-normal tracking-tight text-white sm:text-6xl sm:leading-[1.05] ${className}`}
    >
      <Words text={text} />
    </h2>
  );
}

function CtaPair({
  onAnonymous,
  onDemo,
  loading,
  demoLoading,
  primaryLabel,
  secondaryLabel,
  center = false,
}: {
  onAnonymous: () => void;
  onDemo: () => void;
  loading: boolean;
  demoLoading: boolean;
  primaryLabel: string;
  secondaryLabel: string;
  center?: boolean;
}): React.JSX.Element {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${center ? "items-center justify-center" : "items-start"}`}>
      <Button
        size="lg"
        onClick={onAnonymous}
        disabled={loading || demoLoading}
        className="h-11 gap-2 bg-white px-7 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            <span>Starting session…</span>
          </>
        ) : (
          <>
            <span>{primaryLabel}</span>
            <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={onDemo}
        disabled={loading || demoLoading}
        className="h-11 gap-2 border-zinc-800 bg-transparent px-6 text-sm font-medium text-zinc-200 hover:bg-zinc-900 hover:text-white"
      >
        {demoLoading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            <User className="text-zinc-400" aria-hidden="true" />
            <span>{secondaryLabel}</span>
          </>
        )}
      </Button>
    </div>
  );
}

/* ================================================================== */
/* Content                                                             */
/* ================================================================== */

const MANIFESTO =
  "Hiring engineers means reading hundreds of profiles and trusting your gut. TalentRank reads every one against the same criteria, scores it from zero to one hundred, and shows you exactly where each answer came from.";

const PROBLEMS = [
  {
    icon: EyeOff,
    title: "The resume black box",
    body: "Keyword filters reward buzzword stuffing. Qualified builders get rejected while unqualified resume gamers pass through.",
  },
  {
    icon: Clock,
    title: "The time sink",
    body: "Engineering managers spend 15+ hours a week scanning 10-page PDFs instead of talking to the best people.",
  },
  {
    icon: Scale,
    title: "Subjective blind spots",
    body: "Unstructured interviews and manual scoring bring inconsistent criteria and missed tenure red flags.",
  },
];

const QUESTIONS = [
  {
    q: "Does Alex have Next.js App Router experience?",
    a: "Yes. Alex migrated Coursera's learner dashboard from the Pages Router to the App Router and owned the server component rollout across two teams.",
    cite: "Coursera Experience § 2022–2024",
    match: 98,
    tone: "text-emerald-300 border-emerald-800/60 bg-emerald-950/60",
  },
  {
    q: "Were any red flags detected?",
    a: "One minor flag: a seven-month tenure in 2019. Every role since has run longer than two years, and no unexplained gaps appear.",
    cite: "Career Timeline § 2018–2020",
    match: 91,
    tone: "text-amber-300 border-amber-800/60 bg-amber-950/60",
  },
  {
    q: "Has Alex designed scalable cloud architecture?",
    a: "Yes. The profile states Alex led a move to autoscaling services on AWS that handled 4× traffic during enrollment peaks.",
    cite: "Coursera Experience § 2023",
    match: 94,
    tone: "text-emerald-300 border-emerald-800/60 bg-emerald-950/60",
  },
];

const METRICS = [
  { value: "< 850ms", label: "Parsing and ingestion latency" },
  { value: "768-D", label: "Multimodal vector embeddings in MongoDB Atlas" },
  { value: "100%", label: "Deterministic rubric scoring" },
  { value: "33 / 33", label: "Automated quality gates passed" },
];

/* Tutorial visuals ------------------------------------------------- */

function IngestVisual(): React.JSX.Element {
  const rows = [
    ["alex_rivera_resume.pdf", "212 KB", "text-zinc-500"],
    ["Text extracted", "4,812 chars", "text-emerald-400"],
    ["Gemini embedding · 768-D", "412 ms", "text-emerald-400"],
  ];
  return (
    <div className="space-y-2.5 font-mono text-xs">
      {rows.map(([left, right, tone]) => (
        <div key={left} className="flex items-center justify-between rounded-md border border-border bg-well px-3 py-2.5">
          <span className="text-zinc-300">{left}</span>
          <span className={tone}>{right}</span>
        </div>
      ))}
    </div>
  );
}

function CriteriaVisual(): React.JSX.Element {
  const rows = [
    { label: "Must have", dot: "bg-emerald-500", text: "3+ years of React and Next.js" },
    { label: "Must have", dot: "bg-emerald-500", text: "Scalable cloud architecture" },
    { label: "Nice to have", dot: "bg-amber-500", text: "EdTech or education experience" },
    { label: "Red flag", dot: "bg-rose-500", text: "Multiple tenures under one year" },
  ];
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.text} className="flex items-start gap-3 text-sm">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${r.dot}`} aria-hidden="true" />
          <span className="text-zinc-300">
            <span className="mr-2 text-xs text-zinc-500">{r.label}</span>
            {r.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RankVisual(): React.JSX.Element {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-medium text-white">Alex Rivera</p>
          <p className="text-xs text-zinc-500">Senior Frontend Engineer</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-semibold tabular-nums text-emerald-400">94</p>
          <p className="text-xs text-emerald-300">Strong Fit</p>
        </div>
      </div>
      <div className="mt-4 flex h-1.5 gap-[2px]" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`flex-1 ${i < 9 ? "bg-emerald-500" : "bg-zinc-800"}`} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["react", "nextjs", "edtech", "aws"].map((t) => (
          <span key={t} className="rounded border border-border bg-well px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function CopilotVisual(): React.JSX.Element {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-zinc-500">Where has Alex worked with Next.js?</p>
      <p className="leading-relaxed text-zinc-200">
        Alex led the App Router migration at Coursera and built the learner dashboard in Next.js.
      </p>
      <span className="inline-flex items-center gap-1.5 rounded border border-emerald-800/60 bg-emerald-950/60 px-2 py-1 font-mono text-[11px] text-emerald-300">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Coursera Experience § 2022–2024
      </span>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    label: "Ingest",
    title: "Bring in a candidate, any way you have one.",
    body: "Drop a PDF resume, paste text, or scrape a LinkedIn profile. The text is extracted and turned into a 768-dimension Gemini vector in MongoDB Atlas in under a second.",
    visual: <IngestVisual />,
  },
  {
    n: "02",
    label: "Define",
    title: "Describe the role in plain English.",
    body: "Write rough notes about who you need. The criteria engine expands them into must-haves, nice-to-haves, and red flags you can edit before anything is scored.",
    visual: <CriteriaVisual />,
  },
  {
    n: "03",
    label: "Rank",
    title: "Get a score from 0 to 100.",
    body: "Every candidate is scored against the same rubric, with a transparent breakdown and a clear band: Strong Fit, Potential, or Unqualified.",
    visual: <RankVisual />,
  },
  {
    n: "04",
    label: "Ask",
    title: "Ask questions and see the source.",
    body: "Query a candidate's actual experience. Each answer cites the exact section of the profile it came from, so nothing is taken on trust.",
    visual: <CopilotVisual />,
  },
];

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

export default function MarketingPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

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

  /* Thin reading-progress line under the nav (written straight to the DOM, no re-render). */
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Which tutorial step is crossing the middle of the viewport. */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.i ?? 0));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const current = QUESTIONS[active] ?? QUESTIONS[0]!;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-blue-500/30">
      {/* Navigation */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-[#09090b]/80 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card">
            <Compass className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white">TalentRank AI</span>
          <span className="ml-1 hidden items-center gap-1.5 text-xs text-zinc-500 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Live demo
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDemoLogin}
            disabled={demoLoading || loading}
            className="text-xs text-zinc-300 hover:text-white"
          >
            {demoLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <User aria-hidden="true" />}
            <span>Demo Account</span>
          </Button>
          <Button
            size="sm"
            onClick={handleStartAnonymous}
            disabled={loading || demoLoading}
            className="bg-zinc-100 text-xs font-semibold text-zinc-950 hover:bg-white"
          >
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            <span>Launch Demo</span>
          </Button>
        </div>
        <div
          ref={barRef}
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-px h-px bg-emerald-400/70"
          style={{ transform: "scaleX(0)", transformOrigin: "left" }}
        />
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-28 pt-24 sm:px-8 sm:pb-40 sm:pt-36">
          <Reveal>
            <span className="inline-flex items-center rounded-full border border-border bg-card px-3.5 py-1 text-xs text-zinc-300">
              Precision candidate evaluation and matching
            </span>
          </Reveal>
          <h1 className="mt-8 max-w-4xl font-serif text-balance text-5xl font-normal tracking-tight text-white sm:text-7xl sm:leading-[1.02] md:text-8xl">
            <Words text="Candidate intelligence engineered for technical hiring." step={70} delay={150} />
          </h1>
          <Reveal delay={900}>
            <p className="mt-10 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-400 sm:text-xl">
              Evaluate engineering talent against deterministic, custom job criteria. Ingest LinkedIn profiles and
              resumes, uncover hidden red flags, and score candidates 0–100 with zero hallucination.
            </p>
          </Reveal>
          <Reveal delay={1150}>
            <div className="mt-10">
              <CtaPair
                onAnonymous={handleStartAnonymous}
                onDemo={handleDemoLogin}
                loading={loading}
                demoLoading={demoLoading}
                primaryLabel="Launch Live Demo"
                secondaryLabel="Sign In as Demo User"
              />
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              Zero sign-up required. Powered by MongoDB Atlas Vector Search and Google Gemini.
            </p>
            {error && (
              <div
                role="alert"
                className="mt-6 flex max-w-md items-center gap-2 rounded-md border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </Reveal>
        </section>

        {/* Manifesto: words brighten as you scroll */}
        <section aria-label="What TalentRank does" className="border-t border-border">
          <div className="mx-auto max-w-4xl px-4 py-32 sm:px-8 sm:py-48">
            <ScrollText
              text={MANIFESTO}
              className="font-serif text-balance text-3xl leading-[1.25] tracking-tight text-white sm:text-5xl sm:leading-[1.2]"
            />
          </div>
        </section>

        {/* Act I: Problem */}
        <section aria-labelledby="problem-heading" className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-24 sm:px-8 sm:py-32">
            <Kicker>The problem</Kicker>
            <H2 id="problem-heading" text="Why technical screening is broken." className="mt-4 max-w-2xl" />
            <div className="mt-20 grid gap-14 sm:grid-cols-3 sm:gap-10">
              {PROBLEMS.map((p, i) => (
                <Reveal key={p.title} delay={i * 150}>
                  <p.icon className="h-5 w-5 text-rose-400" aria-hidden="true" />
                  <h3 className="mt-5 font-serif text-2xl font-normal tracking-tight text-white">{p.title}</h3>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-zinc-400">{p.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Act II: How it works (sticky index, steps light up as they cross the middle) */}
        <section aria-labelledby="how-heading" className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-24 sm:px-8 sm:py-32">
            <div className="grid gap-16 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-20">
              <div className="md:sticky md:top-32 md:self-start">
                <Kicker>How it works</Kicker>
                <H2 id="how-heading" text="From a pile of profiles to a ranked shortlist." className="mt-4 !text-4xl sm:!text-5xl" />
                <ul className="mt-12 hidden space-y-3 md:block" aria-hidden="true">
                  {STEPS.map((s, i) => (
                    <li
                      key={s.n}
                      className={`flex items-center gap-4 text-sm transition-colors duration-500 ${
                        i === step ? "text-white" : "text-zinc-600"
                      }`}
                    >
                      <span
                        className={`h-px transition-all duration-500 ${
                          i === step ? "w-10 bg-emerald-400" : "w-5 bg-zinc-700"
                        }`}
                      />
                      <span className="font-mono text-xs">{s.n}</span>
                      <span>{s.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ol>
                {STEPS.map((s, i) => (
                  <li
                    key={s.n}
                    data-i={i}
                    ref={(el) => {
                      stepRefs.current[i] = el;
                    }}
                    className={`flex flex-col justify-center py-10 transition-opacity duration-700 md:min-h-[75vh] ${
                      i === step ? "opacity-100" : "md:opacity-25"
                    }`}
                  >
                    <span className="font-mono text-xs text-zinc-500">{s.n}</span>
                    <h3 className="mt-3 text-balance font-serif text-3xl font-normal tracking-tight text-white sm:text-4xl">
                      {s.title}
                    </h3>
                    <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-zinc-400">{s.body}</p>
                    <div className="mt-8 rounded-lg border border-border bg-card p-6">{s.visual}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Act III: Dossier preview */}
        <section aria-labelledby="dossier-heading" className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-24 sm:px-8 sm:py-32">
            <Kicker>See it answer</Kicker>
            <H2 id="dossier-heading" text="Every answer points back to the source." className="mt-4 max-w-3xl" />
            <Reveal className="mt-16">
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <p className="text-sm font-medium text-white">Alex Rivera</p>
                  <p className="text-xs text-zinc-500">Sample dossier</p>
                </div>
                <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <div className="flex flex-col gap-2 border-b border-border p-4 md:border-b-0 md:border-r">
                    {QUESTIONS.map((item, i) => (
                      <button
                        key={item.q}
                        type="button"
                        aria-pressed={i === active}
                        onClick={() => setActive(i)}
                        className={`cursor-pointer rounded-md border px-3.5 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          i === active
                            ? "border-zinc-700 bg-accent text-white"
                            : "border-transparent text-zinc-400 hover:bg-secondary hover:text-zinc-200"
                        }`}
                      >
                        {item.q}
                      </button>
                    ))}
                  </div>
                  <div className="min-h-[15rem] p-6 sm:p-8" aria-live="polite">
                    <div key={active} className="animate-[fadeIn_0.45s_ease-out] motion-reduce:animate-none">
                      <p className="text-pretty font-serif text-2xl leading-snug text-zinc-100">{current.a}</p>
                      <div className="mt-6 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[11px] ${current.tone}`}
                        >
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          {current.cite}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-500">Match {current.match}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Act IV: Metrics */}
        <section aria-label="System metrics" className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-24 sm:px-8 sm:py-32">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-14 lg:grid-cols-4">
              {METRICS.map((m, i) => (
                <Reveal key={m.value} delay={i * 120} className="border-l border-border pl-5">
                  <dt className="font-serif text-4xl font-normal tracking-tight text-white tabular-nums sm:text-5xl">
                    {m.value}
                  </dt>
                  <dd className="mt-3 text-sm leading-relaxed text-zinc-400">{m.label}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* Act V: Closing CTA */}
        <section aria-labelledby="cta-heading" className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-24 sm:px-8 sm:py-32">
            <div className="rounded-xl border border-border bg-gradient-to-b from-card to-well px-6 py-20 text-center sm:px-12 sm:py-28">
              <H2 id="cta-heading" text="Run the pipeline on a real candidate." className="mx-auto max-w-3xl" />
              <Reveal delay={500}>
                <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
                  Judges and engineering leads: launch the live demo, import a profile, and watch it get scored,
                  explained, and cited.
                </p>
                <div className="mt-10">
                  <CtaPair
                    center
                    onAnonymous={handleStartAnonymous}
                    onDemo={handleDemoLogin}
                    loading={loading}
                    demoLoading={demoLoading}
                    primaryLabel="Launch Live Demo"
                    secondaryLabel="Explore as Demo User"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span className="font-medium text-zinc-300">TalentRank AI</span>
          </div>
          <p className="text-center">Next.js 16.4 · MongoDB Atlas · Google Gemini · Better Auth</p>
        </div>
      </footer>

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
