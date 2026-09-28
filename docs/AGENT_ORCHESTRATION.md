# Multi-Agent Orchestration

> **What this is.** The layer that sits on top of `docs/SYSTEM_PROMPT.md` when the
> work is split across **several agents in parallel** rather than run by one agent
> serially.
>
> `docs/SYSTEM_PROMPT.md` remains the binding *spec* — it defines what each file
> must contain. **This document defines who builds which file, in what order, and
> the rules that stop agents from corrupting each other's work.**
>
> **Read order for a human:** `README.md` → `docs/BLUEPRINT.md` → `docs/SYSTEM_PROMPT.md`
> → this file.
>
> **Read order for an agent:** `docs/SYSTEM_PROMPT.md` first (it is the spec), then
> only its own section here.

---

## 0. When to use this — and when not to

The scarce resource changes when you add agents. It stops being tokens and becomes
**the interface between agents**. So multi-agent only pays off when the interfaces
are already frozen and the file sets are genuinely disjoint.

| Situation | Use |
|---|---|
| 7-day event, 4 people, need to parallelise | **Full run** — all four waves below |
| ~48-hour event | **Compressed run** — Waves 0, 1, then a single combined Wave 2. Skip 3 (§10) |
| One person, one agent | **Do not use this file.** Run `docs/SYSTEM_PROMPT.md` serially |
| Two agents touching the same files | **Do not use this file.** Serialize instead — the coordination cost exceeds the gain |

**The honest threshold:** multi-agent coordination is front-loaded and overhead-heavy.
Wave 0 and Wave 3 produce zero features. That is a good trade over seven days and a
bad one over thirty-six hours.

---

## 1. Preconditions — do these before any agent starts

### 1.1 Commit first

Worktrees and branches require at least one commit. This repo currently has **zero
commits** — every file shows as untracked in `git status`. That is a hard blocker
for the worktree approach, not a nicety.

```bash
git add -A
git commit -m "docs: blueprint, system prompt, student pack checklist, orchestration"
```

**Commit the docs before any generator runs**, so all generated code arrives as an
amendable, revertable diff rather than as an undifferentiated blob.

### 1.2 Give each agent its own worktree

Use this when the agents are **separate CLI sessions** on the same machine. It gives
each one an isolated checkout, so a slipped ownership rule cannot silently clobber a
sibling's file.

```bash
git worktree add ../aicon-agent-a -b agent/a-data
git worktree add ../aicon-agent-b -b agent/b-auth
git worktree add ../aicon-agent-c -b agent/c-ai
git worktree add ../aicon-agent-d -b agent/d-api
git worktree add ../aicon-agent-e -b agent/e-ui
git worktree add ../aicon-agent-f -b agent/f-quality
```

If your agents are **subagents inside one orchestrator** rather than separate
sessions, skip the worktrees — but then no two agents may run `npm install`
concurrently, and the ownership map in §3 becomes the only thing preventing a
clobber. Treat it as strict, not advisory.

### 1.3 Freeze the toolchain

Wave 0 runs `npm install` exactly once and commits the lockfile. After that the
lockfile is frozen (§9.2).

---

## 2. The four waves

```
WAVE 0  (serial, orchestrator)          ← the interface freeze
   manifest items 1–18
 + src/lib/contracts.ts               (NEW — see §3.1)
 + signature-only STUBS for items 19–46
   npm install (once) → typecheck green → COMMIT
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
WAVE 1  A data     B auth     C AI core        (parallel)
        └───────────┴───────────┘
                    │  merge in order
        ┌───────────┼───────────┐
        ▼           ▼           ▼
WAVE 2  D API      E UI       F quality        (parallel)
        └───────────┴───────────┘
                    │  merge in order
                    ▼
WAVE 3  V verifier  (independent session, writes nothing)   + orchestrator does items 47–48
```

