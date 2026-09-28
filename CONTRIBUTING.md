# Contributing Guidelines

Thank you for contributing to the AICON Hackathon starter project. Please adhere to the following standards to ensure fast, safe, and conflict-free collaboration.

## Branch Naming Conventions

All branches must follow one of these prefixes:
- `feat/<feature-name>`: New functionality or capabilities.
- `fix/<issue-name>`: Bug fixes and issue patches.
- `chore/<task-name>`: Tooling, dependency updates, and maintenance.

## Pull Request Rules

1. **Keep PRs Small**: Aim for PRs under 300 lines of code. Small PRs are easier to review, test, and merge without conflicts.
2. **Review Requirement**: At least one teammate approval is required before merging into `main`.
3. **CI Must Pass**: The CI pipeline (`npm run typecheck`, `npm run lint`, `npm run test`) must be completely green before any merge.
4. **Never Commit Directly to `main`**: All changes flow through feature branches and pull requests.

## Non-Negotiable Invariants

1. **Never Commit Secrets or `.env`**:
   - Never commit `.env`, `.env.local`, or any actual API tokens to git.
   - Use `.env.example` as the canonical reference for required environment variables.
2. **One Owner Per Prompt File**:
   - Prompts live in dedicated files under `src/lib/ai/prompts/` (e.g., `system.ts`).
   - Four people editing the same inline prompt string causes severe merge conflicts. Assign a single owner per prompt file.
3. **Cached Database Connection**:
   - Never instantiate a new `MongoClient` per request. Always use the cached client exported from `@/lib/db`.
4. **Storage Rules**:
   - Filesystem writes are prohibited on Vercel deployment (serverless filesystem is ephemeral). Always upload media and user files to Vercel Blob.
5. **Session-Derived Ownership**:
   - Never trust client-supplied `ownerId` in request bodies. Always derive `ownerId` from the verified server session via `auth.api.getSession()`.
