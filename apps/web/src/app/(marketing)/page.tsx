"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Database,
  EyeOff,
  FileText,
  Loader2,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { SmoothScroll } from "@/components/smooth-scroll";

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

/** Headline text that resolves word by word. */
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

/* ================================================================== */
/* Typography + shared UI (Archon standard: Inter headings, Caslon figures) */
/* ================================================================== */

function Kicker({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/80 px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
      {children}
    </span>
  );
}

function H2({ id, text, className = "" }: { id?: string; text: string; className?: string }): React.JSX.Element {
  return (
    <h2
      id={id}
      className={`font-sans text-balance text-4xl font-medium tracking-[-0.03em] text-foreground sm:text-5xl sm:leading-[1.12] ${className}`}
    >
      <Words text={text} />
    </h2>
  );
}

/* ================================================================== */
/* Content                                                             */
/* ================================================================== */

const HERO_TAGS = [
  { label: "Scraping senior candidates via Apify actor", status: "Done", type: "done" },
  { label: "Ingesting alex_rivera_resume.pdf via OCR", status: "Done", type: "done" },
  { label: "Generating 768-D Gemini vector embedding", status: "Done", type: "done" },
  { label: "Evaluating Staff Engineer rubric criteria", status: "Active", type: "active" },
  { label: "Flagging overlapping tenure anomaly (-12 pts)", status: "Active", type: "active" },
  { label: "Verifying cited Next.js & AWS production claims", status: "Active", type: "active" },
  { label: "Computing deterministic 0–100 match score", status: "Queued", type: "queued" },
  { label: "Publishing candidate to live leaderboard", status: "Queued", type: "queued" },
] as const;

const cardContents = [
  {
    title: "Deterministic Rubric Scoring",
    description:
      "Compile plain-English job specs into calibrated 0–100 evaluations across Must-Haves, Nice-to-Haves, and Red Flags with zero scoring hallucinations or model drift.",
    span: "lg:col-span-3 lg:row-span-2",
  },
  {
    title: "Verifiable Grounded Citations",
    description:
      "Every assessment claim anchors directly to an exact, quoted text span in the candidate's resume or repository. If an accomplishment cannot be verified, it is never credited.",
    span: "lg:col-span-3 lg:row-span-2",
  },
  {
    title: "Blind Anti-Bias Screening",
    description:
      "Design an objective, equitable technical hiring pipeline. TalentRank strips candidate names, demographic markers, graduation dates, and university prestige bias before evaluation begins. Our multi-agent evaluator measures candidates strictly against demonstrated architecture decisions, open-source execution, and verified engineering competencies. With verifiable audit trails, hiring teams ensure equitable standards across every candidate cohort without sacrificing technical rigor.",
    span: "lg:col-span-4 lg:row-span-1",
  },
  {
    title: "Sub-Second Multimodal Ingestion",
    description:
      "Ingest complex multi-page PDFs, LinkedIn URLs, and GitHub repos into 768-D Gemini vector embeddings in MongoDB Atlas in under 850ms.",
    span: "lg:col-span-2 lg:row-span-1",
  },
  {
    title: "Tenure & Risk Anomaly Detection",
    description:
      "Automatically detect frequent short-tenure hops, unexplained career timeline gaps, and inflated seniority claims before scheduling initial screens.",
    span: "lg:col-span-2 lg:row-span-1",
  },
];

const CornerPlusIcons = () => (
  <>
    <PlusIcon className="absolute -top-3 -left-3" />
    <PlusIcon className="absolute -top-3 -right-3" />
    <PlusIcon className="absolute -bottom-3 -left-3" />
    <PlusIcon className="absolute -bottom-3 -right-3" />
  </>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={24}
    height={24}
    strokeWidth="1.25"
    stroke="currentColor"
    className={cn("size-6 text-zinc-600 transition-colors group-hover:text-zinc-300", className)}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
);

const PlusCard: React.FC<{
  className?: string;
  title: string;
  description: string;
}> = ({
  className = "",
  title,
  description,
}) => {
  return (
    <div
      className={cn(
        "group relative border border-dashed border-[#262626] bg-[#141414] p-6 min-h-[200px] rounded-none",
        "flex flex-col justify-between transition-colors hover:border-[#3a3a3a]",
        className
      )}
    >
      <CornerPlusIcons />
      <div className="relative z-10 space-y-2">
        <h3 className="font-sans text-xl font-medium tracking-tight text-white">
          {title}
        </h3>
        <p className="font-sans text-sm leading-relaxed text-zinc-400">{description}</p>
      </div>
    </div>
  );
};