**Why the boundaries sit where they do.** Wave 1's three agents share exactly one
dependency: the stubs Wave 0 wrote. Wave 2's D and E share exactly one interface: the
AI SDK's own `UIMessage` type plus the Zod schemas in `contracts.ts`. **Both
interfaces are frozen before either wave starts.** That is the whole trick — no agent
ever waits on another agent's *code*, only on its own work.

**Why Wave 0 writes stubs rather than just config.** A stub file with the correct
exports and `throw new Error("not implemented")` bodies means `npm run typecheck`
passes *before* any feature code exists. That turns the interface freeze from an
aspiration into a compiler-enforced fact. Without stubs, every Wave 1 agent
immediately hits `Cannot find module '@/lib/ai/rag'` — and the naive response is to
create that file, at which point two agents own one file with divergent
implementations.

---

## 3. Ownership map

Manifest item numbers refer to `docs/SYSTEM_PROMPT.md`.

| Wave | Agent | Owns manifest items | Owns these files |
|---|---|---|---|
| 0 | **Orchestrator** | 1–18 + contracts | `.nvmrc`, `.gitignore`, both `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc`, `globals.css`, `docker-compose.yml`, `.env.example`, `lib/env.ts`, `lib/db.ts`, `lib/logger.ts`, `lib/contracts.ts`, `CONTRIBUTING.md`, `ci.yml`, `README.md`, **+ all stubs** |
| 1 | **A — data** | 23, 24, 25, 26, 27, 28 | `lib/models/item.ts`, `lib/models/chat.ts`, `lib/models/ai-run.ts`, `lib/models/index.ts`, `scripts/create-indexes.ts`, `scripts/seed.ts` |
| 1 | **B — auth** | 19, 20, 21, 22 | `lib/auth.ts`, `lib/auth-client.ts`, `api/auth/[...all]/route.ts`, `proxy.ts` |
| 1 | **C — AI core** | 29, 30, 31, 32, 33, 34, 35 | `lib/ai/models.ts`, `lib/ai/prompts/system.ts`, `lib/ai/embed.ts`, `lib/ai/extract.ts`, `lib/ai/rag.ts`, `lib/ai/tools.ts`, `lib/rate-limit.ts` |
| 2 | **D — API** | 36, 37 | `api/chat/route.ts`, `api/items/route.ts` |
| 2 | **E — UI** | 38, 39, 40, 41, 42, 43, 44 | `components/ai/chat.tsx`, `components/ai/structured-result.tsx`, `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/items/[id]/page.tsx`, `app/(marketing)/page.tsx`, `components/ui/*` |
| 2 | **F — quality** | 45, 46 | `vitest.config.ts`, `src/lib/__tests__/rag.test.ts`, `src/lib/__tests__/extract.test.ts`, `evals/cases.json`, `scripts/evals.ts` |
| 3 | **V — verifier** | — | **nothing.** Writes a report only |
| 3 | **Orchestrator** | 47, 48 | `apps/api/*` (optional sidecar, lowest priority) |

### 3.1 `src/lib/contracts.ts` — the one addition to the manifest

This file is **not** in `docs/SYSTEM_PROMPT.md` because a single serial agent does not
need it. Multi-agent does: it is the frozen interface that lets D and E build
simultaneously.

It holds every Zod schema and inferred type shared across an ownership boundary:

- `ItemSchema`, `ItemCreateInput`, `ItemListItem`
- `ChatRequestSchema`
- `AiRunSchema`
- `EMBEDDING_DIMENSIONS` (the single constant shared by the index script and the embed helper)
- `ExtractResultSchema` (the structured-output contract)
- the extracted prompt-version constant

**Rules for this file**

- Wave 0 writes it. It is written **before** any agent starts.
- No agent may edit it. No agent may change an exported signature in it.
- If an agent believes a change is required, it reports a **REQUEST** and stops.
  The orchestrator decides and makes the change in a dedicated commit, then re-validates.

