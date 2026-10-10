import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { ItemModel } from "@/lib/models/item";
import { processItem } from "@/lib/items/process";
import { connectMongoose } from "@/lib/db";
import { logger } from "@/lib/logger";
import { cleanCandidateProfileText } from "@/lib/candidate-ui";

// Parse scraper JSON into a clean text summary
function parseProfile(data: any): string {
  let text = `Name: ${data.userProfile?.fullName || ""}\n`;
  if (data.userProfile?.title) text += `Headline: ${data.userProfile.title}\n`;
  if (data.userProfile?.description) text += `Summary: ${data.userProfile.description}\n`;

  if (data.experiences && Array.isArray(data.experiences) && data.experiences.length > 0) {
    text += `\nExperience:\n`;
    for (const exp of data.experiences) {
      const start = exp.startDate || "Unknown";
      const end = exp.endDate || "Present";
      text += `- ${exp.title} at ${exp.company} (${start} to ${end})\n`;
      if (exp.description) {
        text += `  ${exp.description}\n`;
      }
    }
  }

  if (data.education && Array.isArray(data.education) && data.education.length > 0) {
    text += `\nEducation:\n`;
    for (const edu of data.education) {
      text += `- ${edu.degreeName || "Degree"} at ${edu.schoolName || "School"}\n`;
    }
  }

  if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
    text += `\nSkills:\n`;
    const skillsList = data.skills.map((s: any) =>
      typeof s === "string" ? s : s.skillName || JSON.stringify(s)
    );
    text += skillsList.join(", ") + "\n";
  }

  return text.trim();
}

/**
 * Resilient fallback: Generates a realistic parsed profile text from a LinkedIn URL
 * when external scraper session cookies are missing or blocked by LinkedIn anti-bot.
 */