const METRICS = [
  { value: "< 850ms", label: "Parsing and ingestion latency" },
  { value: "768-D", label: "Multimodal vector embeddings in MongoDB Atlas" },
  { value: "100%", label: "Deterministic rubric scoring" },
  { value: "0%", label: "Unconscious screening bias" },
];

const FAQS = [
  {
    q: "How does TalentRank eliminate hallucinations in candidate scoring?",
    a: "Unlike standard LLMs that generate arbitrary ratings, TalentRank uses a deterministic two-phase pipeline. First, candidates are indexed into a 768-D vector space in MongoDB Atlas. Second, our rubric evaluator requires every score factor to cite an exact, verifiable sentence in the source resume or profile. If an answer cannot be grounded in source text, it is flagged as unverified.",
  },
  {
    q: "Can I customize the evaluation criteria and red flags?",
    a: "Yes. You can define custom job roles using plain English or structured criteria. The engine automatically partitions requirements into Must-Haves, Nice-to-Haves, and critical Red Flags (such as frequent short tenures or missing core competencies).",
  },
  {
    q: "How does the anonymous demo session work?",
    a: "Clicking 'Launch Live Demo' creates an instant, anonymous session backed by Better Auth with zero sign-up friction. You can explore the candidate leaderboard, upload test profiles, and chat with candidate dossiers immediately.",
  },
  {
    q: "What file formats and data sources are supported?",
    a: "TalentRank accepts PDF resumes, DOCX documents, raw markdown/text profiles, and direct LinkedIn profile data URLs. Ingestion and semantic indexing complete in under 850ms.",
  },
  {
    q: "How does TalentRank prevent demographic bias?",
    a: "Our blind evaluation mode decouples identity markers (names, gender, age, photos, educational pedigree) from technical skill and execution evidence, ensuring candidates are ranked solely on verified engineering competency.",
  },
];

/* Tutorial visuals ------------------------------------------------- */