If this file turns out to be wrong, that is a **stop-the-line event** — not something
an agent resolves locally. A locally-resolved contract disagreement is exactly how two
branches end up individually green and jointly broken.

### 3.2 When `contracts.ts` should move

It lives in `apps/web/src/lib/` for now. Move it to `packages/shared/` only when a
**second consumer** actually exists — realistically, only if the FastAPI sidecar
(item 47) becomes real and needs the same shapes. Moving it earlier is ceremony.

---

## 4. ORCHESTRATOR prompt

Give this to the agent (or human) that plans, dispatches, and integrates. It does **not**
write feature code.

```
Repo: aicon-hackathon.

Read in full, in this order, before doing anything:
  docs/SYSTEM_PROMPT.md        ← the binding spec
  docs/BLUEPRINT.md            ← architecture decisions; do not contradict
  docs/AGENT_ORCHESTRATION.md  ← your operating manual (this document)

You are the ORCHESTRATOR. You do not write feature code. You do five things:

1. WAVE 0 (serial — you do this yourself).
   Produce manifest items 1–18 from docs/SYSTEM_PROMPT.md, plus:
     - src/lib/contracts.ts (§3.1 of your manual)
     - a SIGNATURE-ONLY STUB for every file in items 19–46. Stubs must have correct
       exports and correct types, with bodies that throw new Error("not implemented").
   Then, exactly once: `npm install`.
   Then `npm run typecheck` MUST pass. If it does not, fix it before continuing —
   a broken Wave 0 poisons every downstream agent.
   Then COMMIT. Wave 0 is the interface freeze.

2. DISPATCH Wave 1 (agents A, B, C — see the ownership map). Parallel.
3. MERGE Wave 1 in order A → B → C.
4. DISPATCH Wave 2 (agents D, E, F). Parallel. Only after Wave 1 is merged.
5. MERGE Wave 2 in order D → E → F, then hand off to the verifier, then do items
   47–48 (the optional FastAPI sidecar) last.

Use the agent prompt in §5, substituting the agent's letter, branch, manifest items,
and file list. Use the verifier prompt in §6 verbatim, in a SEPARATE session.

Non-negotiables you enforce on every agent:
  - An agent edits ONLY its owned files. Anything else → it reports a REQUEST.
  - An agent NEVER adds, removes, or upgrades a dependency. The lockfile is frozen
    after Wave 0. A new dependency is a REQUEST to you, handled by you, in a
    separate commit.
  - An agent NEVER changes an exported signature in contracts.ts or in any stub.
  - An agent NEVER commits to main, merges, rebases, or force-pushes.
  - An agent NEVER runs a command that mutates the database or the remote.
    YOU are the only one who runs `npm run db:indexes` and `npm run db:seed`, and
    only after the relevant branch is merged.

Merge conflict hot-spots you must police — each has exactly ONE owner:
  package.json, package-lock.json, tsconfig.json, next.config.ts, globals.css,
  src/lib/contracts.ts, src/lib/models/index.ts, src/lib/ai/models.ts
If two branches touch one of these, you have a DISPATCH bug. Stop and re-dispatch.
Do not resolve it by hand — a hand-resolved contract conflict is the failure this
whole structure exists to prevent.

Collect every agent's report into docs/agent-reports/<agent>.md, then consolidate
all UNVERIFIED and REQUESTS entries into docs/agent-reports/_CONSOLIDATED.md.

Final output: the merged tree plus the consolidated open-risk list. Do not report
work as done that an agent marked UNVERIFIED.
```

---

## 5. AGENT prompt template

One per agent. Substitute `<LETTER>`, `<BRANCH>`, `<ITEMS>`, and `<FILE LIST>` from
the ownership map in §3.

