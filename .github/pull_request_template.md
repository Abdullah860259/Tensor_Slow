## 📋 Description
Briefly explain the changes introduced by this pull request. Include architectural motivation, context, and any tradeoffs made.

## 🎯 Type of Change
- [ ] 🐛 Bug fix (non-breaking change fixing an existing defect)
- [ ] ✨ New feature / AI Capability (new model, tool, RAG stage, or route)
- [ ] 🎨 UI / UX refinement (layout density, styling, accessibility)
- [ ] ⚡ Performance optimization (query latency, caching, bundle size)
- [ ] 📝 Documentation update
- [ ] 🛡️ Security / Rate-limiting enhancement

## 🔗 Related Issue
Fixes #(issue number)

## 🧪 Verification & Testing
Please indicate how you verified these changes:
- [ ] `npm run typecheck` exits with code 0 (zero TypeScript errors)
- [ ] `npm run lint` passes with code 0 (ESLint 9 flat config clean)
- [ ] `npm run test` passes all unit tests offline without API keys
- [ ] `npm run evals` passes all 10 structured extraction benchmark cases
- [ ] `npm run db:indexes` validates compound & vector search indexes
- [ ] `npm run db:seed` runs cleanly and idempotently
- [ ] `npm run build` succeeds offline without live database dependencies
- [ ] Tested responsive behavior on mobile (<768px) and desktop viewports

## 📸 Screenshots / Demos (if applicable)
Add screenshots or screen recordings of the visual updates.

## 🛡️ Pre-Merge Checklist
- [ ] My code adheres to the project's styling and design tokens (Tailwind CSS v4, shadcn/ui).
- [ ] Exactly one `MongoClient` instance is maintained via `src/lib/db.ts` (Rule 4).
- [ ] No API keys, credentials, or sensitive secrets are committed.
- [ ] All database queries using Mongoose models call `await connectMongoose()`.
- [ ] Request handlers derive `ownerId` from the server session, never from client request bodies.
- [ ] Uploaded files stream to `@vercel/blob` and never write to the local serverless filesystem.
- [ ] All existing tests continue to pass.
