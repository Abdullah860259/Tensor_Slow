"use client";

import React from "react";
import { Award, Briefcase, FileText, GraduationCap, Languages, MapPin, UserRound, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ParsedProfile } from "@/lib/candidate-profile";

const TRIGGER_CLASS =
  "gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white data-[state=active]:bg-white data-[state=active]:text-zinc-950";

function Empty({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="text-sm text-zinc-500">{children}</p>;
}

/** Candidate profile split into tabs: overview, experience, education, skills, certifications, languages, raw text. */
export function ProfileTabs({ profile, rawText }: { profile: ParsedProfile; rawText: string }): React.JSX.Element {
  const tabs: { value: string; label: string; icon: LucideIcon; count?: number; show: boolean }[] = [
    { value: "overview", label: "Overview", icon: UserRound, show: profile.structured },
    { value: "experience", label: "Experience", icon: Briefcase, count: profile.experience.length, show: profile.experience.length > 0 },
    { value: "education", label: "Education", icon: GraduationCap, count: profile.education.length, show: profile.education.length > 0 },
    { value: "skills", label: "Skills", icon: Wrench, count: profile.skills.length, show: profile.skills.length > 0 },
    { value: "certifications", label: "Certifications", icon: Award, count: profile.certifications.length, show: profile.certifications.length > 0 },
    { value: "languages", label: "Languages", icon: Languages, count: profile.languages.length, show: profile.languages.length > 0 },
    { value: "raw", label: "Raw text", icon: FileText, show: true },
  ];
  const visible = tabs.filter((t) => t.show);

  return (
    <Tabs defaultValue={visible[0]?.value ?? "raw"}>
      <TabsList aria-label="Profile sections" className="h-auto flex-wrap justify-start gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
        {visible.map(({ value, label, icon: Icon, count }) => (
          <TabsTrigger key={value} value={value} className={TRIGGER_CLASS}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
            {count !== undefined && <span className="opacity-60 tabular-nums">{count}</span>}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-4 rounded-lg border border-border bg-card p-5 sm:p-6">
        <TabsContent value="overview" className="mt-0 space-y-4">
          {profile.headline && <p className="text-base leading-relaxed text-zinc-100">{profile.headline}</p>}
          <div className="flex flex-wrap gap-2">
            {profile.location && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300">
                <MapPin className="h-3 w-3 text-zinc-500" aria-hidden="true" />
                {profile.location}
              </span>
            )}
            {profile.openToWork && (
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                Open to work
              </span>
            )}
            {profile.experience[0] && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300">
                <Briefcase className="h-3 w-3 text-zinc-500" aria-hidden="true" />
                {profile.experience[0].title}
                {profile.experience[0].company ? ` at ${profile.experience[0].company}` : ""}
              </span>
            )}
          </div>
          {profile.summary ? (
            <p className="max-w-3xl text-sm leading-relaxed whitespace-pre-line text-zinc-300">{profile.summary}</p>
          ) : (
            <Empty>No summary on this profile.</Empty>
          )}
        </TabsContent>

        <TabsContent value="experience" className="mt-0">
          <ol className="relative space-y-6 border-l border-white/10 pl-5">
            {profile.experience.map((role, i) => (
              <li key={`${i}-${role.title}`} className="relative">
                <span
                  className={`absolute top-1.5 -left-[25px] h-2 w-2 rounded-full ${
                    role.end && /present/i.test(role.end) ? "bg-emerald-400" : "bg-zinc-600"
                  }`}
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-white">{role.title}</h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {[role.company, role.start && `${role.start} – ${role.end ?? "Present"}`, role.meta]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {role.description && (
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">{role.description}</p>
                )}
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="education" className="mt-0">
          <ul className="space-y-4">
            {profile.education.map((edu, i) => (
              <li key={`${i}-${edu.degree}`}>
                <h3 className="text-sm font-semibold text-white">{edu.school || edu.degree}</h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {[edu.school ? edu.degree : undefined, edu.period].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="skills" className="mt-0">
          <ul className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-md border border-zinc-800/80 bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-zinc-300"
              >
                {skill}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="certifications" className="mt-0">
          <ul className="space-y-2">
            {profile.certifications.map((cert, i) => (
              <li key={`${i}-${cert}`} className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Award className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                {cert}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="languages" className="mt-0">
          <ul className="space-y-2">
            {profile.languages.map((lang) => (
              <li key={lang} className="text-sm text-zinc-300">
                {lang}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="raw" className="mt-0">
          {rawText ? (
            <pre className="max-h-[480px] overflow-auto font-mono text-xs leading-6 whitespace-pre-wrap text-zinc-400">
              {rawText}
            </pre>
          ) : (
            <Empty>No extracted text is stored for this candidate.</Empty>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
