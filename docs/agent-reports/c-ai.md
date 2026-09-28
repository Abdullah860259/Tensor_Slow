AGENT:          C — AI core
WAVE:           1
BRANCH:         agent/c-ai
FILES WRITTEN:
apps/web/src/lib/ai/models.ts
apps/web/src/lib/ai/prompts/system.ts
apps/web/src/lib/ai/embed.ts
apps/web/src/lib/ai/extract.ts
apps/web/src/lib/ai/rag.ts
apps/web/src/lib/ai/tools.ts
apps/web/src/lib/rate-limit.ts
STUB SIGNATURES CHANGED:  none
TYPE CHECK:     pass
TESTS RUN:      npm run typecheck → pass (0 errors); npm run test → pass (2 test files, 2 tests passed); programmatic mock assertions for embed, extract, rag, models, tools, and rate-limit → all pass
UNVERIFIED:     Live Atlas Vector Search against live MongoDB cluster (verified via unit test mock & in-memory cosine fallback); live Upstash Redis network calls (verified graceful degradation)
REQUESTS:       none