function IngestVisual(): React.JSX.Element {
  return (
    <div className="space-y-4 font-sans">
      {/* File Header Bar */}
      <div className="flex items-center justify-between rounded-lg border border-border/80 bg-secondary/40 p-3 sm:p-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-sans text-sm font-semibold text-foreground">
                alex_rivera_resume.pdf
              </span>
              <span className="shrink-0 rounded-xs bg-muted px-1.5 py-0.5 font-sans text-xs text-muted-foreground">
                212 KB
              </span>
            </div>
            <p className="mt-0.5 truncate font-sans text-xs text-muted-foreground">
              Staff Distributed Systems & Next.js Architect
            </p>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 font-sans text-xs font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Parsed
        </span>
      </div>

      {/* Processing Stages */}
      <div className="space-y-2 font-sans text-sm">
        <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 transition-colors hover:border-foreground/30">
          <div className="flex items-center gap-2.5 text-foreground">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-sans text-sm">High-precision text OCR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-muted-foreground">4,812 chars</span>
            <span className="rounded-xs bg-primary/10 px-1.5 py-0.5 font-sans text-xs text-primary font-medium">38 ms</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 transition-colors hover:border-foreground/30">
          <div className="flex items-center gap-2.5 text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-sans text-sm">Gemini text-embedding-004</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-primary font-medium">768 dimensions</span>
            <span className="rounded-xs bg-primary/10 px-1.5 py-0.5 font-sans text-xs text-primary font-medium">412 ms</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 transition-colors hover:border-foreground/30">
          <div className="flex items-center gap-2.5 text-foreground">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-sans text-sm">MongoDB Atlas Vector Search</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-muted-foreground">candidates_idx</span>
            <span className="rounded-xs bg-success/15 px-1.5 py-0.5 font-sans text-xs text-success font-medium">Indexed</span>
          </div>
        </div>
      </div>

      {/* Extracted competency tokens */}
      <div className="pt-1">
        <div className="mb-2 flex items-center justify-between font-sans text-xs text-muted-foreground">
          <span>Identified competencies</span>
          <span className="font-sans text-xs text-success font-medium">100% vector fidelity</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Next.js App Router", "MongoDB Vector", "Distributed Architecture", "AWS ECS", "Go & Python"].map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md border border-border bg-secondary/60 px-2.5 py-1 font-sans text-xs font-medium text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const CRITERIA_PROMPTS = [
  {
    role: "Senior Backend Engineer",
    notes:
      "Need a backend Engineer with 3+ expereince and expereince in mongoDB, PostgreSql etc. Distributed systems architecture is a strong plus. Avoid candidates with repeated tenures under a year.",
    rubric: [
      { type: "Must have", text: "3+ years experience with MongoDB and PostgreSQL", dot: "bg-primary" },
      { type: "Must have", text: "Distributed systems architecture & API scalability", dot: "bg-primary" },
      { type: "Nice to have", text: "Microservices design & Docker containerization", dot: "bg-muted-foreground" },
      { type: "Red flag", text: "Repeated tenures under one year / high churn", dot: "bg-destructive" },
    ],
  },
  {
    role: "Senior React / Next.js Engineer",
    notes:
      "3+ years with React and Next.js App Router. Scalable cloud architecture. EdTech background is a strong plus. Avoid candidates with repeated tenures under a year.",
    rubric: [
      { type: "Must have", text: "3+ years of React and Next.js App Router", dot: "bg-primary" },
      { type: "Must have", text: "Scalable cloud architecture on AWS", dot: "bg-primary" },
      { type: "Nice to have", text: "EdTech or education background", dot: "bg-muted-foreground" },
      { type: "Red flag", text: "Multiple tenures under one year", dot: "bg-destructive" },
    ],
  },
  {
    role: "Full-Stack AI Engineer",
    notes:
      "Seeking a Full-Stack AI Engineer with Python, FastAPI, and vector embeddings in MongoDB Atlas. Experience evaluating LLM pipelines. Strong TypeScript background required.",
    rubric: [
      { type: "Must have", text: "Python, FastAPI, and 768-D vector search in Atlas", dot: "bg-primary" },
      { type: "Must have", text: "Gemini / OpenAI API orchestration pipelines", dot: "bg-primary" },
      { type: "Nice to have", text: "Full-stack Next.js App Router capabilities", dot: "bg-muted-foreground" },
      { type: "Red flag", text: "Theoretical AI only with no production web apps", dot: "bg-destructive" },
    ],
  },
];

function CriteriaVisual(): React.JSX.Element {
  const [promptIdx, setPromptIdx] = useState(0);
  const [typedRole, setTypedRole] = useState("");
  const [typedNotes, setTypedNotes] = useState("");
  const [isTypingRole, setIsTypingRole] = useState(true);
  const [isTypingNotes, setIsTypingNotes] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const current = CRITERIA_PROMPTS[promptIdx] ?? CRITERIA_PROMPTS[0]!;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isTypingRole) {
      if (typedRole.length < current.role.length) {
        timeoutId = setTimeout(() => {
          setTypedRole(current.role.slice(0, typedRole.length + 1));
        }, 40);
      } else {
        timeoutId = setTimeout(() => {
          setIsTypingRole(false);
          setIsTypingNotes(true);
        }, 350);
      }
      return () => clearTimeout(timeoutId);
    }

    if (isTypingNotes) {
      if (typedNotes.length < current.notes.length) {
        timeoutId = setTimeout(() => {
          setTypedNotes(current.notes.slice(0, typedNotes.length + 1));
        }, 22);
      } else {
        timeoutId = setTimeout(() => {
          setIsTypingNotes(false);
          setIsExpanding(true);
        }, 600);
      }
      return () => clearTimeout(timeoutId);
    }

    if (isExpanding) {
      timeoutId = setTimeout(() => {
        setIsExpanding(false);
        setIsExpanded(true);
      }, 750);
      return () => clearTimeout(timeoutId);
    }

    if (isExpanded) {
      timeoutId = setTimeout(() => {
        setIsExpanded(false);
        setTypedRole("");
        setTypedNotes("");
        setPromptIdx((prev) => (prev + 1) % CRITERIA_PROMPTS.length);
        setIsTypingRole(true);
      }, 4500);
      return () => clearTimeout(timeoutId);
    }
  }, [current, typedRole, typedNotes, isTypingRole, isTypingNotes, isExpanding, isExpanded]);

  const handleInstantExpand = () => {
    setTypedRole(current.role);
    setTypedNotes(current.notes);
    setIsTypingRole(false);
    setIsTypingNotes(false);
    setIsExpanding(false);
    setIsExpanded(true);
  };

  return (
    <div className="-m-6 p-6 space-y-4 bg-white text-zinc-900 rounded-xl">
      {/* Header with pill badge and close icon */}
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 font-sans text-[11px] font-medium text-white">
          No active role
        </span>
        <button
          type="button"
          onClick={() => {
            setTypedRole("");
            setTypedNotes("");
            setIsExpanded(false);
            setPromptIdx((p) => (p + 1) % CRITERIA_PROMPTS.length);
            setIsTypingRole(true);
          }}
          className="text-zinc-400 hover:text-zinc-700 text-sm font-sans transition-colors cursor-pointer"
          aria-label="Next sample role"
        >
          ✕
        </button>
      </div>

      <p className="font-sans text-xs sm:text-[13px] text-zinc-600 leading-relaxed">
        Describe the role in rough notes. AI expands them into a scoring rubric that every candidate is evaluated against.
      </p>

      {/* Hairline divider */}
      <div className="-mx-6 border-b border-zinc-200" />

      {/* Form Fields */}
      <div className="space-y-3.5 pt-1">
        <div>
          <label className="block font-sans text-xs font-medium text-zinc-700 mb-1.5">
            Role title <span className="text-destructive">*</span>
          </label>
          <div className="h-10 w-full rounded-lg border border-black/20 bg-white px-3.5 flex items-center font-sans text-xs sm:text-sm text-black shadow-xs">
            <span className="text-black font-medium">{typedRole}</span>
            {isTypingRole && <span className="inline-block w-0.5 h-4 bg-black ml-0.5 animate-pulse" />}
          </div>
        </div>

        <div>
          <label className="block font-sans text-xs font-medium text-zinc-700 mb-1.5">
            Requirements and notes <span className="text-destructive">*</span>
          </label>
          <div className="min-h-[105px] w-full rounded-lg border border-black/20 bg-white p-3.5 font-sans text-xs sm:text-sm text-black leading-relaxed shadow-xs relative">
            <span className="whitespace-pre-wrap text-black">{typedNotes}</span>
            {(isTypingNotes || (!isExpanded && !isExpanding && !isTypingRole)) && (
              <span className="inline-block w-0.5 h-4 bg-black ml-0.5 align-middle animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={handleInstantExpand}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-sans text-xs font-medium text-white transition-all shadow-xs cursor-pointer",
            isExpanded
              ? "bg-primary text-white"
              : isExpanding
              ? "bg-zinc-700 animate-pulse text-white"
              : "bg-zinc-600 hover:bg-zinc-700 text-white"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {isExpanding ? "Expanding criteria..." : isExpanded ? "Criteria Expanded" : "AI Expand Criteria"}
          </span>
        </button>
      </div>

      {/* Expanded Rubric Preview */}
      {isExpanded && (
        <div className="mt-4 pt-3.5 border-t border-zinc-200 space-y-2 animate-[fadeIn_0.35s_ease-out]">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Expanded Deterministic Rubric
          </p>
          <ul className="space-y-2">
            {current.rubric.map((r) => (
              <li key={r.text} className="flex items-start gap-2.5 text-xs font-sans">
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", r.dot)} />
                <span className="text-zinc-900">
                  <span className="font-mono text-[10px] text-zinc-500 mr-1.5 font-medium">{r.type}</span>
                  {r.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal footer Close link */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleInstantExpand}
          className="font-sans text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function RankVisual(): React.JSX.Element {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Alex Rivera</p>
          <p className="text-xs text-muted-foreground">Senior Frontend Engineer</p>
        </div>
        <div className="text-right">
          <p className="font-figure text-3xl font-normal tabular-nums text-foreground">94</p>
          <span className="inline-block rounded-full border border-success/30 bg-success/15 px-2 py-0.5 font-mono text-[10px] font-medium text-success">
            Strong Fit
          </span>
        </div>
      </div>
      <div className="mt-4 flex h-1.5 gap-[3px]" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`flex-1 rounded-full ${i < 9 ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["react", "nextjs", "edtech", "aws"].map((t) => (
          <span key={t} className="rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] text-foreground">
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
      <p className="text-muted-foreground">Where has Alex worked with Next.js?</p>
      <p className="leading-relaxed text-foreground">
        Alex led the App Router migration at Coursera and built the learner dashboard in Next.js.
      </p>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-primary">
        <CheckCircle2 className="h-3 w-3 text-primary" aria-hidden="true" />
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
    body: "Upload resumes via drag-and-drop PDF, paste raw text, or pull live talent directly from LinkedIn with our Apify integration. Structured OCR extracts full career history, generating 768-dimension Gemini vector embeddings in MongoDB Atlas in under half a second.",
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
    title: "Get a deterministic score from 0 to 100.",
    body: "Every candidate is scored against the same rubric, with a transparent breakdown and a clear band: Strong Fit, Potential, or Unqualified.",
    visual: <RankVisual />,
  },
  {
    n: "04",
    label: "Ask",
    title: "Ask questions and see verifiable evidence.",
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
  const [step, setStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
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

  /* Which tutorial step is crossing the middle of the viewport */
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SmoothScroll />
      {/* Navigation matching Archon */}
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between border-x border-border/80 px-6 sm:px-12">
          {/* Logo with TalentRank brand mark */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white shadow-2xs overflow-hidden p-0.5">
              <img src="/logo.png" alt="TalentRank" className="h-5 w-5 object-contain" />
            </span>
            <span className="font-sans text-base font-semibold tracking-tight text-foreground">TalentRank</span>
          </div>

          {/* Center nav links */}
          <nav className="hidden items-center gap-7 md:flex">
            {[
              { label: "Process", href: "#process" },
              { label: "Features", href: "#features" },
              { label: "FAQs", href: "#faqs" },
              { label: "About", href: "/about" },
              { label: "Live Demo", href: "#demo" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-sans text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
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

      <main className="flex-1">
        {/* Hero Section Framed with Archon Hairlines */}
        <section className="relative overflow-hidden bg-background">
          <div className="mx-auto max-w-6xl border-x border-border/80 px-6 pt-16 pb-14 text-center sm:px-12 sm:pt-20">
            {/* Archon-style sliding task tags */}
            <Reveal>
              <div
                className="relative mx-auto mb-10 h-[216px] w-full max-w-[394px] overflow-hidden"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
                }}
              >
                <div className="flex flex-col gap-2.5 animate-hero-tags hover:[animation-play-state:paused]">
                  {[...HERO_TAGS, ...HERO_TAGS].map((task, i) => (
                    <div
                      key={`${task.label}-${i}`}
                      className="flex h-[47px] w-full shrink-0 select-none items-center justify-between border border-border bg-card px-3.5 shadow-xs"
                    >
                      <span className="truncate mr-3 font-sans text-[15px] text-foreground font-normal">
                        {task.label}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 px-2 py-0.5 font-sans text-[13px] font-medium rounded-none border",
                          task.type === "done" && "border-[#48b76833] bg-[#48b7681f] text-[#48b768]",
                          task.type === "active" && "border-[#4365fa33] bg-[#4365fa24] text-[#4365fa]",
                          task.type === "queued" && "border-border/60 bg-black/5 dark:bg-white/5 text-muted-foreground"
                        )}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Main heading: Arial regular 48px */}
            <h1 className="mx-auto max-w-4xl font-arial text-balance text-[48px] font-normal leading-[1.15] text-foreground">
              <Words text="Autonomous AI Recruitment That Discovers Your Best Engineers." step={60} delay={100} />
            </h1>

            {/* Sub heading: Arial regular 16px */}
            <Reveal delay={600}>
              <p className="mx-auto mt-6 max-w-xl font-arial text-[16px] font-normal leading-relaxed text-muted-foreground">
                We design and deploy multi-agent AI systems for technical recruitment. Replacing manual screening
                and keyword filters with deterministic, evidence-backed evaluation that operates 24/7.
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal delay={850}>
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
                  className="h-12 rounded-none border border-border bg-card px-8 font-sans text-base font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  {demoLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <User className="mr-1 h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                  Explore as Demo User
                </Button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </Reveal>
          </div>

          {/* Core Technologies & Integrations strip */}
          <div className="border-y border-border bg-card/40 py-8">
            <div className="mx-auto max-w-6xl border-x border-border/80 px-6 sm:px-12">
              <p className="mb-6 text-center font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Core Technologies & Integrations
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16">
                {[
                  {
                    name: "Google Gemini",
                    icon: (
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
                      </svg>
                    ),
                  },
                  {
                    name: "MongoDB Atlas",
                    icon: (
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 0a1.86 1.86 0 0 0-.4.1c-.63.27-1.42 1.25-2.13 2.23-2.31 3.17-4.97 8.24-4.97 12.59 0 4.89 3.38 8.53 7.5 9.09.68-.08 1.08-.39 1.23-.69.34-.68.21-1.39.21-2.19V11.46c0-.36.03-.71.1-1.05.62-3.03 2.1-4.62 2.74-5.24.4-.38.77-.66.86-.73a1.86 1.86 0 0 0-.44-.44C15.17 2.7 13.32.74 12 0zm0 2.17c1.19 1.7 2.8 4.2 3.14 7.64.05.51.08 1.03.08 1.57 0 2.65-1.07 4.81-3.07 6.13-.05.03-.1.06-.15.08V2.17zm-.99 2.05v15.93c-3.13-.58-5.51-3.41-5.51-7.24 0-3.66 2.28-7.98 4.29-10.74.45-.63.88-1.2 1.22-1.74v3.79z" />
                      </svg>
                    ),
                  },
                  {
                    name: "Next.js",
                    icon: (
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.82 17.51L9.67 6.84h2.24l5.95 8.18c-.68.87-1.38 1.7-2.04 2.49zM7.8 7.02h1.86v9.96H7.8V7.02z" />
                      </svg>
                    ),
                  },
                  {
                    name: "Apify",
                    icon: (
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="4" y="9" width="16" height="11" rx="2" />
                        <circle cx="12" cy="4" r="2" />
                        <path d="M12 6v3" />
                        <circle cx="9" cy="14" r="1" fill="currentColor" />
                        <circle cx="15" cy="14" r="1" fill="currentColor" />
                      </svg>
                    ),
                  },
                  {
                    name: "Vercel",
                    icon: (
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 1L24 22H0L12 1Z" />
                      </svg>
                    ),
                  },
                ].map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center gap-2.5 font-sans text-sm font-semibold tracking-tight text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {tool.icon}
                    <span>{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Process Section (How It Works with Archon Sticky Split) */}
        <section id="process" aria-labelledby="how-heading" className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl border-x border-border/80 px-6 py-24 sm:px-12 sm:py-32">
            <div className="grid gap-16 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-20">
              <div className="md:sticky md:top-32 md:self-start">
                <Kicker>How it works</Kicker>
                <H2 id="how-heading" text="Multi-agent precision scoping candidates to job profiles." className="mt-4 !text-4xl sm:!text-5xl" />
                <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground">
                  Every stage is transparent, deterministic, and verifiable down to the exact document text.
                </p>
                <ul className="mt-12 hidden space-y-3 md:block" aria-hidden="true">
                  {STEPS.map((s, i) => (
                    <li
                      key={s.n}
                      className={`flex items-center gap-4 text-sm font-sans transition-colors duration-500 ${
                        i === step ? "text-foreground font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-px transition-all duration-500 ${
                          i === step ? "w-10 bg-foreground" : "w-5 bg-border"
                        }`}
                      />
                      <span className="font-figure text-sm text-foreground">{s.n}</span>
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
                    className={`flex flex-col justify-center py-16 sm:py-20 transition-opacity duration-700 md:min-h-[78vh] ${
                      i === step ? "opacity-100" : "md:opacity-30"
                    }`}
                  >
                    <span className="font-figure text-sm text-muted-foreground">{s.n}</span>
                    <h3 className="mt-3.5 font-sans text-balance text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                      {s.title}
                    </h3>
                    <p className="mt-4.5 max-w-md font-sans text-pretty text-base leading-relaxed text-muted-foreground">{s.body}</p>
                    <div className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-7 shadow-xs">{s.visual}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Metrics Strip: Compact size */}
        <section aria-label="System metrics" className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-6xl border-x border-border/80 px-6 py-10 sm:px-12 sm:py-14">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
              {METRICS.map((m, i) => (
                <Reveal key={m.value} delay={i * 100} className="border-l-2 border-primary pl-4">
                  <dt className="font-figure text-2xl font-normal tracking-tight text-foreground tabular-nums sm:text-3xl">
                    {m.value}
                  </dt>
                  <dd className="mt-1.5 font-sans text-xs leading-normal text-muted-foreground">{m.label}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* Core Capabilities (Bento Grid) - Inverted Dark Section */}
        <section id="features" aria-labelledby="features-heading" className="border-t border-[#222222] bg-[#0A0A0A] text-white">
          <div className="mx-auto max-w-6xl border-x border-[#222222] px-6 py-20 sm:px-12 sm:py-28">
            <div className="mb-10 sm:mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-widest text-zinc-300">
                Core capabilities
              </span>
            </div>

            {/* Responsive Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-auto gap-4">
              {cardContents.map((card) => (
                <PlusCard
                  key={card.title}
                  title={card.title}
                  description={card.description}
                  className={card.span}
                />
              ))}
            </div>

            {/* Section Footer Heading */}
            <div className="max-w-2xl ml-auto text-right px-4 mt-8 lg:-mt-20">
              <h2 id="features-heading" className="font-sans text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-white mb-4">
                Built for precision. Engineered for technical truth.
              </h2>
              <p className="font-sans text-base sm:text-lg leading-relaxed text-zinc-400">
                TalentRank gives engineering leaders and hiring teams an objective, hallucination-free evaluation engine. Every candidate is benchmarked against deterministic rubrics with verifiable proof down to the exact source text.
              </p>
            </div>
          </div>
        </section>



        {/* FAQ Section */}
        <section id="faqs" className="border-t border-border bg-card/20">
          <div className="mx-auto max-w-6xl border-x border-border/80 px-6 py-24 sm:px-12 sm:py-32">
            <div className="grid gap-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
              <div>
                <Kicker>FAQs</Kicker>
                <H2 text="Everything you need to know about TalentRank." className="mt-4 !text-3xl sm:!text-4xl" />
                <p className="mt-4 font-sans text-sm text-muted-foreground">
                  Have questions about deterministic evaluation, vector indexing, or how we protect candidate data? We have answers.
                </p>
              </div>
              <div className="space-y-4">
                {FAQS.map((faq, idx) => (
                  <div key={faq.q} className="overflow-hidden rounded-xl border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="flex w-full items-center justify-between p-5 text-left font-sans text-base font-medium text-foreground transition-colors hover:bg-secondary/40 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs">
                        {openFaq === idx ? "−" : "+"}
                      </span>
                    </button>
                    {openFaq === idx && (
                      <div className="border-t border-border px-5 py-4 font-sans text-sm leading-relaxed text-muted-foreground">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pre-Footer CTA */}
        <section id="demo" className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl border-x border-border/80 px-6 py-20 sm:px-12 sm:py-28">
            <div className="rounded-2xl border border-border bg-card p-10 text-center sm:p-16 shadow-xs">
              <h2 className="mx-auto max-w-2xl font-sans text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
                Ready to identify your highest-yield engineering talent?
              </h2>
              <p className="mx-auto mt-4 max-w-xl font-sans text-base text-muted-foreground">
                Launch an anonymous demo session with a single click. Ingest real resumes, inspect 0–100 rubric scores, and chat with evidence-grounded dossiers.
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

      {/* Footer matching Archon's minimal layout */}
      <footer className="border-t border-border bg-card text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl border-x border-border/80 px-6 py-16 sm:px-12">
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
                <li><a href="#process" className="hover:text-foreground transition-colors">How It Works</a></li>
                <li><a href="#features" className="hover:text-foreground transition-colors">Core Capabilities</a></li>
                <li><a href="#process" className="hover:text-foreground transition-colors">Deterministic Rubrics</a></li>
                <li><a href="/about" className="hover:text-foreground transition-colors">About Our Team</a></li>
                <li><a href="#demo" className="hover:text-foreground transition-colors">Live Evaluation Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-sans text-sm font-semibold uppercase tracking-wider text-foreground">Stack</h4>
              <ul className="mt-4 space-y-3 font-sans text-sm">
                <li><span className="text-muted-foreground">Next.js 16.4</span></li>
                <li><span className="text-muted-foreground">MongoDB Atlas 768-D</span></li>
                <li><span className="text-muted-foreground">Google Gemini 2.5</span></li>
                <li><span className="text-muted-foreground">Better Auth</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-sans text-sm font-semibold uppercase tracking-wider text-foreground">Resources</h4>
              <ul className="mt-4 space-y-3 font-sans text-sm">
                <li><a href="#faqs" className="hover:text-foreground transition-colors">System FAQs</a></li>
                <li><a href="/dashboard" className="hover:text-foreground transition-colors">Live Dashboard</a></li>
                <li><a href="#demo" className="hover:text-foreground transition-colors">Interactive Demo</a></li>
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
              Built for the AICON Hackathon
            </p>
          </div>
        </div>
      </footer>

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
