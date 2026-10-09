import { z } from "zod";

export type DomainId = "workforce_recruiting";

export interface DomainConfig {
  id: DomainId;
  labels: {
    product: string;
    tagline: string;
    singular: string;
    plural: string;
    categoryLabel: string;
    severityLabel: string;
    scoreLabel: string;
    createCta: string;
    titlePlaceholder: string;
    contentPlaceholder: string;
  };
  problem: string;
  solution: string;
  extractionHint: string;
  chatPersona: string;
  quickPrompts: string[];
  fieldsSchema: z.ZodType;
  preview: any;
}

export const RecruitmentFieldsSchema = z.object({
  strengths: z.array(z.string()).describe("Evidence-backed reasons this candidate is a good fit."),
  weaknesses: z.array(z.string()).describe("Missing skills, risks, or gaps to discuss."),
  verdict: z.string().describe("A concise hiring recommendation for this candidate."),
  yearsOfExperience: z.number().nonnegative().optional().describe("Estimated total years of relevant experience."),
});

export const workforce_recruiting: DomainConfig = {
  id: "workforce_recruiting",
  labels: {
    product: "TalentRank AI",
    tagline: "Automated candidate evaluation and ranking for recruiters.",
    singular: "Candidate",
    plural: "Candidates",
    categoryLabel: "Role Fit",
    severityLabel: "Priority",
    scoreLabel: "Match Score",
    createCta: "Evaluate Profile",
    titlePlaceholder: "e.g. Jane Doe - Senior Frontend Engineer",
    contentPlaceholder: "Paste the raw LinkedIn profile text here...",
  },
  problem: "Reviewing hundreds of scraped profiles to find the perfect candidate is entirely manual and biased.",
  solution: "AI instantly reads the profile, scores it 0-100 against exact job requirements, and highlights red flags.",
  
  // 👉 THE PROMPT GUY WILL EDIT THIS LATER WITH THE EXACT JOB REQUIREMENTS
  extractionHint: `
    You are a ruthlessly strict technical recruiter evaluating candidates for a Senior React/Next.js Engineer role in EdTech.
    
    CRITICAL CONSTRAINTS TO PREVENT HALLUCINATIONS:
    1. Base all scores, verdicts, and extractions ONLY on explicitly stated facts in the text.
    2. DO NOT assume, infer, or guess any skills, tools, or experience not directly written.
    3. If a requirement is not mentioned, the candidate explicitly DOES NOT meet it.
    4. For the verdict, NEVER invent reasons; cite only the presence or absence of stated facts.
    
    REQUIREMENTS:
    - Minimum 3 years of React/Next.js experience.
    - EdTech or education sector experience is a massive plus.
    - Must have experience with scalable cloud architecture.
    
    SCORING RUBRIC (0-100):
    - Start at 0.
    - +40 for explicitly stating 3+ years of React/Next.js experience.
    - +30 for explicitly stating experience with scalable cloud architecture.
    - +30 for explicitly stating EdTech or education sector experience.
    - Deduct 50 points for significant job hopping (multiple tenures < 1 year).
    (Award points ONLY if explicitly justified by the text).
    
    Category MUST be one of: 'Strong Fit' (80-100), 'Potential' (50-79), 'Unqualified' (0-49).
    Severity represents the priority level: 'critical' or 'high' for strong fits you want to interview immediately, 'low' for unqualified candidates.
  `,
  chatPersona: "You are an expert technical recruiter analyzing candidate profiles. Be extremely concise, objective, and analytical. Focus heavily on technical competencies, career trajectory, and culture fit.",
  quickPrompts: [
    "Summarize this candidate's strongest technical skills.",
    "Are there any red flags or employment gaps?",
    "How does this candidate compare to the core job requirements?",
  ],
  fieldsSchema: RecruitmentFieldsSchema,
  preview: {
    title: "Jane Doe - Senior React Dev",
    severity: "low",
    score: 92,
    summary: "Senior engineer with 5 years of Next.js experience and a previous stint at Coursera.",
    tags: ["react", "nextjs", "edtech"],
    fields: {
      strengths: ["5 years building with Next.js", "Previous experience in education technology"],
      weaknesses: ["Cloud architecture ownership is not clear from the profile"],
      verdict: "Strong fit — invite to a technical interview.",
      yearsOfExperience: 5,
    },
    question: "Should we interview Jane?",
    answer: "Yes. Her experience at Coursera perfectly aligns with our EdTech requirements and she exceeds the 3-year Next.js baseline. Schedule a technical screen.",
    cite: "Profile: Jane Doe",
  },
};

export const DOMAINS: Record<DomainId, DomainConfig> = { workforce_recruiting };
export const ACTIVE_DOMAIN_ID: DomainId = "workforce_recruiting";
export const domain: DomainConfig = DOMAINS[ACTIVE_DOMAIN_ID];
