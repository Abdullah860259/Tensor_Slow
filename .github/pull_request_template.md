## Description
Provide a concise summary of the changes introduced in this pull request. Explain the context, motivation, and any notable design decisions or tradeoffs.

## Type of Change
- Bug fix (non-breaking change resolving an issue)
- New feature (non-breaking addition of functionality or AI capabilities)
- Refactoring / Optimization (performance or internal code improvements)
- Documentation (updates to README, architecture guides, or specifications)
- CI / Tooling (workflow, dependency, or build configuration updates)

## Related Issue
Fixes #(issue number)

## Verification
Confirm the following verification checks passed locally:
- [ ] Typecheck: `npm run typecheck` passes with zero errors
- [ ] Lint: `npm run lint` passes with zero errors
- [ ] Tests: `npm run test` passes offline without external API keys
- [ ] Evals: `npm run evals` passes all benchmark evaluations
- [ ] Build: `npm run build` succeeds offline

## Pre-Merge Checklist
- [ ] Adheres to established architectural blueprint and conventions.
- [ ] Database connections respect the single MongoClient model and invoke connectMongoose where required.
- [ ] Session validation is enforced server-side; ownerId is never accepted from untrusted client input.
- [ ] File uploads stream directly to storage and do not persist to the local runtime filesystem.
- [ ] Zero secrets, environment variables, or private credentials are committed.
