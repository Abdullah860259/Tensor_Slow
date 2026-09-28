# Agent Reports

One file per agent, named after the agent: `agent-a-data.md`, `agent-b-auth.md`, etc.

**Why this folder exists.** When several agents work in parallel, a human needs one
place to reconcile what each of them claims. An agent's chat response scrolls away;
a file in `docs/agent-reports/` does not.

**Rules**

- An agent writes **only its own file**. Never another agent's.
- An agent **never** edits `REQUESTS.md` — requests go in its own report, and the
  orchestrator consolidates them.
- Reports are committed. They are the handoff artifact, not scratch output.

---

## The report format every agent must use

Agents report in their response text using exactly this shape, and the orchestrator
copies it into the matching file here.

```
AGENT:          <letter and name, e.g. C — AI core>
WAVE:           <0 | 1 | 2 | 3>
BRANCH:         agent/<slug>

FILES WRITTEN:  <paths, one per line>
STUB SIGNATURES CHANGED:  none | <list + why>
TYPE CHECK:     pass | fail (<exact error>)
TESTS RUN:      <command> → <result>
UNVERIFIED:     <anything not confirmed, or "none">
REQUESTS:       <changes needed in files you do not own, or "none">
```

## Why `UNVERIFIED` is the most important field

A report with an empty `UNVERIFIED` field is usually not a good report — it is a
report from an agent that did not check. Agents cannot verify everything; API
shapes change, services are unreachable, a command needs a credential. **A named gap
is useful. A silent gap is a landmine.**

Read the `UNVERIFIED` section before the `FILES WRITTEN` section. Always.

## Consolidation

The orchestrator merges every agent's `UNVERIFIED` and `REQUESTS` into one open-risk
list at `docs/agent-reports/_CONSOLIDATED.md`. That file is the only one in this
folder that the orchestrator owns.
