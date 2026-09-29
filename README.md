# AICON Hackathon — AI Application Starter

An app-agnostic, production-grade AI application starter foundation built for high-velocity hackathons and robust production deployment.

**Core Stack**: Next.js 16 (App Router & Turbopack) · React 19 · TypeScript 7 · Vercel AI SDK v7 · MongoDB Atlas Local & Cloud Vector Search · Better Auth · Tailwind CSS v4 · Optional FastAPI Sidecar

> 📖 **Looking for a beginner-friendly overview?** Check out [EXPLAIN.md](EXPLAIN.md) for a simple explanation of how everything works, what MongoDB and Vector Search are, and how the entire workflow connects together!

---

## 📋 Table of Contents
- [Project Status & Health](#-project-status--health)
- [Quickstart: Zero to Running in 5 Minutes](#-quickstart-zero-to-running-in-5-minutes)
- [Configuration & API Keys](#-configuration--api-keys)
- [Project Architecture & Anatomy](#-project-architecture--anatomy)
  - [1. User Interface (UI)](#1-user-interface-ui)
  - [2. Database & Data Models](#2-database--data-models)
  - [3. API Endpoints & Authentication](#3-api-endpoints--authentication)
  - [4. AI Spine & Automation](#4-ai-spine--automation)
  - [5. Python FastAPI Sidecar](#5-python-fastapi-sidecar)
- [Testing & Verification Suite](#-testing--verification-suite)
- [Best Practices & Architectural Invariants](#-best-practices--architectural-invariants)
- [CI/CD & Repository Automation](#-cicd--repository-automation)
- [Troubleshooting FAQ](#-troubleshooting-faq)

---

## 🚀 Project Status & Health

All core modules, contracts, and quality gates have been implemented and independently verified:

| Pipeline Gate | Target | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Type Integrity** | `npm run typecheck` | ✅ PASS | 0 TypeScript errors across monorepo |
| **Code Style & Lint** | `npm run lint` | ✅ PASS | 0 errors via ESLint 9 native flat configuration |
| **Unit Test Suite** | `npm run test` | ✅ PASS | 20/20 unit tests pass offline with mock language models |
| **AI Evaluation Suite** | `npm run evals` | ✅ PASS | 10/10 structured extraction test cases pass |
| **Database Indexes** | `npm run db:indexes` | ✅ PASS | Compound B-tree + Atlas Vector Search (768d HNSW) validated |
| **Data Seeding** | `npm run db:seed` | ✅ PASS | Idempotent seed (7 items, 3 threads, 5 AI telemetry runs, 0 warnings) |
| **Production Build** | `npm run build` | ✅ PASS | Offline Next.js 16 Turbopack build succeeds in ~4.3s |
| **Single MongoClient** | Spec Rule 4 | ✅ PASS | Exactly 1 cached MongoClient instantiation in `src/lib/db.ts` |

---

## ⚡ Quickstart: Zero to Running in 5 Minutes

### Prerequisites
- **Node.js**: `>= 22.0.0` (required for Vercel AI SDK v7 Core)
- **npm**: `>= 10.x` (monorepo uses npm workspaces; pnpm/yarn/bun are not configured)
- **Docker Desktop**: Running locally for MongoDB Atlas Local (with local vector search support)
- **Python** *(optional)*: `>= 3.12` and `uv` if running the Python FastAPI sidecar

### Step-by-Step Launch

```bash
# 1. Start MongoDB Atlas Local container (includes mongod + mongot vector search)
docker compose up -d

# 2. Copy and set up environment configuration
cp .env.example .env.local

# 3. Install dependencies across all workspaces
npm install

# 4. Generate compound indexes and Atlas Vector Search index definition
npm run db:indexes

# 5. Populate initial demo seed data (items, threads, runs)
npm run db:seed

# 6. Launch Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
* Click **"Login as Demo User"** for instant access to the pre-seeded demo workspace with 7 realistic artifacts, conversation history, and telemetry.
* Or click **"Launch Demo Anonymously"** to test zero-friction anonymous guest onboarding.

---

## 🔑 Configuration & API Keys

Environment variables are validated on server startup using strict Zod schemas in [`apps/web/src/lib/env.ts`](apps/web/src/lib/env.ts).

Create `.env.local` in the project root or in `apps/web/.env.local`:

```bash
# ==============================================================================
# DATABASE CONFIGURATION
# ==============================================================================
# Local Atlas Local container (default) or MongoDB Atlas Cloud SRV string
MONGODB_URI="mongodb://localhost/?directConnection=true"
MONGODB_DB="aicon"

# ==============================================================================
# AUTHENTICATION (Better Auth)
# ==============================================================================
# Random 32+ character secret for HMAC cookie signing (openssl rand -base64 32)
BETTER_AUTH_SECRET="aicon-hackathon-development-secret-key-32-chars-minimum"
# Canonical base URL for auth redirects and callbacks
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ==============================================================================
# AI PROVIDERS & GATEWAY (Keys optional for offline tests)
# ==============================================================================
# Primary Gemini API Key (get from https://aistudio.google.com/)
GOOGLE_GENERATIVE_AI_API_KEY=""

# Secondary Gemini API Key (automatic fallback if primary encounters 429 quota exhaustion)
GOOGLE_GENERATIVE_AI_API_KEY_B=""

# Vercel AI Gateway Key (optional BYOK routing)
AI_GATEWAY_API_KEY=""

# ==============================================================================
# CLOUD STORAGE & RATE LIMITING
# ==============================================================================
# Vercel Blob read/write token for direct cloud uploads (no local disk writes)
BLOB_READ_WRITE_TOKEN=""

# Upstash Redis REST credentials for distributed sliding-window rate limiting
# (Falls back to in-memory rate limiting if left empty)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Sentry DSN for error monitoring
SENTRY_DSN=""

# Seeded Demo User Identity
DEMO_USER_EMAIL="demo@example.com"
```

> **Note on Keys:** The test suite, evaluation script, and production build run **100% offline and key-free**. You only need `GOOGLE_GENERATIVE_AI_API_KEY` when testing real live Gemini LLM calls.

---

## 🗺️ Project Architecture & Anatomy

The repository is organized as a clean, modular monorepo:

```
aicon-hackathon/
├── apps/
│   ├── web/                              # Primary full-stack Next.js 16 product
│   │   ├── src/app/                      # Next.js App Router (UI & API Routes)
│   │   │   ├── (marketing)/page.tsx      # Public landing page with Demo User & Anonymous CTA
│   │   │   ├── (app)/dashboard/page.tsx  # Workspace dashboard (metrics & item grid)
│   │   │   ├── (app)/items/[id]/page.tsx # Item inspector, structured metadata, and chat panel
│   │   │   └── api/                      # REST & streaming route handlers
│   │   ├── src/components/
│   │   │   ├── ai/                       # Chat & Structured Extraction components
│   │   │   └── ui/                       # shadcn/ui design primitives
│   │   ├── src/lib/
│   │   │   ├── ai/                       # AI models, RAG retrieval, extraction, and tools
│   │   │   ├── models/                   # Mongoose schemas (Item, Thread, Message, AiRun)
│   │   │   ├── auth.ts                   # Better Auth server configuration
│   │   │   ├── auth-client.ts            # Client-side React auth client
│   │   │   ├── contracts.ts              # Frozen interface contracts & shared schemas
│   │   │   └── db.ts                     # Single cached MongoClient & Mongoose pool
│   │   ├── src/scripts/                  # db:indexes, db:seed, and evals scripts
│   │   └── proxy.ts                      # Next 16 routing convention (replaces middleware.ts)
│   └── api/                              # Optional Python FastAPI sidecar (ML/OCR escape hatch)
├── packages/
│   └── shared/                           # Shared TypeScript contracts and schema definitions
├── .github/
│   ├── workflows/ci.yml                  # GitHub Actions CI matrix (Typecheck, Lint, Test, Evals, Build)
│   ├── workflows/codeql.yml              # CodeQL security & vulnerability scanning
│   ├── dependabot.yml                    # Automated dependency update schedule
│   ├── pull_request_template.md          # Standardized PR review checklist
│   └── ISSUE_TEMPLATE/                   # Professional GitHub issue forms
├── docker-compose.yml                    # Local MongoDB Atlas container configuration
└── package.json                          # Workspace root orchestrator
```

### 1. User Interface (UI)
* **Landing Page** ([`apps/web/src/app/(marketing)/page.tsx`](apps/web/src/app/(marketing)/page.tsx)): Features hero marketing copy, direct anonymous onboarding, and the **"Login as Demo User"** bypass button for judges.
* **Workspace Dashboard** ([`apps/web/src/app/(app)/dashboard/page.tsx`](apps/web/src/app/(app)/dashboard/page.tsx)): Displays workspace stats, artifact card gallery with AI tags, and instant item creation form.
* **Artifact & RAG View** ([`apps/web/src/app/(app)/items/[id]/page.tsx`](apps/web/src/app/(app)/items/[id]/page.tsx)): Side-by-side view featuring artifact raw text, structured extraction badges, re-extraction trigger, and contextual multi-turn conversational chat.
* **Design Primitives** ([`apps/web/src/components/ui/`](apps/web/src/components/ui/)): Clean shadcn/ui components configured with Tailwind CSS v4 design tokens.

### 2. Database & Data Models
* **Dual Connection Architecture** ([`apps/web/src/lib/db.ts`](apps/web/src/lib/db.ts)):
  * **Native MongoClient** via `getMongoClient()`: Cached on `globalThis` to preserve connection pool limits across Next.js Turbopack reloads. Instantiated **exactly once**.
  * **Mongoose Connection Pool** via `connectMongoose()`: Required by Server Components and API routes querying Mongoose models.
* **Mongoose Schemas** ([`apps/web/src/lib/models/`](apps/web/src/lib/models/)):
  * [`ItemModel`](apps/web/src/lib/models/item.ts): User-owned artifacts with 768d vector embeddings.
  * [`ChatThreadModel`](apps/web/src/lib/models/chat-thread.ts) & [`ChatMessageModel`](apps/web/src/lib/models/chat-message.ts): Multi-turn conversation history.
  * [`AiRunModel`](apps/web/src/lib/models/ai-run.ts): Observability log tracking input/output tokens, reasoning tokens, cache-read tokens, latency, and estimated cost.
* **Indexing Script** ([`apps/web/src/scripts/create-indexes.ts`](apps/web/src/scripts/create-indexes.ts)): Automatically builds compound B-tree indexes and registers the 768-dimensional Atlas Vector Search index.
* **Seed Script** ([`apps/web/src/scripts/seed.ts`](apps/web/src/scripts/seed.ts)): Completely idempotent seeding script with deterministic embedding vectors.

### 3. API Endpoints & Authentication
* **Better Auth Handler** ([`apps/web/src/app/api/auth/[...all]/route.ts`](apps/web/src/app/api/auth/[...all]/route.ts)): Handles session management, anonymous session provisioning, and magic link authentication.
* **Demo Sign-In** ([`apps/web/src/app/api/auth/demo/route.ts`](apps/web/src/app/api/auth/demo/route.ts)): Creates an authenticated session for `demo@example.com` with cryptographic HMAC cookie signing.
* **Streaming Chat** ([`apps/web/src/app/api/chat/route.ts`](apps/web/src/app/api/chat/route.ts)): Real-time UI message stream powered by AI SDK v7, with automatic message normalization, multi-step tool execution, and session-derived ownership enforcement.
* **Artifacts REST API** ([`apps/web/src/app/api/items/route.ts`](apps/web/src/app/api/items/route.ts)): Scoped CRUD operations for user artifacts.
* **Next.js 16 Request Proxy** ([`apps/web/src/proxy.ts`](apps/web/src/proxy.ts)): Modern request routing and session-cookie propagation (replaces legacy `middleware.ts`).

### 4. AI Spine & Automation
* **Models & Failover** ([`apps/web/src/lib/ai/models.ts`](apps/web/src/lib/ai/models.ts)): Configures `gemini-2.5-flash` for chat and extraction, with quota failover to secondary keys and mock fallbacks during tests.
* **Vector Embeddings & RAG** ([`apps/web/src/lib/ai/rag.ts`](apps/web/src/lib/ai/rag.ts)): 768-dimensional embeddings via `text-embedding-004`. Performs `$vectorSearch` with automatic regex keyword fallback if the vector index is offline.
* **Structured Extraction** ([`apps/web/src/lib/ai/extract.ts`](apps/web/src/lib/ai/extract.ts)): Uses `generateObject` with Zod validation to reliably extract summaries, tags, and action items.
* **Tool Calling** ([`apps/web/src/lib/ai/tools/`](apps/web/src/lib/ai/tools/)): Registered tools enabling the assistant to search the knowledge base, inspect artifacts, and create new workspace items.

### 5. Python FastAPI Sidecar
* **Path**: [`apps/api/`](apps/api/)
* **Purpose**: Optional sidecar for heavy Python ML workloads (OCR, Docling, HuggingFace embeddings). `apps/web` remains 100% functional standalone without requiring the sidecar.

---

## 🧪 Testing & Verification Suite

All commands are run from the repository root:

```bash
# 1. Typecheck the entire monorepo (Zero TS errors)
npm run typecheck

# 2. Lint code style (ESLint 9 Flat Config)
npm run lint

# 3. Run unit tests offline (Vitest + MockLanguageModelV3)
npm run test

# 4. Run AI structured extraction evals (10 offline test cases)
npm run evals

# 5. Verify database indexes (Compound B-tree & Atlas Vector Search)
npm run db:indexes

# 6. Verify database seed idempotency
npm run db:seed

# 7. Verify offline production build (Turbopack)
npm run build
```

---

## 🛡️ Best Practices & Architectural Invariants

1. **Exact-Single `MongoClient` Instance:**
   Constructing `new MongoClient` per request quickly exhausts connection pools on serverless architectures. All database connections must go through `getMongoClient()` or `connectToDatabase()` in [`apps/web/src/lib/db.ts`](apps/web/src/lib/db.ts).
2. **Server-Derived `ownerId`:**
   Client requests must never supply `ownerId` in request bodies. Route handlers derive `ownerId` directly from the validated session via `auth.api.getSession()`.
3. **No Filesystem Storage in Serverless:**
   Serverless environments (Vercel, AWS Lambda) have ephemeral filesystems. File uploads must stream directly to cloud object storage (`@vercel/blob`).
4. **Offline Test Determinism:**
   Unit tests and evaluations must never depend on live third-party API credentials or network availability. Use `MockLanguageModelV3` and `MockEmbeddingModelV3` for test assertions.
5. **AI SDK v7 Conventions:**
   * Use `convertToModelMessages` (strictly `await`ed).
   * Specify system instructions via `instructions:` parameter (never `system:`).
   * Reference messages as `ModelMessage` and normalize incoming message parts.
6. **Next.js 16 Request Routing:**
   Next.js 16 uses `src/proxy.ts` exporting a `proxy` function. The legacy `middleware.ts` convention is deprecated.
7. **Vector Index Dimension Alignment:**
   `EMBEDDING_DIMENSIONS = 768` is exported as a single source of truth in [`apps/web/src/lib/contracts.ts`](apps/web/src/lib/contracts.ts). Both the embedding generator and the vector index script consume this constant to prevent dimension mismatches.

---

## ⚙️ CI/CD & Repository Automation

This starter comes equipped with automated GitHub Actions workflows:

* **Continuous Integration ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):**
  Triggers on every `push` and `pull_request` to `main`. Executes Typecheck, Lint, Vitest unit tests, AI evals, and production build in a clean container.
* **Security Scanning ([`.github/workflows/codeql.yml`](.github/workflows/codeql.yml)):**
  Runs weekly and on pull requests to detect vulnerabilities using GitHub CodeQL.
* **Dependency Maintenance ([`.github/dependabot.yml`](.github/dependabot.yml)):**
  Monthly grouped dependency updates for npm packages and GitHub Actions.
* **Issue & PR Templates:**
  Structured GitHub issue forms for Bug Reports, Feature Proposals, and standardized Pull Request checklists located in [`.github/`](.github/).

---

## ❓ Troubleshooting FAQ

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `Cannot connect to MongoDB` | Atlas Local Docker container is starting or stopped | Run `docker compose up -d` and verify health with `docker compose ps`. |
| `TopologyDescription: ReplicaSetNoPrimary` | Missing `directConnection=true` parameter in URI | Ensure connection URI includes `?directConnection=true` when running Atlas Local container. |
| Vector search returns 0 results | Dimension mismatch between embedding model and index | Verify `EMBEDDING_DIMENSIONS` in `apps/web/src/lib/contracts.ts` (768) matches the vector search index in `apps/web/src/scripts/create-indexes.ts`. |
| Mongoose queries buffer indefinitely (10s timeout) | Missing `await connectMongoose()` in server component | Ensure `connectMongoose()` is called before executing any Mongoose model operations. |
| Chat crashes on legacy messages | Missing message `parts` array in payload | Chat route automatically normalizes string `content` to `{ type: 'text', text: content }`. |
| `next lint` command not found | Next.js 16 removed the `next lint` CLI wrapper | Use `npm run lint` which executes `eslint src/` with native flat config. |
