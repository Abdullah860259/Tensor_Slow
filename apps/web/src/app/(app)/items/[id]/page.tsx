import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";
import { ArrowLeft, Gauge, HelpCircle, MessageSquareText, ShieldAlert, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { connectMongoose } from "@/lib/db";
import { ItemModel, JobCriteriaModel } from "@/lib/models";
import {
  candidateDisplayName,
  extractHeadline,
  formatYears,
  getScoreStyle,
  pad2,
  cleanCandidateProfileText,
} from "@/lib/candidate-ui";
import { FitBadge, Panel, ScoreRing, StatusBadge } from "@/components/ui/foundry";
import { Chat } from "@/components/ai/chat";
import { LinkedInLink, LinkedInSections } from "@/components/ui/linkedin-link";
import { parseProfileText } from "@/lib/candidate-profile";
import { normalizeLinkedinUrl } from "@/lib/sourcing/profiles";
import { ReevaluateButton } from "./reevaluate-button";
import { DeleteCandidateButton } from "./delete-candidate-button";
import { AspectBreakdown, readAspects, type AspectScore } from "./aspect-breakdown";
import { ProfileTabs } from "./profile-tabs";

type DossierFields = {
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  interviewQuestions: string[];
  verdict?: string;
  yearsOfExperience?: number;
  aspects: AspectScore[];
};

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
    : [];
}

function getDossierFields(value: unknown): DossierFields {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { strengths: [], weaknesses: [], redFlags: [], interviewQuestions: [], aspects: [] };
  }
  const fields = value as Record<string, unknown>;
  return {
    strengths: stringList(fields.strengths),
    weaknesses: stringList(fields.weaknesses),
    redFlags: stringList(fields.redFlags),
    interviewQuestions: stringList(fields.interviewQuestions),
    verdict: typeof fields.verdict === "string" ? fields.verdict : undefined,
    yearsOfExperience:
      typeof fields.yearsOfExperience === "number" && Number.isFinite(fields.yearsOfExperience)
        ? fields.yearsOfExperience
        : undefined,
    aspects: readAspects(fields.aspects),
  };
}

