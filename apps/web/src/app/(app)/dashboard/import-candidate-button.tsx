"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  FileText,
  Link as LinkIcon,
  UploadCloud,
  Info,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CtaFrame, ctaPrimaryClass } from "@/components/hud/hud";

export function ImportCandidateButton() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("paste");
  const [name, setName] = useState("");
  const [rawText, setRawText] = useState("");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!name) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
      setName(cleanName);
    }

    const reader = new FileReader();
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type.includes("pdf");
    if (isPdf) {
      reader.onload = () => {
        setFileBase64(reader.result as string);
        toast.success(`Loaded ${file.name}! Click "Evaluate Resume" to proceed.`);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        setRawText(reader.result as string);
        toast.success(`Loaded ${file.name}! Click "Evaluate Resume" to proceed.`);
      };
      reader.readAsText(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !fileBase64 && !rawText) {
      toast.error("Please click the dashed box to choose a PDF or TXT resume first.");
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim() || undefined,
      };

      if (fileBase64) {
        payload.pdfBase64 = fileBase64;
      } else {
        payload.rawText = rawText;
      }

      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to process resume.");

      toast.success(data?.message || "Candidate evaluated and ranked successfully!");
      setOpen(false);
      setSelectedFile(null);
      setFileBase64("");
      setRawText("");
      setName("");
      router.refresh();
      if (data?.itemId) {
        router.push(`/items/${data.itemId}`);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      toast.error("Please paste candidate profile or resume text first.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: rawText.trim(), name: name.trim() || undefined }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to import candidate");

      toast.success(data?.message || "Candidate evaluated and ranked successfully!");
      setOpen(false);
      setName("");
      setRawText("");
      router.refresh();
      if (data?.itemId) {
        router.push(`/items/${data.itemId}`);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a LinkedIn profile URL.");
      return;
    }

    if (!url.includes("linkedin.com/")) {
      toast.error("Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/username)");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to scrape candidate");

      toast.success(data?.message || "Candidate imported and scored successfully!");
      setOpen(false);
      setUrl("");
      router.refresh();
      if (data?.itemId) {
        router.push(`/items/${data.itemId}`);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <React.Fragment>
      <CtaFrame>
        <Button
          onClick={() => setOpen(true)}
          className={`${ctaPrimaryClass} gap-2 cursor-pointer`}
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Import Candidate
        </Button>
      </CtaFrame>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto gap-0 rounded-sm border border-slate-800 border-t-neon-cyan bg-[#05070b] p-6 text-white shadow-[0_0_48px_-12px_rgb(34_229_255/0.35)] sm:max-w-[560px]">
          {/* Scan line while loading */}
          {isLoading && (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px overflow-hidden"
            >
              <span className="block h-full w-2/5 animate-scan bg-gradient-to-r from-transparent via-neon-cyan to-transparent motion-reduce:animate-none" />
            </span>
          )}
          <DialogHeader className="space-y-1.5 text-left">
            <p className="font-mono text-[11px] tracking-[0.24em] text-neon-cyan uppercase">
              Candidate Ingestion
            </p>
            <DialogTitle className="font-display text-2xl font-bold tracking-tight text-white">
              Import & Evaluate Candidate
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-400">
              Evaluate real candidates instantly against your active role criteria.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-zinc-950 p-1 text-xs">
              <TabsTrigger
                value="paste"
                className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-50"
              >
                <FileText className="h-3.5 w-3.5" /> Paste Text
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-50"
              >
                <UploadCloud className="h-3.5 w-3.5" /> PDF / Resume
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-50"
              >
                <LinkIcon className="h-3.5 w-3.5" /> URL Scrape
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: PASTE TEXT (DEFAULT, FASTEST & 100% RELIABLE) */}
            <TabsContent value="paste">
              <form onSubmit={handlePasteSubmit} className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <label htmlFor="paste-candidate-name" className="text-xs font-medium text-zinc-300">
                    Candidate Name (Optional)
                  </label>
                  <Input
                    id="paste-candidate-name"
                    type="text"
                    placeholder="e.g. Muhammad Ahmed Asif"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="h-9 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-50 placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="paste-raw-text" className="text-xs font-medium text-zinc-300">
                      Profile / Resume Text <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-zinc-500">100% Real Evaluation</span>
                  </div>
                  <Textarea
                    id="paste-raw-text"
                    required
                    rows={6}
                    placeholder="Paste the candidate's Headline, About section, Experience history, and Skills directly from LinkedIn or their resume..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[140px] resize-y rounded-lg border-zinc-800 bg-zinc-950 text-xs text-zinc-50 placeholder:text-zinc-500"
                  />
                </div>

                <DialogFooter className="gap-2 pt-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={isLoading}
                    className="cursor-pointer rounded-lg text-zinc-400 hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="min-w-[140px] cursor-pointer gap-2 rounded-lg bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                  >
                    {isLoading ? (
                      <React.Fragment>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scoring Candidate...
                      </React.Fragment>
                    ) : (
                      "Evaluate Profile"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* TAB 2: PDF RESUME & LINKEDIN PDF EXPORT */}
            <TabsContent value="upload">
              <form onSubmit={handleUploadSubmit} className="space-y-4 pt-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs leading-relaxed text-zinc-300">
                  <div className="flex items-center gap-2 font-semibold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Recommended: 100% Complete Profile Data
                  </div>
                  <p className="mt-1 text-zinc-400">
                    On LinkedIn, click <strong>More → Save to PDF</strong> on any profile to get a full export with <strong>all un-truncated descriptions, dates, and skills</strong>, or upload a resume.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="file-candidate-name" className="text-xs font-medium text-zinc-300">
                    Candidate Name (Optional)
                  </label>
                  <Input
                    id="file-candidate-name"
                    type="text"
                    placeholder="e.g. Muhammad Ahmed Asif"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="h-9 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-50 placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Upload Resume or LinkedIn PDF Export (.pdf, .txt) <span className="text-rose-400">*</span>
                  </label>
                  <label
                    htmlFor="file-upload-input"
                    className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950 p-6 text-center hover:border-zinc-500 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="h-8 w-8 text-zinc-400 mb-2" />
                    {selectedFile ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <FileCheck className="h-4 w-4" />
                        <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-zinc-300">Click to browse or drop file here</span>
                        <span className="text-[11px] text-zinc-500 mt-1">Supports PDF and TXT resumes</span>
                      </>
                    )}
                    <input
                      id="file-upload-input"
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileChange}
                      disabled={isLoading}
                      className="sr-only"
                    />
                  </label>
                </div>

                <DialogFooter className="gap-2 pt-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={isLoading}
                    className="cursor-pointer rounded-lg text-zinc-400 hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="min-w-[140px] cursor-pointer gap-2 rounded-lg bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                  >
                    {isLoading ? (
                      <React.Fragment>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting & Scoring...
                      </React.Fragment>
                    ) : (
                      "Evaluate Resume"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* TAB 3: URL AUTO-SCRAPE */}
            <TabsContent value="url">
              <form onSubmit={handleUrlSubmit} className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <label htmlFor="url-input" className="text-xs font-medium text-zinc-300">
                    LinkedIn Profile URL <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    id="url-input"
                    type="url"
                    placeholder="https://www.linkedin.com/in/username"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-10 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-50"
                  />
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-400">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <span className="font-semibold text-zinc-200">Headless Scraper Note: </span>
                    LinkedIn blocks automated requests with HTTP 999. If automated scraping encounters redirect checks, use the{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("paste")}
                      className="font-semibold text-zinc-200 underline hover:text-white"
                    >
                      Paste Text
                    </button>{" "}
                    or{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("upload")}
                      className="font-semibold text-zinc-200 underline hover:text-white"
                    >
                      PDF / Resume
                    </button>{" "}
                    tabs for complete data.
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={isLoading}
                    className="cursor-pointer rounded-lg text-zinc-400 hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="min-w-[140px] cursor-pointer gap-2 rounded-lg bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                  >
                    {isLoading ? (
                      <React.Fragment>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scraping & Scoring...
                      </React.Fragment>
                    ) : (
                      "Scrape & Evaluate"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