```
You are AGENT <LETTER> on the aicon-hackathon repo. Branch: <BRANCH>.

Read these in full FIRST. Do not summarise them back to me.
  docs/SYSTEM_PROMPT.md   ← your binding spec. The sections "CRITICAL BREAKING
                            CHANGES YOU MUST RESPECT", "CODING STANDARDS", and
                            "EXPLICITLY DO NOT" are hard constraints, not advice.
  src/lib/contracts.ts    ← the FROZEN interfaces. Import from it freely.
                            You may NOT edit it. You may NOT change any exported
                            signature in it.

YOUR SCOPE — you own manifest items <ITEMS> and nothing else:
<FILE LIST>

Those files exist as signature-only stubs. Replace the stub bodies with full
implementations, as specified in docs/SYSTEM_PROMPT.md. Keep the exported
signatures exactly as they are.

RULES
  1. Edit ONLY the files listed above. If you need a change anywhere else — a new
     export, a config tweak, a shared helper — STOP and report it as a REQUEST.
     Do not edit it. Do not create it.
  2. Do NOT add, remove, or upgrade any dependency. The lockfile is frozen.
  3. Do NOT commit to main, merge, rebase, or force-push. Commit only to <BRANCH>.
  4. Do NOT run any command that mutates the database or the remote.
  5. When finished, run `npm run typecheck`. Errors caused by files ANOTHER AGENT
     OWNS are EXPECTED — report them and stop. Do NOT "fix" them by creating those
     files. Creating a file you do not own is the single worst thing you can do here.
  6. Before using any version-sensitive API, verify it against the installed
     typings in node_modules. If you cannot verify it, write `// TODO(verify)` and
     report it. NEVER invent a function, option, import path, or config key.
  7. Honour the invariants: the MongoClient is cached on globalThis and you must
     not construct another; uploads go to Vercel Blob and never to the filesystem;
     `ownerId` always comes from the server session and never from the request body.

REPORT — exactly this shape, nothing more. No essays, no restating the spec.

  AGENT:          <LETTER> — <name>
  WAVE:           <0|1|2|3>
  BRANCH:         <BRANCH>
  FILES WRITTEN:  <paths, one per line>
  STUB SIGNATURES CHANGED:  none | <list + why>
  TYPE CHECK:     pass | fail (<exact error>)
  TESTS RUN:      <command> → <result>
  UNVERIFIED:     <anything you could not confirm, or "none">
  REQUESTS:       <changes needed in files you do not own, or "none">
```

---

## 6. VERIFIER prompt

Run this in a **separate session** with the verifier agent, after Wave 2 is merged.
Critically: the verifier must read the repository **before** it reads any agent's
report, or it will anchor on what the authors claimed and confirm rather than test.

```
You are the VERIFIER. You wrote none of this code and you have no history with it.

Do NOT read docs/agent-reports/ until you have finished your own investigation.
Form your view from the repository first. Then compare it against what the agents
claimed and report the differences — the differences are the most valuable output.

Read docs/SYSTEM_PROMPT.md, then execute its "DEFINITION OF DONE" section yourself,
on a FRESH clone of the merged main branch with a fresh `npm install`.

You may not fix anything. You may only reproduce, observe, and report. If you find a
defect, the orchestrator re-dispatches it to the owning agent.

