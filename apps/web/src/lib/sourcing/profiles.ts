// Filtering and formatting for LinkedIn profiles returned by the Apify actor
// (harvestapi/linkedin-profile-search, "Full" mode). Pure functions, no I/O.

type DateText = { text?: string | null } | null | undefined;

export interface ApifyProfile {
  id?: string;
  publicIdentifier?: string;
  linkedinUrl?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  about?: string;
  openToWork?: boolean;
  location?: { linkedinText?: string; parsed?: { text?: string } } | null;
  topSkills?: string;
  experience?: Array<{
    position?: string;
    companyName?: string;
    location?: string;
    employmentType?: string;
    duration?: string;
    description?: string;
    skills?: string[];
    startDate?: DateText;
    endDate?: DateText;
  }>;
  education?: Array<{
    schoolName?: string;
    degree?: string;
    fieldOfStudy?: string;
    period?: string;
  }>;
  skills?: Array<{ name?: string } | string>;
  certifications?: Array<{ title?: string; issuedBy?: string }>;
  languages?: Array<{ name?: string; proficiency?: string }>;
}

export interface FilteredProfile {
  profile: ApifyProfile;
  fullName: string;
  linkedinUrl: string;
  matchedKeywords: string[];
}

export interface FilterStats {
  scraped: number;
  invalid: number;
  duplicates: number;
  irrelevant: number;
  overLimit: number;
  imported: number;
}

const MAX_DESCRIPTION_CHARS = 700;
const MAX_ABOUT_CHARS = 1500;

/** Canonical form for comparing LinkedIn URLs: https, lowercase, no query or trailing slash. */
export function normalizeLinkedinUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const match = url.trim().match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // Malformed %-escape: keep the raw slug rather than failing (this also runs while rendering pages)
  }
  return `https://www.linkedin.com/in/${encodeURIComponent(slug.toLowerCase())}`;
}

export function profileFullName(p: ApifyProfile): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function skillNames(p: ApifyProfile): string[] {
  const names = new Set<string>();
  for (const s of p.skills ?? []) {
    const name = typeof s === "string" ? s : s?.name;
    if (name) names.add(name.trim());
  }
  for (const exp of p.experience ?? []) for (const s of exp.skills ?? []) if (s) names.add(s.trim());
  return [...names];
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+\n/g, "\n").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

/**
 * Renders a profile as the plain-text format the rest of the app stores in Item.content
 * ("Name:", "Headline:", "Summary:" lines, then sections), which the scorer reads.
 */
export function profileToText(p: ApifyProfile): string {
  const lines: string[] = [`Name: ${profileFullName(p)}`];
  if (p.headline) lines.push(`Headline: ${p.headline}`);
  const location = p.location?.linkedinText || p.location?.parsed?.text;
  if (location) lines.push(`Location: ${location}`);
  if (p.openToWork) lines.push("Open to work: yes");
  if (p.about) lines.push(`Summary: ${clip(p.about, MAX_ABOUT_CHARS).replace(/\n+/g, " ")}`);

  if (p.experience?.length) {
    lines.push("", "Experience:");
    for (const exp of p.experience) {
      const start = exp.startDate?.text || "Unknown";
      const end = exp.endDate?.text || "Present";
      const meta = [exp.employmentType, exp.location].filter(Boolean).join(", ");
      lines.push(`- ${exp.position || "Role"} at ${exp.companyName || "Company"} (${start} to ${end})${meta ? ` · ${meta}` : ""}`);
      if (exp.description) lines.push(`  ${clip(exp.description, MAX_DESCRIPTION_CHARS).replace(/\n+/g, " ")}`);
    }
  }

  if (p.education?.length) {
    lines.push("", "Education:");
    for (const edu of p.education) {
      const degree = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ") || "Degree";
      lines.push(`- ${degree} at ${edu.schoolName || "School"}${edu.period ? ` (${edu.period})` : ""}`);
    }
  }

  const skills = skillNames(p);
  if (skills.length) lines.push("", "Skills:", skills.slice(0, 40).join(", "));

  if (p.certifications?.length) {
    lines.push("", "Certifications:");
    for (const c of p.certifications.slice(0, 10)) {
      if (c.title) lines.push(`- ${c.title}${c.issuedBy ? ` (${c.issuedBy})` : ""}`);
    }
  }

  const languages = (p.languages ?? [])
    .filter((l) => l.name)
    .map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name));
  if (languages.length) lines.push("", `Languages: ${languages.join(", ")}`);

  return lines.join("\n").trim();
}

/** Lowercase and strip punctuation so "Next.js", "NextJS" and "next js" all compare equal. */
function squash(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

export function matchKeywords(p: ApifyProfile, keywords: string[]): string[] {
  const haystack = squash(
    [p.headline, p.about, p.topSkills, ...skillNames(p), ...(p.experience ?? []).flatMap((e) => [e.position, e.description])]
      .filter(Boolean)
      .join(" "),
  );
  return keywords.filter((k) => {
    const needle = squash(k);
    return needle.length > 0 && haystack.includes(needle);
  });
}

/**
 * Turns raw actor output into the candidates worth importing:
 * 1. drops records without a name, profile URL, or any career information,
 * 2. drops duplicates (within the batch and already in the recruiter's pipeline),
 * 3. drops profiles that mention none of the must-have keywords,
 * 4. ranks by keyword coverage (then open-to-work, then experience depth) and keeps `limit`.
 */
export function filterProfiles(
  raw: unknown[],
  opts: { mustHaveKeywords: string[]; existingUrls: Set<string>; limit: number },
): { kept: FilteredProfile[]; stats: FilterStats } {
  const stats: FilterStats = { scraped: raw.length, invalid: 0, duplicates: 0, irrelevant: 0, overLimit: 0, imported: 0 };
  const seen = new Set(opts.existingUrls);
  const candidates: FilteredProfile[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      stats.invalid++;
      continue;
    }
    const profile = item as ApifyProfile;
    const fullName = profileFullName(profile);
    const linkedinUrl = normalizeLinkedinUrl(profile.linkedinUrl);
    if (!fullName || !linkedinUrl || (!profile.headline && !profile.experience?.length)) {
      stats.invalid++;
      continue;
    }
    if (seen.has(linkedinUrl)) {
      stats.duplicates++;
      continue;
    }
    seen.add(linkedinUrl);

    const matchedKeywords = matchKeywords(profile, opts.mustHaveKeywords);
    if (opts.mustHaveKeywords.length > 0 && matchedKeywords.length === 0) {
      stats.irrelevant++;
      continue;
    }
    candidates.push({ profile, fullName, linkedinUrl, matchedKeywords });
  }

  candidates.sort(
    (a, b) =>
      b.matchedKeywords.length - a.matchedKeywords.length ||
      Number(Boolean(b.profile.openToWork)) - Number(Boolean(a.profile.openToWork)) ||
      (b.profile.experience?.length ?? 0) - (a.profile.experience?.length ?? 0),
  );

  const kept = candidates.slice(0, opts.limit);
  stats.overLimit = candidates.length - kept.length;
  stats.imported = kept.length;
  return { kept, stats };
}