function delay(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` };
}

function BulletList({
  items,
  dot,
  empty,
}: {
  items: string[];
  dot: string;
  empty: string;
}): React.JSX.Element {
  if (items.length === 0) {
    return <p className="text-base text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={`${i}-${item}`} className="flex items-start gap-3 text-base leading-relaxed text-foreground">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function CandidateDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");
  if (!mongoose.isValidObjectId(id)) notFound();

  await connectMongoose();
  const [item, activeDoc] = await Promise.all([
    ItemModel.findOne({ _id: id, ownerId: session.user.id }).lean(),
    JobCriteriaModel.findOne({ ownerId: session.user.id, isActive: true }).lean(),
  ]);
  if (!item) notFound();

  const fields = getDossierFields(item.fields);
  const name = candidateDisplayName(item.title);
  const headline = extractHeadline(item.content);
  const score = typeof item.score === "number" ? item.score : undefined;
  const scoreStyle = getScoreStyle(score);
  const tags = item.aiTags ?? [];
  const verdict = fields.verdict || item.aiSummary || "";
  const rawText = typeof item.content === "string" ? item.content : "";
  const linkedinUrl = normalizeLinkedinUrl(item.sourceUrl);
  const profile = parseProfileText(rawText);
  const displayText = cleanCandidateProfileText(rawText) || rawText;

  // Prefer questions stored on the candidate; otherwise use the active role's rubric.
  const rubricQuestions = stringList(
    (activeDoc?.rubric as unknown as { interviewQuestions?: unknown } | undefined)
      ?.interviewQuestions,
  );
  const questions = fields.interviewQuestions.length > 0 ? fields.interviewQuestions : rubricQuestions;
  const gapItems = fields.weaknesses;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 pb-12">
      {/* Header */}
      <header className="tr-rise space-y-6">
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            aria-hidden="true"
          />
          Back to pipeline
        </Link>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-sans text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
              {name}
            </h1>
            {headline && (
              <p className="mt-2.5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
                {headline}
              </p>
            )}
            {linkedinUrl && (
              <div className="mt-4 space-y-3">
                <LinkedInLink href={linkedinUrl} name={name} variant="button" />
                <LinkedInSections href={linkedinUrl} name={name} />
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <ReevaluateButton itemId={String(item._id)} />
            <DeleteCandidateButton candidateId={String(item._id)} candidateName={name} />
          </div>
        </div>
      </header>

      {/* Executive verdict */}
      <section
        aria-labelledby="verdict-heading"
        style={delay(80)}
        className="tr-rise overflow-hidden rounded-xl border border-border bg-card shadow-xs"
      >
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <ScoreRing score={score} size={128} stroke={8} />
            <p className={`font-sans text-[13px] font-semibold tracking-wide uppercase ${scoreStyle.text}`}>
              Match score
            </p>
          </div>

          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="verdict-heading" className="text-sm font-sans font-medium uppercase tracking-wider text-muted-foreground">
                Hiring recommendation
              </h2>
              <FitBadge score={score} className="px-2.5 py-1 text-sm" />
              <StatusBadge status={item.status} />
            </div>

            {verdict ? (
              <p className="max-w-2xl font-sans text-xl leading-snug text-pretty text-foreground sm:text-2xl font-medium">
                {verdict}
              </p>
            ) : (
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                No verdict yet. Re-evaluate this candidate to generate one.
              </p>
            )}

            <dl className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-4">
              <div>
                <dt className="text-sm text-muted-foreground">Experience</dt>
                <dd className="mt-1">
                  {fields.yearsOfExperience === undefined ? (
                    <span className="text-sm text-muted-foreground">--</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="font-figure text-foreground text-lg tracking-tight tabular-nums">
                        {formatYears(fields.yearsOfExperience)}
                      </span>
                      <span className="text-[13px] font-sans font-medium text-muted-foreground">yrs</span>
                    </div>
                  )}
                </dd>
              </div>
              {tags.length > 0 && (
                <div className="min-w-0">
                  <dt className="text-sm text-muted-foreground">Signals</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {tags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 font-sans text-[13px] font-medium text-foreground transition-colors hover:bg-secondary/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      {/* Per-aspect scores */}
      <div style={delay(100)} className="tr-rise">
        <Panel
          title="Aspect breakdown"
          icon={Gauge}
          aside={fields.aspects.length ? `${fields.aspects.length} aspects` : undefined}
          bodyClassName="p-5 sm:p-6"
        >
          {fields.aspects.length > 0 ? (
            <AspectBreakdown aspects={fields.aspects} />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-zinc-400">
                This candidate was evaluated before aspect scoring existed. Re-evaluate to rate technical skills,
                experience, domain fit, leadership, stability and logistics separately.
              </p>
              <ReevaluateButton itemId={String(item._id)} />
            </div>
          )}
        </Panel>
      </div>

      {/* Executive Candidate Summary */}
      {item.aiSummary && (
        <section
          aria-labelledby="summary-heading"
          style={delay(120)}
          className="tr-rise overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xs sm:p-7"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3.5 mb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 id="summary-heading" className="text-base font-sans font-semibold tracking-tight text-foreground">
                Executive Profile Summary
              </h2>
            </div>
            <span className="font-mono text-[13px] text-muted-foreground">AI Synthesized Narrative</span>
          </div>
          <p className="text-base leading-relaxed text-foreground">
            {item.aiSummary}
          </p>
        </section>
      )}

      {/* Competency audit */}
      <div style={delay(160)} className="tr-rise grid gap-4 md:grid-cols-2">
        <Panel title="Strengths and stated evidence" icon={ShieldCheck} aside={pad2(fields.strengths.length)} bodyClassName="p-5">
          <BulletList
            items={fields.strengths}
            dot="bg-success"
            empty="No strengths were extracted from this profile."
          />
        </Panel>

        <Panel
          title="Discrepancies, gaps and red flags"
          icon={ShieldAlert}
          aside={pad2(gapItems.length + fields.redFlags.length)}
          bodyClassName="p-5"
        >
          {gapItems.length === 0 && fields.redFlags.length === 0 ? (
            <p className="text-base text-muted-foreground">No gaps or red flags were detected.</p>
          ) : (
            <div className="space-y-5">
              {fields.redFlags.length > 0 && (
                <BulletList items={fields.redFlags} dot="bg-destructive" empty="" />
              )}
              {gapItems.length > 0 && <BulletList items={gapItems} dot="bg-amber-500" empty="" />}
            </div>
          )}
        </Panel>
      </div>

      {/* Screening questions */}
      {questions.length > 0 && (
        <section aria-labelledby="questions-heading" style={delay(220)} className="tr-rise space-y-5">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2
              id="questions-heading"
              className="font-sans text-2xl font-bold tracking-tight text-foreground"
            >
              Screening interview questions
            </h2>
          </div>
          <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {questions.map((question, i) => (
              <li key={`${i}-${question}`} className="flex items-start gap-4 px-5 py-4">
                <span className="mt-0.5 font-mono text-sm font-semibold text-primary tabular-nums">{pad2(i + 1)}</span>
                <p className="text-base leading-relaxed text-foreground">{question}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Profile, split into sections */}
      <section aria-labelledby="profile-heading" style={delay(280)} className="tr-rise space-y-4">
        <div className="flex items-center gap-2.5">
          <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 id="profile-heading" className="font-sans text-xl font-bold tracking-tight text-foreground">
            Profile
          </h2>
        </div>
        <ProfileTabs profile={profile} rawText={displayText} />
      </section>

      {/* RAG copilot */}
      <section aria-labelledby="copilot-heading" style={delay(340)} className="tr-rise space-y-5">
        <div>
          <div className="flex items-center gap-2.5">
            <MessageSquareText className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2
              id="copilot-heading"
              className="font-sans text-2xl font-bold tracking-tight text-foreground"
            >
              Ask this dossier
            </h2>
          </div>
          <p className="mt-1.5 text-base text-muted-foreground">
            Query the candidate&apos;s actual experience. Answers cite the section they came from.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <Chat itemId={String(item._id)} />
        </div>
      </section>
    </div>
  );
}