Attempt to FALSIFY these claims rather than confirm them. Use the exact commands.

  1. Next 16 proxy rename
       grep -rn "middleware" apps/web/src --include=*.ts --include=*.tsx
     Must return nothing for the reserved file/function name. Next 16 uses
     src/proxy.ts exporting `proxy`.

  2. AI SDK v7 renames
       grep -rn "\bsystem:" apps/web/src
       grep -rn "convertToCoreMessages\|CoreMessage\|experimental_output\|MockLanguageModelV2" apps/web/src
     Must return nothing. Confirm every `convertToModelMessages` call site is awaited.

  3. Vector index dimension is NOT duplicated
       grep -rn "numDimensions\|EMBEDDING_DIMENSIONS" apps/web/src
     The dimension must come from ONE exported constant used by both the index
     script and the embedding helper. A hard-coded literal in either place is a defect.

  4. Single MongoClient
       grep -rn "new MongoClient" apps/web/src
     Must appear exactly once, inside the cached getter.

  5. Uploads never touch the filesystem
       grep -rn "writeFile\|createWriteStream\|fs\.write\|formidable\|multer" apps/web/src
     Must return nothing. Uploads go to Vercel Blob.

  6. Package majors are not mismatched
       cat apps/web/package.json
     No @ai-sdk/* package may be pinned to ^7. Verify the ai package is 7.x and
     @ai-sdk/react, @ai-sdk/gateway, @ai-sdk/google are 4.x.

  7. ownerId is never client-supplied
       grep -rn "ownerId" apps/web/src/app/api
     Every occurrence must trace to the server session, never to a parsed request body.

  8. Failure is readable, not silent
     Point MONGODB_URI at a bad host and start the app. It must fail with a readable,
     actionable error — not a blank screen, not a silent hang, not an unhandled
     promise rejection.

  9. Seed is idempotent
     Run `npm run db:seed` twice. The second run must not duplicate data.

 10. Tests are offline and key-free
     Unset every AI key, then `npm run test`. Tests must still pass.

 11. The end-to-end path works
     Open the app: landing page → anonymous session without signup → dashboard lists
     seeded items → an item detail page shows its AI summary and tags → the chat panel
     streams a token-by-token response that CITES a retrieved item.

Report every item as PASS / FAIL / COULD-NOT-RUN with the exact command and the exact
observed output. A FAIL with evidence is worth more than a PASS without it.

Then, and only then, read docs/agent-reports/ and list every agent claim that your
independent evidence does not support.
```

---

## 7. Merge order and conflict hot-spots

Merge strictly in this order. The order is not arbitrary — each step's output is the
next step's compile input.

```
Wave 0  →  A  →  B  →  C  →  D  →  E  →  F  →  verifier  →  items 47–48
```

**After each merge, the orchestrator runs `npm run typecheck` before merging the next
branch.** One bad merge invalidates every subsequent branch's green check, and finding
that out four merges later is how a team loses a day.

### Files with exactly one owner

| File | Sole owner | Why it conflicts if shared |
|---|---|---|
| `package.json`, `package-lock.json` | Wave 0 | Any parallel edit produces an unresolvable lockfile conflict |
| `tsconfig.json` | Wave 0 | Path aliases and strict flags are shared by every file |
| `next.config.ts` | Wave 0 | Shared by all routes |
| `postcss.config.mjs`, `eslint.config.mjs` | Wave 0 | Build-wide |
| `app/globals.css` | Wave 0 | Tailwind v4 theme tokens are global |
| `src/lib/contracts.ts` | Wave 0 | The frozen cross-agent interface |
| `src/lib/models/index.ts` | Agent A | Barrel file; every model import flows through it |
| `src/lib/ai/models.ts` | Agent C | The single model registry |

**If two branches touch a file in this table, you have a dispatch bug.** Stop and
re-dispatch. Do not resolve it by hand — a hand-resolved contract conflict is precisely
the failure this structure exists to prevent, and it manifests later as two branches
that are individually green and jointly broken.

---

## 8. Report protocol

Each agent returns a fixed-format report (see §5). The orchestrator copies it verbatim
into `docs/agent-reports/<agent>.md` and then consolidates every `UNVERIFIED` and
`REQUESTS` entry into `docs/agent-reports/_CONSOLIDATED.md`.

Template and rationale: **`docs/agent-reports/README.md`**.

Two habits worth enforcing:

- **Read `UNVERIFIED` before `FILES WRITTEN`.** A report with an empty `UNVERIFIED`
  field usually means the agent did not check, not that the work is flawless.
- **`REQUESTS` is not a failure.** An agent correctly refusing to edit a file it does
  not own is the system working. An agent that "helpfully" fixed it is the system
  failing, and it will not announce itself.

---

## 9. Why these rules exist — the failure modes they prevent

Every rule above maps to a specific way multi-agent work goes wrong. Knowing the
failure modes makes the rules easier to enforce under time pressure.

### 9.1 Two agents, one file, divergent implementations

Agent D hits `Cannot find module '@/lib/ai/rag'` and creates it so its own build goes
green. Agent C also creates it, differently. Both branches typecheck. The merge
silently keeps one and discards the other, and a feature vanishes with no conflict
marker to warn you.

**Prevented by:** Wave 0's signature-only stubs (so the module always resolves) plus
the rule *"errors from other agents' files are expected — report, do not fix."*

### 9.2 The lockfile conflict

Two branches each run `npm i <something>`. The `package-lock.json` deltas cannot be
reconciled mechanically, and unwinding it costs more than the dependency was worth.

**Prevented by:** one install in Wave 0, then a hard freeze. New dependencies become a
REQUEST handled by the orchestrator in a dedicated commit.

### 9.3 The locally-resolved contract disagreement

Agent B decides `auth.api.getSession()` should return a narrowed user shape and
"improves" the shared type. Agent D built against the original. Both compile in
isolation; together they throw at runtime on a code path nobody tests before the demo.

**Prevented by:** `contracts.ts` being uneditable by agents, and a contract change
being a stop-the-line event rather than a local judgement call.

### 9.4 Confident, unverified API usage

An agent writes v6 AI SDK code from memory because most training data describes v6. It
looks plausible, lints clean, and fails at runtime.

**Prevented by:** the "verify against installed typings, else `// TODO(verify)`" rule,
and by the verifier's grep checks which specifically target the v6 names.

### 9.5 The self-verifying author

An agent asked to check its own work confirms it, because it is checking against the
understanding it already had when it wrote the code. This is the weakest possible
verification and it feels like the strongest.

**Prevented by:** a separate verifier session with no authorship history, reading the
repo before the reports, and explicitly tasked to falsify rather than confirm.

### 9.6 Concurrent database mutation

Two branches' agents both run `npm run db:indexes` against the shared Atlas cluster
while the other is mid-write.

**Prevented by:** the orchestrator being the only entity that runs database-mutating
commands, and only after a merge.

---

## 10. Full run vs compressed run

### Full run — the default for a multi-day event

| Wave | Agents | Roughly |
|---|---|---|
| 0 — interface freeze | 1 (orchestrator) | the largest single block of serial work |
| 1 — A data, B auth, C AI core | 3 parallel | parallel wall time ≈ the slowest of the three |
| 2 — D API, E UI, F quality | 3 parallel | parallel wall time ≈ the slowest of the three |
| 3 — verifier + sidecar | 1 + orchestrator | verification is real work, budget for it |

Expect **two waves of genuine parallel speedup**, plus two serial blocks (0 and 3) that
produce no features at all. That is the honest shape of it.

### Compressed run — for a ~48-hour event

Waves 0 and 3 are pure overhead. If the clock is short:

1. **Wave 0** — non-negotiable. It is the foundation, and it is also the block you can
   execute fastest because it is mostly config.
2. **Wave 1** — still worth three parallel agents. The A/B/C split is clean, and auth,
   models, and the AI layer genuinely do not touch each other.
3. **Collapse Wave 2 into one agent.** D, E, and F share the UI/API boundary, and
   coordinating that boundary across three agents costs more than one agent doing all
   of it sequentially.
4. **Skip the verifier agent.** You verify by hand — but run checks 1, 2, 4, 5 and 9
   from §6 yourself. Those five are grep-and-run, take ten minutes, and catch the
   highest-severity defects.

### When to abandon multi-agent entirely

If you have one agent available, or fewer than three people to supervise, **run
`docs/SYSTEM_PROMPT.md` serially and ignore this document.** The overhead only pays off
with at least three genuinely parallel workers and a frozen interface to build against.
Below that threshold, serial is faster.

