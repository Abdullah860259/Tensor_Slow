# GitHub Student Developer Pack — Claim Checklist

> **Claim the pack first:** <https://education.github.com/pack> (register with your
> school email or a verified student ID).
>
> **Important honesty note.** The pack rotates partners and amounts change without
> notice. Below, anything marked **[verified]** I confirmed on the pack page on
> 28 September 2026. Anything marked **[check]** I could not confirm — open the
> offer page yourself before you plan around it. Never budget a hackathon
> deliverable on a credit you have not actually activated.

---

## Tier 1 — claim these today, they change how you work

| Perk | Status | Why it matters for this build |
|---|---|---|
| **GitHub Copilot** — free for students | [verified] | Four people writing TypeScript in one repo. Also gives you Copilot code review on PRs, which catches the `@ai-sdk` version-mismatch class of mistake at review time. |
| **GitHub Codespaces** — free hours | [verified] | Kills "works on my machine". Your team is on Windows; a Codespace gives everyone an identical Linux Node 22+ environment. Also a fallback if a laptop dies mid-hackathon. |
| **GitHub Pro** | [verified] | Protected branches, code owners, more Actions minutes. |
| **Microsoft Azure** — credits for students | [verified] | Host the optional `apps/api` FastAPI sidecar, or use Azure OpenAI as a second LLM provider. **Set a spend cap immediately** — credits do not stop you overspending. |
| **GitLens** / **GitKraken** | [verified] | Git history UI. Genuinely helps when four people merge in a hurry. |

---

## Tier 2 — claim before you deploy (these protect the demo)

| Perk | Status | Why it matters |
|---|---|---|
| **Sentry** — error + performance monitoring | [check] | A deployed demo crashing at 2am with no logs is fatal. Free tier covers a hackathon easily. |
| **DevCycle** — feature flags, 1 free year Starter | [verified] | Ship half-finished features dark, flip them on for the demo. Also a one-key kill switch if a feature misbehaves on stage. |
| **ConfigCat** — 1000 flags, unlimited users | [verified] | Same idea, different vendor. Pick one, don't set up both. |
| **Honeybadger** — exceptions, uptime, cron monitoring | [verified] | Cron/uptime monitoring is genuinely useful once you add a scheduled job. |
| **Codecov** — coverage on public + private repos | [verified] | Turns "we have tests" into a number on a slide. |
| **Polypane** | [verified] | Accessibility + responsive inspection in one view. Directly supports the a11y requirement in the Starter's coding standards. |
| **LambdaTest** | [verified] | Cross-browser testing. Cheap insurance against "it only works in Chrome". |
| **SimpleAnalytics** — Starter free, 100k pageviews/mo | [verified] | Privacy-friendly analytics; no cookie banner. |
| **DeepScan** — 6-month JS/TS static analysis | [verified] | Finds real bugs in React/TS. Complements ESLint. |
| **Tower** — Pro licence | [verified] | Git client. Optional if you prefer CLI. |
| **GitKraken** | [verified] | See Tier 1. |

---

## Tier 3 — learning, design and long-tail (grab if useful, don't block on them)

| Perk | Status | Notes |
|---|---|---|
| **Educative** | [verified] | Courses. Use one track for whichever stack member is least confident. |
| **DataCamp** | [verified] | Data/AI learning. |
| **Codedex** | [verified] | Beginner-friendly. |
| **Bootstrap Studio** | [verified] | Visual page builder. Skip if you're using shadcn/ui — you are. |
| **POEditor** — Plus free 1 year | [verified] | Localisation management. Only if you ship multi-language. |
| **Visme** | [verified] | Presentation/design. **Actually useful for the pitch deck.** |
| **Dashlane** — Premium 6 months | [verified] | Password manager. Non-trivial: four people sharing API keys over chat is a real risk. |
| **CARTO** | [verified] | Location data + credits. Only if your idea is geo-based. |
| **Travis CI** | [verified] | CI. You're using GitHub Actions (free for public repos) — skip. |
| **OpenSauced** | [verified] | Contribution insights. Nice-to-have. |
| **Appfigures** | [verified] | App store analytics. Irrelevant unless you ship mobile. |
| **Themeisle / Vaadin / SymfonyCasts / Blockchair / POEditor** | [verified] | Domain-specific. Ignore unless relevant. |

---

## Free tiers OUTSIDE the pack — register these too

These are not Student Pack perks; they are free tiers anyone can claim. Verify
current terms before relying on them.

