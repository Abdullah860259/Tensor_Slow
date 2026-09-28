# aicon-hackathon

Foundation repo for the AICON hackathon build. **The product domain is
deliberately undecided** — this repo currently holds a domain-agnostic starter
plan plus an optional Python sidecar.

## Read these first, in this order

| Doc | What it is |
|---|---|
| [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) | The architecture plan: decisions, verified stack versions, data model, AI layer, deploy runbook, timeline, risks |
| [`docs/SYSTEM_PROMPT.md`](docs/SYSTEM_PROMPT.md) | A copy-pasteable prompt that generates the Phase 0 / Phase 1 code with a strong coding model |
| [`docs/STUDENT_PACK_CHECKLIST.md`](docs/STUDENT_PACK_CHECKLIST.md) | What to claim from the GitHub Student Developer Pack, with a team capture sheet |
| [`docs/AGENT_ORCHESTRATION.md`](docs/AGENT_ORCHESTRATION.md) | **Multi-agent layer.** Ownership map, wave plan, orchestrator / agent / verifier prompts, and the rules that stop parallel agents corrupting each other's work |

## How this repo gets built

This repo is **not** the final app skeleton yet. There are two ways to generate it.

**Path 1 — one agent, serial.** Run `docs/SYSTEM_PROMPT.md` through a strong coding
model. It generates Phase 0 and Phase 1 into a scratch directory; the team reviews the
diff and merges it into `apps/web`.

**Path 2 — several agents, parallel.** Follow `docs/AGENT_ORCHESTRATION.md`. It defines
four waves, a strict file-ownership map, and orchestrator / agent / verifier prompts.
Use this only when you have at least three genuinely parallel workers — below that
threshold, serial is faster.

### Before either path

**Commit the docs first.** This repo has **zero commits** — every file shows as
untracked in `git status`. Worktrees and branch-based review need that first commit,
and committing the docs now means all generated code arrives as one reviewable,
revertable diff.

```bash
git add -A
git commit -m "docs: blueprint, system prompt, student pack checklist, orchestration"
```

Either path ends the same way: the team picks the product domain and builds features
on the spine. See `docs/BLUEPRINT.md` §17 for the ordered next-steps checklist.

## Current state

| Path | State |
|---|---|
| `src/aicon_hackathon/` | FastAPI scaffold (optional sidecar — see BLUEPRINT §2) |
| `pyproject.toml` | Python project, `uv` + `uv_build` |
| `docs/` | The planning documents |
| `apps/web/` | **Not created yet** — Phase 0 creates it |

### Known defects in the existing scaffold

Documented in full in `docs/BLUEPRINT.md` §1. In short:

1. `[project.scripts] aicon-hackathon = "aicon_hackathon.main:app"` is invalid —
   a console-script target must be a callable, not a `FastAPI` instance.
2. `allow_origins=["*"]` with `allow_credentials=True` is rejected by browsers
   (invalid per the CORS spec).
3. `requires-python = ">=3.14"` is too tight for many AI/ML wheels; relax to
   `>=3.12,<3.15`.

These are fixed as part of Phase 0 (sidecar items 47–48 in
`docs/SYSTEM_PROMPT.md`).

## Prerequisites

- Node ≥ 22 (**not** 20.9 — the `ai` package requires 22)
- npm (pnpm is not installed on the dev machine)
- Docker Desktop
- Python 3.12+ and `uv` (optional, sidecar only)

