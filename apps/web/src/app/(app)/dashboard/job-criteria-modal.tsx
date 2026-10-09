"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Target,
  SlidersHorizontal,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  RotateCcw,
  Save,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Rubric {
  mustHave?: string[];
  niceToHave?: string[];
  redFlags?: string[];
  scoringGuidelines?: string;
  interviewQuestions?: string[];
}

interface ActiveCriteria {
  _id: string;
  roleTitle: string;
  rawRequirements: string;
  expandedCriteria: string;
  rubric?: Rubric;
  isActive: boolean;
}

export function JobCriteriaModal() {
  const [open, setOpen] = useState(false);
  const [activeCriteria, setActiveCriteria] = useState<ActiveCriteria | null>(null);
  const [roleTitle, setRoleTitle] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  const [generatedRubric, setGeneratedRubric] = useState<Rubric | null>(null);
  const [expandedCriteriaText, setExpandedCriteriaText] = useState("");
  const router = useRouter();

  const fetchActiveCriteria = async () => {
    try {
      const res = await fetch("/api/criteria");
      if (res.ok) {
        const data = await res.json();
        if (data.activeCriteria) {
          setActiveCriteria(data.activeCriteria);
          if (!roleTitle) setRoleTitle(data.activeCriteria.roleTitle);
          if (!requirements) setRequirements(data.activeCriteria.rawRequirements);
        }
      }
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    if (open) {
      fetchActiveCriteria();
    }
  }, [open]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim() || !requirements.trim()) {
      toast.error("Please provide both a Role Title and rough requirements.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          roleTitle: roleTitle.trim(),
          requirements: requirements.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate criteria.");
      }

      setGeneratedRubric(data.criteria);
      setExpandedCriteriaText(data.criteria.fullCriteriaPrompt || data.criteria.scoringGuidelines);
      toast.success("AI has expanded your requirements into a comprehensive scoring rubric!");
    } catch (err: any) {
      toast.error(err.message || "Failed to expand criteria.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveActive = async () => {
    if (!roleTitle.trim() || (!expandedCriteriaText.trim() && !activeCriteria?.expandedCriteria)) {
      toast.error("No criteria generated to save.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          roleTitle: roleTitle.trim(),
          requirements: requirements.trim(),
          expandedCriteria: expandedCriteriaText.trim() || activeCriteria?.expandedCriteria,
          rubric: generatedRubric || activeCriteria?.rubric,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save criteria.");

      toast.success(`Active criteria set to: ${roleTitle}!`);
      await fetchActiveCriteria();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error saving criteria.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRescoreAll = async () => {
    setIsRescoring(true);
    try {
      const res = await fetch("/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rescore_all" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to re-score candidates.");

      toast.success(data.message || "Leaderboard re-scored against new criteria!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error re-scoring candidates.");
    } finally {
      setIsRescoring(false);
    }
  };

  return (
    <React.Fragment>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="h-9 cursor-pointer gap-2 rounded-lg border-zinc-800 bg-zinc-900/80 px-3.5 text-sm font-medium text-zinc-200 shadow-sm transition-colors hover:bg-zinc-800 hover:text-zinc-50"
      >
        <Target className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        <span className="truncate max-w-[140px] sm:max-w-[200px]">
          {activeCriteria?.roleTitle ? `Role: ${activeCriteria.roleTitle}` : "Job Criteria"}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto gap-0 rounded-2xl border border-zinc-800/80 bg-zinc-900 p-6 text-zinc-50 shadow-2xl sm:max-w-[680px]">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
                AI Rubric Engine
              </Badge>
              {activeCriteria?.roleTitle && (
                <span className="text-xs text-zinc-400">
                  Active: <strong className="text-zinc-200">{activeCriteria.roleTitle}</strong>
                </span>
              )}
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-50">
              Target Job Requirements & Evaluation Criteria
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-zinc-400">
              Input your raw job requirements or role context. AI will generate a strict, comprehensive rubric to score and rank candidates against.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGenerate} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="role-title" className="text-xs font-semibold text-zinc-300">
                Target Role Title <span className="text-rose-400">*</span>
              </label>
              <Input
                id="role-title"
                type="text"
                placeholder="e.g. Senior Full Stack AI Engineer, Lead Product Designer"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                required
                className="h-9 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-50 placeholder:text-zinc-500 focus-visible:border-zinc-600 focus-visible:ring-zinc-600/40"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="role-requirements" className="text-xs font-semibold text-zinc-300">
                  Job Requirements, Stack & Notes <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-zinc-500">Paste bullet points or rough thoughts</span>
              </div>
              <Textarea
                id="role-requirements"
                required
                rows={4}
                placeholder="e.g. Must have 4+ years building with React & Next.js App Router. Deep experience integrating Gemini/OpenAI APIs for agentic workflows. Strong MongoDB and AWS cloud architecture. EdTech background is a strong plus..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="min-h-[100px] resize-y rounded-lg border-zinc-800 bg-zinc-950 text-xs text-zinc-50 placeholder:text-zinc-500 focus-visible:border-zinc-600 focus-visible:ring-zinc-600/40"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={isGenerating || !roleTitle.trim() || !requirements.trim()}
                className="cursor-pointer gap-2 rounded-lg bg-zinc-50 text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
              >
                {isGenerating ? (
                  <React.Fragment>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    Expanding Criteria with AI...
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    ✨ AI Expand Criteria
                  </React.Fragment>
                )}
              </Button>
            </div>
          </form>

          {/* Display Generated / Active Rubric */}
          {(generatedRubric || activeCriteria?.rubric) && (
            <div className="mt-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
                  Generated Candidate Evaluation Rubric
                </h4>
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 text-[11px]">
                  0-100 Match Rubric
                </Badge>
              </div>

              {/* Must Haves */}
              {((generatedRubric?.mustHave || activeCriteria?.rubric?.mustHave)?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mandatory Requirements (Must-Have)
                  </span>
                  <ul className="space-y-1 pl-4 text-xs text-zinc-300 list-disc">
                    {(generatedRubric?.mustHave || activeCriteria?.rubric?.mustHave)?.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nice to Haves */}
              {((generatedRubric?.niceToHave || activeCriteria?.rubric?.niceToHave)?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" /> Preferred Qualifications (Nice-to-Have)
                  </span>
                  <ul className="space-y-1 pl-4 text-xs text-zinc-300 list-disc">
                    {(generatedRubric?.niceToHave || activeCriteria?.rubric?.niceToHave)?.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Scoring Breakdown */}
              {(generatedRubric?.scoringGuidelines || activeCriteria?.rubric?.scoringGuidelines) && (
                <div className="space-y-1 rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3 text-xs">
                  <span className="font-semibold text-zinc-200">Scoring Guidelines (0–100):</span>
                  <p className="mt-1 text-zinc-400 leading-relaxed">
                    {generatedRubric?.scoringGuidelines || activeCriteria?.rubric?.scoringGuidelines}
                  </p>
                </div>
              )}

              {/* High-Signal Interview Questions */}
              {((generatedRubric?.interviewQuestions || activeCriteria?.rubric?.interviewQuestions)?.length ?? 0) > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                    <HelpCircle className="h-3.5 w-3.5" /> High-Signal Technical Screening Questions
                  </span>
                  <ol className="space-y-1 pl-4 text-xs text-zinc-300 list-decimal">
                    {(generatedRubric?.interviewQuestions || activeCriteria?.rubric?.interviewQuestions)?.map((q, idx) => (
                      <li key={idx} className="leading-relaxed">{q}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Actions: Save Active + Rescore */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRescoreAll}
                  disabled={isRescoring}
                  className="cursor-pointer gap-2 rounded-lg border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
                >
                  {isRescoring ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Re-Score All Pipeline Candidates
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveActive}
                  disabled={isSaving}
                  className="cursor-pointer gap-2 rounded-lg bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400 text-xs"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Apply as Active Criteria
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
