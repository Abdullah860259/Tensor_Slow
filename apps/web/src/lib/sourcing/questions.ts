// AI sourcing questionnaire: the fixed "core" questions every recruiter answers, plus the shared
// types for the role-specific questions Gemini generates. Client-safe (no server imports).

export const QUESTION_TYPES = ["text", "textarea", "number", "select", "multiselect", "boolean"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface SourcingQuestion {
  id: string;
  label: string;
  type: QuestionType;
  section: "company" | "search" | "role";
  options?: string[];
  placeholder?: string;
  helpText?: string;
  required?: boolean;
}

export type AnswerValue = string | string[] | boolean;
export type SourcingAnswers = Record<string, AnswerValue>;

/** LinkedIn filter options supported by the Apify actor, as { label shown to recruiters, actor ID }. */
export const YEARS_OF_EXPERIENCE = [
  { label: "Less than 1 year", id: "1" },
  { label: "1 to 2 years", id: "2" },
  { label: "3 to 5 years", id: "3" },
  { label: "6 to 10 years", id: "4" },
  { label: "More than 10 years", id: "5" },
] as const;

export const SENIORITY_LEVELS = [
  { label: "Entry level", id: "110" },
  { label: "Senior individual contributor", id: "120" },
  { label: "Strategic / principal", id: "130" },
  { label: "Entry-level manager", id: "200" },
  { label: "Experienced manager", id: "210" },
  { label: "Director", id: "220" },
  { label: "Vice President", id: "300" },
  { label: "C-level (CXO)", id: "310" },
] as const;

export const COMPANY_HEADCOUNTS = [
  { label: "Self-employed", id: "A" },
  { label: "1-10", id: "B" },
  { label: "11-50", id: "C" },
  { label: "51-200", id: "D" },
  { label: "201-500", id: "E" },
  { label: "501-1,000", id: "F" },
  { label: "1,001-5,000", id: "G" },
  { label: "5,001-10,000", id: "H" },
  { label: "10,001+", id: "I" },
] as const;

export const CANDIDATE_COUNT_OPTIONS = ["10", "20", "30"] as const;

const labels = (opts: readonly { label: string }[]) => opts.map((o) => o.label);

export const CORE_QUESTIONS: SourcingQuestion[] = [
  // Company & budget: context for scoring (LinkedIn can't filter on these)
  {
    id: "hiringCompanySize",
    section: "company",
    label: "How many people work at your company?",
    type: "select",
    options: ["Just founders", "2-10", "11-50", "51-200", "201-500", "501-1,000", "1,001-5,000", "5,000+"],
    required: true,
  },
  {
    id: "companyDescription",
    section: "company",
    label: "What does your company do?",
    type: "text",
    placeholder: "e.g. B2B fintech, payments infrastructure for SMEs",
  },
  {
    id: "salaryMin",
    section: "company",
    label: "Salary budget: minimum",
    type: "number",
    placeholder: "e.g. 80000",
  },
  {
    id: "salaryMax",
    section: "company",
    label: "Salary budget: maximum",
    type: "number",
    placeholder: "e.g. 120000",
    required: true,
  },
  {
    id: "salaryCurrency",
    section: "company",
    label: "Currency",
    type: "select",
    options: ["USD", "EUR", "GBP", "PKR", "INR", "AED", "SAR", "CAD", "AUD"],
    required: true,
  },
  {
    id: "salaryPeriod",
    section: "company",
    label: "Paid per",
    type: "select",
    options: ["Year", "Month", "Hour"],
    required: true,
  },
  {
    id: "employmentType",
    section: "company",
    label: "Employment type",
    type: "select",
    options: ["Full-time", "Part-time", "Contract", "Internship"],
    required: true,
  },
  {
    id: "workMode",
    section: "company",
    label: "Work arrangement",
    type: "select",
    options: ["On-site", "Hybrid", "Remote"],
    required: true,
  },

  // Search filters: mapped directly onto the LinkedIn search
  {
    id: "locations",
    section: "search",
    label: "Where should candidates be located?",
    type: "text",
    placeholder: "e.g. Lahore, Karachi, Pakistan",
    helpText: "Comma-separated cities or countries. Leave empty to search everywhere.",
  },
  {
    id: "experience",
    section: "search",
    label: "Total years of experience",
    type: "multiselect",
    options: labels(YEARS_OF_EXPERIENCE),
  },
  {
    id: "seniority",
    section: "search",
    label: "Seniority level",
    type: "multiselect",
    options: labels(SENIORITY_LEVELS),
  },
  {
    id: "candidateCompanySizes",
    section: "search",
    label: "Size of the company candidates work at now",
    type: "multiselect",
    options: labels(COMPANY_HEADCOUNTS),
    helpText: "e.g. pick 11-50 and 51-200 to target people already used to startups.",
  },
  {
    id: "mustHaveSkills",
    section: "search",
    label: "Must-have skills",
    type: "textarea",
    placeholder: "e.g. React, Next.js, TypeScript, PostgreSQL",
    helpText: "Comma-separated. Profiles that mention none of these are filtered out.",
    required: true,
  },
  {
    id: "dealBreakers",
    section: "search",
    label: "Deal-breakers",
    type: "textarea",
    placeholder: "e.g. job-hopping every few months, no production experience",
  },
  {
    id: "candidateCount",
    section: "search",
    label: "How many candidates should we bring back?",
    type: "select",
    options: [...CANDIDATE_COUNT_OPTIONS],
    required: true,
  },
];

export const CORE_DEFAULTS: SourcingAnswers = {
  salaryCurrency: "USD",
  salaryPeriod: "Year",
  employmentType: "Full-time",
  workMode: "On-site",
  candidateCount: "20",
  experience: [],
  seniority: [],
  candidateCompanySizes: [],
};

export function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return value.trim().length > 0;
}

/** Returns the labels of required questions that have no answer. */
export function missingRequired(questions: SourcingQuestion[], answers: SourcingAnswers): string[] {
  return questions.filter((q) => q.required && !isAnswered(answers[q.id])).map((q) => q.label);
}

/** Splits a comma/newline separated answer into trimmed, non-empty, de-duplicated entries. */
export function splitList(value: AnswerValue | undefined): string[] {
  if (typeof value !== "string") return Array.isArray(value) ? value : [];
  return [...new Set(value.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean))];
}
