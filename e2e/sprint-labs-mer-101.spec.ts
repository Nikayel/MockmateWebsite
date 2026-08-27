import { test, expect } from "@playwright/test"

/**
 * MER-101, played through a real browser against a real dev server and real Firestore --
 * the live counterpart to lib/sprint-labs/__tests__/mer-101-end-to-end.test.ts's headless
 * proof (docs/sprint-labs/AGENT-PROMPT.md §4 / PLAN.md Task 22).
 *
 * SKIPPED BY DEFAULT, on purpose. Three things this repo does not have in CI or in this sandbox,
 * all required for this journey to mean anything:
 *   1. Real Firebase Admin credentials (`FIREBASE_SERVICE_ACCOUNT_KEY` + a real, non-"dummy"
 *      `NEXT_PUBLIC_FIREBASE_PROJECT_ID` -- CI's own env, see .github/workflows/ci.yml, sets the
 *      latter to the literal string "dummy" and never sets the former).
 *   2. A way to sign a real test user into that project from Playwright. Nothing in this repo does
 *      this yet -- e2e/guest-trial-journey.spec.ts's own header says so explicitly ("needs a
 *      seeded Firebase emulator user... TODO: cover it once an auth emulator exists in CI").
 *   3. `SPRINT_LABS_ENABLED` forced on (default OFF -- see docs/sprint-labs/EXECUTION-STATE.md's
 *      ship-behind-a-flag decision). Set via `FEATURE_FLAG_SPRINT_LABS_ENABLED=true` (env sits
 *      under a Firestore override in lib/feature-flags.ts's resolution order, so this is the
 *      correct break-glass lever for a throwaway dev server, not a Firestore doc edit).
 *
 * Running this for real, once an authenticated Playwright session exists:
 *   FEATURE_FLAG_SPRINT_LABS_ENABLED=true SPRINT_LABS_E2E_LIVE=1 \
 *     FIREBASE_SERVICE_ACCOUNT_KEY=<real key> NEXT_PUBLIC_FIREBASE_PROJECT_ID=<real project> \
 *     npx playwright test e2e/sprint-labs-mer-101.spec.ts
 *
 * `SPRINT_LABS_E2E_LIVE=1` is a deliberate, separate opt-in (not inferred from the Firebase vars
 * alone): CI's own dummy Firebase vars are non-empty strings, so checking for "some value" would
 * not actually detect "a real, authenticate-able project." Requiring the extra flag means this
 * spec fails closed by default even if a future CI change widens which env vars are populated.
 */

const canRunLive =
  Boolean(process.env.SPRINT_LABS_E2E_LIVE) &&
  Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) &&
  Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "dummy"

test.describe("Sprint Labs: MER-101 through all four gates + retro (live)", () => {
  test.skip(
    !canRunLive,
    "Needs real Firebase Admin credentials, a signed-in Playwright session, and " +
      "SPRINT_LABS_ENABLED forced on -- none of which exist in this CI/sandbox. See this file's " +
      "header for exactly what to set and how to run it for real. The headless, fully-passing " +
      "proof of the same MER-101 flow is lib/sprint-labs/__tests__/mer-101-end-to-end.test.ts."
  )

  test("a signed-in learner opens MER-101, submits the reference fix, and reaches a finalized retro", async ({
    page,
  }) => {
    test.setTimeout(300_000)

    // NOTE for whoever wires this up with real env: the pieces this journey needs already exist
    // and are exercised for real (just without a browser) by the headless integration test --
    // /sprint-labs/meridian (catalog) -> enroll -> /sprint-labs/meridian/run/standup ->
    // /sprint-labs/meridian/run/board -> /sprint-labs/meridian/run/ticket/MER-101 ->
    // /sprint-labs/meridian/run/workspace/MER-101 (edit src/http/parsers/claim-input.ts) ->
    // /sprint-labs/meridian/run/submit/MER-101 (visible -> hidden -> regression -> adversary) ->
    // /sprint-labs/meridian/run/retro/MER-101 (referenceDiff + scores visible only once finalized).
    await page.goto("/sprint-labs/meridian")
    await expect(page.getByRole("heading", { name: /meridian/i })).toBeVisible()

    // Left intentionally unimplemented beyond this point: without a real signed-in session there
    // is nothing further this spec can honestly assert. Extend it here once prerequisite 2 above
    // (a seeded auth-emulator/test user) exists in CI.
  })
})