function generateFallbackProfile(url: string): { fullName: string; cleanText: string } {
  const match = url.match(/\/in\/([a-zA-Z0-9_-]+)/);
  const rawSlug = match?.[1] ?? "candidate";
  const cleanName =
    rawSlug
      .replace(/[-_0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ") || "Candidate Profile";

  const cleanText = `Name: ${cleanName}
Headline: Senior Frontend / Next.js Engineer
Summary: Experienced software engineer with 6+ years building scalable, accessible web applications and distributed frontend architectures.

Experience:
- Senior Software Engineer at EdTech Solutions (2021-02 to Present)
  Spearheaded core interactive student learning portal using Next.js App Router, React 19, TypeScript, and Tailwind CSS.
- Frontend Developer at CodeSphere (2018-06 to 2021-01)
  Built reusable component design systems and real-time collaborative classroom tools.

Education:
- B.S. in Computer Science at Institute of Technology

Skills:
React, Next.js, TypeScript, Tailwind CSS, GraphQL, State Management, Cloud Architecture, EdTech Platforms`;

  return { fullName: cleanName, cleanText };
}

function extractNameFromPdfText(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter((l): l is string => Boolean(l));
  const isLinkedInPdf = lines.slice(0, 10).some((l) => /linkedin\.com|top skills|contact/i.test(l));
  if (isLinkedInPdf) {
    let pastHeader = false;
    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const line = lines[i];
      if (!line) continue;
      if (/top skills/i.test(line) || /contact/i.test(line) || /linkedin\.com/i.test(line) || line.includes("(LinkedIn)")) {
        pastHeader = true;
        continue;
      }
      if (
        pastHeader &&
        !line.includes("@") &&
        !line.includes("http") &&
        !/experience|education|summary|languages|certifications|publications/i.test(line) &&
        line.length > 2 &&
        line.length < 50
      ) {
        const nextLine = lines[i + 1] || "";
        if (
          nextLine &&
          (/engineer|developer|manager|designer|lead|architect|specialist|analyst|intern|officer|consultant/i.test(nextLine) ||
            nextLine.includes("|"))
        ) {
          return line;
        }
      }
    }
  }

  const fallback = lines[0];
  return fallback || "Imported Candidate";
}

import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    await connectMongoose();

    const body = await req.json();
    const { url, rawText, pdfBase64, name: customName } = body;

    if (!url && !rawText && !pdfBase64) {
      return NextResponse.json(
        { error: "Please provide either a LinkedIn URL, candidate profile text, or a PDF resume." },
        { status: 400 }
      );
    }

    if (url && typeof url === "string" && !url.includes("linkedin.com/")) {
      return NextResponse.json({ error: "Invalid LinkedIn URL provided." }, { status: 400 });
    }

    let ownerId = env.DEMO_USER_EMAIL || "cli-fallback-user";
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session?.user?.id) {
        ownerId = session.user.id;
      } else if (session?.user?.email) {
        ownerId = session.user.email;
      }
    } catch (authErr) {
      // Ignore auth errors for CLI scripts
    }

    let cleanText = "";
    let candidateName = customName || "";

    // 1. If PDF base64 was supplied (e.g. from Resume or LinkedIn "Save to PDF" export), parse it
    if (pdfBase64 && typeof pdfBase64 === "string") {
      try {
        // Must load before pdf-parse: polyfills DOMMatrix/ImageData/Path2D (via @napi-rs/canvas),
        // which pdfjs-dist needs and serverless Node runtimes like Vercel don't provide.
        const { CanvasFactory } = await import("pdf-parse/worker");
        const pdfModule: any = await import("pdf-parse");
        const rawBuffer = Buffer.from(pdfBase64.replace(/^data:application\/pdf;base64,/, ""), "base64");

        let extractedText = "";
        // pdf-parse v2 (modern class API with Uint8Array binary input)
        if (typeof pdfModule.PDFParse === "function") {
          const parser = new pdfModule.PDFParse({ data: new Uint8Array(rawBuffer), CanvasFactory });
          try {
            const result = await parser.getText();
            extractedText = result?.text || "";
          } finally {
            await parser.destroy();
          }
        } else {
          // pdf-parse v1 (legacy function-based API)
          const pdfFn = pdfModule.default || pdfModule;
          const result = await pdfFn(rawBuffer);
          extractedText = result?.text || "";
        }

        cleanText = extractedText.trim();
        if (!cleanText) {
          throw new Error("No readable text could be extracted from this PDF.");
        }

        if (!candidateName) {
          candidateName = extractNameFromPdfText(cleanText);
        }
      } catch (pdfErr: any) {
        logger.error("[scrape] Failed to parse PDF resume", pdfErr);
        return NextResponse.json(
          { error: `Failed to extract text from PDF: ${pdfErr.message}` },
          { status: 400 }
        );
      }
    }
    // 2. If raw profile text was supplied directly, use it
    else if (typeof rawText === "string" && rawText.trim().length > 0) {
      cleanText = rawText.trim();
      if (!candidateName) {
        const firstLine = cleanText.split("\n")[0] || "";
        candidateName = firstLine.replace(/^Name:\s*/i, "").trim() || "Candidate Profile";
      }
    } else if (url) {
      // Auto-configure system Chrome path if not already set
      if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
        const possibleChromePaths = [
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ];
        for (const p of possibleChromePaths) {
          if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
            process.env.PUPPETEER_EXECUTABLE_PATH = p;
            break;
          }
        }
      }

      // Attempt live scraping if cookie is provided
      if (env.LINKEDIN_SESSION_COOKIE && env.LINKEDIN_SESSION_COOKIE.trim().length > 0) {
        try {
          const { LinkedInProfileScraper } = await import("linkedin-profile-scraper");
          const scraper = new LinkedInProfileScraper({
            sessionCookieValue: env.LINKEDIN_SESSION_COOKIE,
            keepAlive: false,
            timeout: 20000,
          });
          await scraper.setup();
          const data = await scraper.run(url);
          cleanText = parseProfile(data);
          candidateName = data.userProfile?.fullName || "";
        } catch (scraperErr: any) {
          logger.warn("[scrape] Live LinkedIn scraping failed or was blocked by anti-bot.", {
            error: scraperErr?.message || String(scraperErr),
          });
        }
      }

      // If live scraping was not configured or failed
      if (!cleanText) {
        const isMockUrl = url.toLowerCase().includes("mock") || url.toLowerCase().includes("dummy") || url.toLowerCase().includes("example.com");
        if (isMockUrl) {
          const fallback = generateFallbackProfile(url);
          candidateName = fallback.fullName;
          cleanText = fallback.cleanText;
        } else {
          return NextResponse.json(
            {
              error:
                "LinkedIn blocked automated scraping (Authwall / HTTP 999). Please switch to the 'Paste Profile Text' tab to evaluate this candidate immediately, or set LINKEDIN_SESSION_COOKIE in your .env.local file.",
            },
            { status: 422 }
          );
        }
      }
    }

    // Sanitize source text to remove LinkedIn navigation junk, boilerplate, and tracking queries
    cleanText = cleanCandidateProfileText(cleanText);

    // Save candidate to DB
    const title = candidateName ? `${candidateName} - LinkedIn Profile` : url || "Imported Candidate";

    const item = await ItemModel.create({
      ownerId,
      title,
      content: cleanText,
      sourceUrl: url,
      category: "Senior Engineer",
      status: "pending",
    });

    // Score the candidate using our AI pipeline
    try {
      await processItem(item.id, ownerId);
    } catch (processErr: any) {
      logger.error("[scrape] LLM candidate evaluation failed", processErr);
      return NextResponse.json(
        { error: `Candidate saved, but AI scoring encountered an issue: ${processErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      itemId: item.id,
      message: "Candidate profile imported and scored successfully!",
    });
  } catch (error: any) {
    logger.error("[scrape] Unhandled error in scrape route", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
