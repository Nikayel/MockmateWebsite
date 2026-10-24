# Feedback Edge bundle budget

Vercel rejected the October 24 admin inspector release after its Next.js build passed: `/api/feedback/stream` exceeded the plan's 1 MB compressed Edge Function limit. Production continued serving the previous inspector, so users saw only its overview even though main contained the new tabs and GitHub CI was green.

The guided-lab feedback lookup had imported `lib/scenarios.ts`, which eagerly composes the entire problem catalog. Feedback needs only guided-lab configuration and editable-file paths. `lib/bugfix/guided-lab/scenarios.ts` now loads only guided lab scenarios. Its tests check that every guided lab in the catalog is registered and has the same assessment contract. Register new guided labs there when adding them.

After a production build, run:

```sh
node scripts/check-feedback-edge-bundle.mjs
```

CI runs this check immediately after `pnpm build`. It reads the feedback function's generated Next.js manifest, compresses the actual emitted files, and fails above 950,000 bytes. This leaves room below the hosting limit for deployment packaging. It fails if the expected build files are missing, rather than silently skipping verification. No new dependencies or credentials are required.

The failing build measured 1,078,572 compressed bytes locally; the scoped lookup reduced it to 867,381. These are local estimates, not Vercel's final package measurement. The actual production deployment must still reach Ready, and the live alias must serve that deployment. A green Next.js build or GitHub workflow alone does not establish that a change is live.
