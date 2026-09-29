import fs from "node:fs";
import path from "node:path";
import { MockLanguageModelV3 } from "ai/test";
import { extractStructuredData } from "@/lib/ai/extract";
import { ExtractResultSchema, type ExtractResult } from "@/lib/contracts";

export interface EvalCase {
  id: string;
  name: string;
  input: string;
  expected: {
    summaryContains?: string[];
    tags?: string[];
    mockResponse?: ExtractResult;
  };
}

export interface EvalResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  output?: ExtractResult;
}

/**
 * Resolves the path to evals/cases.json across different invocation contexts.
 */
function resolveCasesPath(): string {
  const candidates = [
    path.resolve(__dirname, "../../evals/cases.json"),
    path.resolve(process.cwd(), "evals/cases.json"),
    path.resolve(process.cwd(), "apps/web/evals/cases.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `cases.json not found. Checked locations:\n  ${candidates.join("\n  ")}`
  );
}

/**
 * Runs the evaluation suite over all test cases in evals/cases.json.
 * Validates output structure against ExtractResultSchema and asserts expected shapes.
 * Operates offline using MockLanguageModelV3 fallback when API keys are absent.
 */
export async function runEvals(): Promise<void> {
  const casesPath = resolveCasesPath();
  const rawData = fs.readFileSync(casesPath, "utf-8");
  const cases: EvalCase[] = JSON.parse(rawData);

  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error(`No eval cases found in ${casesPath}`);
  }

  const isLive = Boolean(
    process.env.EVALS_LIVE === "true" &&
      (process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.AI_GATEWAY_API_KEY)
  );

  console.log("=".repeat(80));
  console.log("EVALUATION SUITE: Structured Output Extraction");
  console.log(`Cases file: ${casesPath}`);
  console.log(
    `Mode: ${isLive ? "LIVE (API model)" : "OFFLINE (MockLanguageModelV3)"} | Total Cases: ${cases.length}`
  );
  console.log("=".repeat(80));

  const results: EvalResult[] = [];

  for (const testCase of cases) {
    const startTime = Date.now();
    try {
      let output: ExtractResult;

      if (isLive) {
        output = await extractStructuredData(testCase.input);
      } else {
        const mockData = testCase.expected.mockResponse ?? {
          summary: `Summary of ${testCase.name} content with relevant points.`,
          tags: testCase.expected.tags ?? ["general", "content"],
          confidenceScore: 0.95,
          actionItems: ["Review extracted content"],
        };

        const mockModel = new MockLanguageModelV3({
          doGenerate: async () => ({
            content: [
              {
                type: "text",
                text: JSON.stringify(mockData),
              },
            ],
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: {
                total: 20,
                noCache: 20,
                cacheRead: 0,
                cacheWrite: 0,
              },
              outputTokens: { total: 30, text: 30, reasoning: 0 },
            },
            warnings: [],
          }),
        });

        output = await extractStructuredData(testCase.input, mockModel);
      }

      // 1. Validate against contract schema
      const parseResult = ExtractResultSchema.safeParse(output);
      if (!parseResult.success) {
        throw new Error(
          `ExtractResultSchema validation failed: ${parseResult.error.message}`
        );
      }

      // 2. Validate summary existence and expected substrings
      if (typeof output.summary !== "string" || output.summary.trim().length === 0) {
        throw new Error("Summary must be a non-empty string");
      }

      if (testCase.expected.summaryContains) {
        const lowerSummary = output.summary.toLowerCase();
        for (const keyword of testCase.expected.summaryContains) {
          if (!lowerSummary.includes(keyword.toLowerCase())) {
            throw new Error(
              `Summary missing expected keyword '${keyword}'. Got: "${output.summary}"`
            );
          }
        }
      }

      // 3. Validate tags
      if (!Array.isArray(output.tags) || output.tags.length === 0) {
        throw new Error("Tags must be a non-empty array of strings");
      }

      // 4. Validate confidenceScore range if present
      if (output.confidenceScore !== undefined) {
        if (output.confidenceScore < 0 || output.confidenceScore > 1) {
          throw new Error(
            `confidenceScore must be between 0 and 1, got ${output.confidenceScore}`
          );
        }
      }

      const durationMs = Date.now() - startTime;
      results.push({
        id: testCase.id,
        name: testCase.name,
        passed: true,
        durationMs,
        output,
      });

      console.log(`[PASS] ${testCase.id}: ${testCase.name} (${durationMs}ms)`);
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        id: testCase.id,
        name: testCase.name,
        passed: false,
        durationMs,
        error: errorMsg,
      });

      console.error(
        `[FAIL] ${testCase.id}: ${testCase.name} (${durationMs}ms) - ${errorMsg}`
      );
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const passRate = ((passedCount / cases.length) * 100).toFixed(1);

  console.log("-".repeat(80));
  console.log(
    `Summary: ${passedCount}/${cases.length} passed (${passRate}%) | Failed: ${failedCount}`
  );
  console.log("=".repeat(80));

  if (failedCount > 0) {
    throw new Error(
      `Evaluation failed: ${failedCount} of ${cases.length} cases failed.`
    );
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  typeof window === "undefined" &&
  (require.main === module ||
    (typeof process !== "undefined" &&
      process.argv[1] &&
      process.argv[1].replace(/\\/g, "/").includes("scripts/evals")))
) {
  runEvals().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