| Service | Why | Do this |
|---|---|---|
| **MongoDB Atlas** M0 | The database. **512 MB, and Atlas Vector Search is included on M0** — which is the whole reason we're not adding a separate vector DB. | Create the cluster on **day 0**, not day 6. Create a DB user, allow `0.0.0.0/0` for the hackathon window. |
| **Vercel** Hobby | Hosting. 300s function duration, 2 GB memory, 250 MB bundle (verified). | Connect the GitHub repo on day 0 and deploy a hello-world immediately. |
| **Vercel Blob** | File storage. **Vercel's filesystem is ephemeral** — uploading a file to disk and then reading it back after a cold start is the #1 deploy-only failure. | Set `BLOB_READ_WRITE_TOKEN`. |
| **Vercel AI Gateway** | Routes to hundreds of models, **charges no markup**, supports **BYOK** (bring your own key). | Put your free Gemini key in as BYOK so you get observability without paying a routing premium. |
| **Google AI Studio (Gemini API)** | The LLM. Free tier is capped by **RPM / TPM / RPD, applied per project**. | Get **two keys** (`GOOGLE_GENERATIVE_AI_API_KEY` and `..._B`) and wire the quota fallback. This has saved more demos than any feature. |
| **Upstash Redis** | Rate limiting (`@upstash/ratelimit`). Prevents one runaway `useEffect` from burning a month of quota in minutes. | Free tier is plenty. |
| **Resend** | Transactional email, if you enable magic-link / OTP auth. | Only if needed. |
| **Sentry** | See Tier 2. | Only if the pack offer doesn't cover you. |

---

## How to actually claim (order matters)

1. **Verify student status** at <https://education.github.com/pack>. Approval
   usually takes minutes, but can take days if your school email is not
   recognised — **do this first, today**, because nothing else unblocks until it is.
2. **Re-verify every `[check]` row yourself.** The pack rotates offers. Open the
   offer page, read the current amount and duration, then claim.
3. **Claim in dependency order:** Copilot → Codespaces → Azure (set a spend cap
   the same minute) → Sentry → the rest.
4. **Record what you claimed and when it expires** in the table below, or you
   will discover a trial lapsed on demo day.

## Team capture sheet — fill this in

| Perk | Owner | Claimed? | Expires | Notes |
|---|---|---|---|---|
| GitHub Copilot | | ☐ | | |
| Codespaces | | ☐ | | |
| GitHub Pro | | ☐ | | |
| Azure credits | | ☐ | | Spend cap set: ☐ |
| Sentry | | ☐ | | |
| DevCycle or ConfigCat | | ☐ | | pick ONE |
| Codecov | | ☐ | | |
| Polypane | | ☐ | | |
| LambdaTest | | ☐ | | |
| Visme | | ☐ | | pitch deck |
| Dashlane | | ☐ | | share API keys safely |
| Atlas M0 | | ☐ | n/a | |
| Vercel Hobby | | ☐ | n/a | |
| Vercel Blob | | ☐ | n/a | |
| Gemini API keys ×2 | | ☐ | n/a | both keys created |
| Upstash Redis | | ☐ | n/a | |

## Two warnings

**Do not let perks become a side quest.** The Student Pack is a helpful
distraction that feels like work. The Starter runs on MongoDB Atlas M0, Vercel
Hobby, Gemini's free tier, and Upstash's free tier — **zero paid services are
required**. Claim the top-tier items that unblock you, then stop and go build.
Every hour spent comparing feature-flag vendors is an hour not spent on the demo.

**Free AI tiers are capped per project, not per key.** Gemini's limits are
RPM / TPM / RPD applied per project. A single runaway loop in a React
`useEffect` can consume a month of quota in minutes. Rate-limit your AI routes
with Upstash *before* you demo — this is already in the coding standards of
`docs/SYSTEM_PROMPT.md`.

---

## Appendix — the "minimum viable claim" for a 48-hour event

If you only do five things from this document:

1. **GitHub Copilot** — free, immediate, changes how fast four people write code.
2. **GitHub Codespaces** — one identical environment for the whole team.
3. **MongoDB Atlas M0** — the database, and the vector search comes free with it.
4. **Vercel Hobby + Vercel Blob** — hosting and file storage.
5. **Two Gemini API keys** — the AI, with a quota fallback already wired.

That is the entire dependency list for the Starter. Everything else on this page
is optional polish.
