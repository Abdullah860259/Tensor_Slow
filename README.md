# AICON Hackathon — AI Application Starter

An app-agnostic, production-ready AI application foundation built for fast hackathon iteration.

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript 7 · Vercel AI SDK v7 · MongoDB Atlas Local / Cloud · Better Auth · Tailwind CSS v4

---

## Prerequisites

- **Node.js**: `>= 22.0.0` (required by AI SDK v7 Core)
- **npm**: `12.x` (monorepo uses npm workspaces; pnpm/yarn/bun are not supported)
- **Docker & Docker Desktop**: For running MongoDB Atlas Local (with local Vector Search support)
- **Python**: `>= 3.12, < 3.15` and `uv` (optional sidecar only)

---

## Zero to Running in 10 Minutes

Run the following commands in order from the repository root:

```bash
# 1. Start local MongoDB Atlas container (supports Vector Search)
docker compose up -d

# 2. Configure environment variables
cp .env.example .env.local

# 3. Install dependencies across monorepo workspaces
npm install

# 4. Create compound & vector search indexes in MongoDB
npm run db:indexes

# 5. Populate initial demo seed data (items, threads, runs)
npm run db:seed

# 6. Launch the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## Environment Setup

Copy `.env.example` to `.env.local` in `apps/web` or root:

```bash
cp .env.example apps/web/.env.local
```

Key environment variables:
- `MONGODB_URI`: Defaults to `mongodb://localhost/?directConnection=true` for local Atlas Local container.
- `BETTER_AUTH_SECRET`: Random 32+ character string.
- `BETTER_AUTH_URL`: Canonical URL for auth callbacks (`http://localhost:3000`).
- `AI_GATEWAY_API_KEY`: Key for Vercel AI Gateway.
- `GOOGLE_GENERATIVE_AI_API_KEY`: Primary Gemini API key.
- `GOOGLE_GENERATIVE_AI_API_KEY_B`: Fallback Gemini API key for quota failover.
- `BLOB_READ_WRITE_TOKEN`: Token from Vercel Blob for cloud uploads.
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: For distributed rate limiting.

All environment variables are validated at import time via Zod in `src/lib/env.ts`.

---

## Architecture Overview

```
aicon-hackathon/
├── apps/
│   ├── web/                          # Next.js 16 full-stack product (UI, API routes, Auth, AI, DB)
│   │   ├── src/app/                  # App Router pages and API route handlers
│   │   ├── src/components/{ui,ai}/   # shadcn/ui components and AI chat/extraction widgets
│   │   ├── src/lib/                  # Server-side singletons, DB, auth, AI models, prompts
│   │   ├── src/scripts/              # Indexing, seeding, and evals scripts
│   │   └── proxy.ts                  # Next 16 request routing (replaces middleware.ts)
│   └── api/                          # Optional FastAPI sidecar (for Python-only ML/OCR needs)
├── packages/
│   └── shared/                       # Shared schemas and cross-boundary contracts
├── docker-compose.yml                # MongoDB Atlas Local (mongod + mongot for vector search)
├── .github/workflows/ci.yml          # GitHub Actions CI matrix
└── README.md
```

### The `apps/api` Sidecar

`apps/web` is the complete product. `apps/api` is an **optional** Python/FastAPI sidecar provided as an escape hatch for tasks Python excels at (e.g. PyTorch, heavy OCR, docling). The web application must **never** hard-depend on `apps/api`.

### TypeScript 7 Fallback

This project uses TypeScript 7 (`typescript@7.0.2`, the native Go-based compiler port). If any tooling, ESLint plugin, or `next build` encounter compiler incompatibility, you can safely fall back by installing `typescript@^5.9`:
```bash
npm i -D typescript@^5.9 --workspace=apps/web
```
Nothing in the Starter depends on TS 7-exclusive features.

---

## Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| `Cannot connect to MongoDB` | Atlas Local container is starting or not running | Run `docker compose ps` and wait until container status is `healthy`. |
| Vector search returns 0 results silently | Dimension mismatch between embedding model and index | Verify `EMBEDDING_DIMENSIONS` in `src/lib/contracts.ts` matches index definition in `src/scripts/create-indexes.ts`. |
| `proxy.ts` not executing | Misnamed as `middleware.ts` | Next.js 16 uses `src/proxy.ts` exporting `proxy`. |
| AI SDK functions not found | Using v6 names (`convertToCoreMessages`, `system:`) | AI SDK v7 requires `convertToModelMessages` (awaited) and `instructions:`. |
| Out of memory or connection limit on Atlas | MongoClient constructed per request | Ensure all queries use the cached `MongoClient` from `src/lib/db.ts`. |
| File uploads fail on Vercel | Local disk write attempted | Serverless filesystem is ephemeral; upload to `@vercel/blob`. |
