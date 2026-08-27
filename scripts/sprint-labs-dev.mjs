/**
 * Run with `pnpm sprint-labs:dev` (wraps `node scripts/sprint-labs-dev.mjs`) -- no shebang, same
 * reasoning as scripts/compile-workbooks.mjs/scripts/lab-validate.mjs: never executed standalone
 * in this repo's workflow. Unlike those two, this script imports no TypeScript itself (it only
 * shells out to the two `tsx`-run scripts below), so plain `node` runs it directly.
 *
 * ONE command for a fresh developer to reach a playable MER-101 (docs/sprint-labs/PLAN.md Task 22
 * / AGENT-PROMPT.md §4's "a seed script that gets a fresh developer to a playable MER-101 in one
 * command"):
 *
 *   1. Compile `workbooks/meridian` (`scripts/compile-workbooks.mjs`) into the public + sealed
 *      registries the live app and the grading routes actually read from.
 *   2. `lab validate` static gates on `workbooks/meridian` (`scripts/lab-validate.mjs`).
 *   3. `lab validate --dynamic` (red/green + regression + provisioning) on `workbooks/meridian`.
 *   4. Print the exact URL path to a playable MER-101, plus the env this repo needs to actually
 *      serve it (`SPRINT_LABS_ENABLED`, Firebase).
 *
 * FAILS LOUDLY: any step that does not cleanly pass prints its real output and this script exits
 * non-zero. It never prints "playable" over a red step.
 *
 * COMPILE IS EXPECTED TO SUCCEED, not merely tolerated: `compileTicket`
 * (scripts/compile-workbooks.mjs) gates on `isFullTicket` (both `reference.diff` AND
 * `rubric.yaml` authored) per ticket, not on the whole workbook. A ticket missing either compiles
 * PUBLIC-ONLY -- `playable: false`, no sealed `<KEY>.server.ts` emitted -- rather than aborting the
 * whole workbook's compile. So step 1 succeeds today even though `workbooks/meridian` still ships
 * plenty of ticket.md-only stubs; those tickets are simply not playable yet. This script still
 * scans and reports, every run, how many tickets are fully authored (`playable: true`) versus
 * still stubs (computed fresh from disk, never a stale hardcoded count) -- informational, not a
 * failure condition. If step 1 genuinely fails, that is a real regression (a malformed YAML, a
 * casing error, a workbook-id collision -- see the compiler's own CompileError text), not an
 * expected content-authoring gap, and this script treats it as loudly as any other red step.
 */
import { existsSync, readdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const MERIDIAN_DIR = join(ROOT, "workbooks/meridian")
const TICKET_KEY = "MER-101"

function banner(text) {
  console.log(`\n${"=".repeat(70)}\n${text}\n${"=".repeat(70)}`)
}

/** Runs one step as a child process, streaming nothing (captured, then printed as a block so a
 *  failure's real stdout/stderr is never split across interleaved step output). Never throws --
 *  returns {ok, output} so every step always runs, even after an earlier one fails. */
function runStep(label, command, args) {
  banner(label)
  console.log(`$ ${command} ${args.join(" ")}`)
  try {
    const output = execFileSync(command, args, { cwd: ROOT, encoding: "utf8", stdio: "pipe" })
    console.log(output)
    return { ok: true, output }
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n")
    console.log(output || error.message)
    return { ok: false, output: output || error.message }
  }
}

/** Every ticket directory under workbooks/meridian/sprints/*\/tickets/*, split into fully authored
 *  (both reference.diff and rubric.yaml -- compiles playable:true) versus still a stub (either or
 *  both missing -- compiles playable:false, public-only, no sealed emit). Scanned fresh every run,
 *  purely informational: a workbook full of stubs still compiles successfully today. */
function scanTicketAuthoringStatus() {
  const sprintsDir = join(MERIDIAN_DIR, "sprints")
  if (!existsSync(sprintsDir)) return { full: [], stub: [] }
  const full = []
  const stub = []
  for (const sprintDirName of readdirSync(sprintsDir).sort()) {
    const ticketsDir = join(sprintsDir, sprintDirName, "tickets")
    if (!existsSync(ticketsDir)) continue
    for (const ticketKey of readdirSync(ticketsDir).sort()) {
      const ticketDir = join(ticketsDir, ticketKey)
      const hasReference = existsSync(join(ticketDir, "reference.diff"))
      const hasRubric = existsSync(join(ticketDir, "rubric.yaml"))
      const entry = { ticketKey, hasReference, hasRubric }
      if (hasReference && hasRubric) full.push(entry)
      else stub.push(entry)
    }
  }
  return { full, stub }
}

function printAuthoringStatus() {
  const { full, stub } = scanTicketAuthoringStatus()
  banner("Content authoring status (workbooks/meridian, scanned fresh)")
  console.log(
    `  ${full.length} ticket(s) fully authored and playable: true (reference.diff + rubric.yaml).`
  )
  console.log(
    `  ${stub.length} ticket(s) still ticket.md-only stubs -- compiled public-only, playable: false.`
  )
  if (stub.length > 0) {
    console.log(`  First few still-stub tickets: ${stub.slice(0, 8).map((e) => e.ticketKey).join(", ")}${stub.length > 8 ? ", ..." : ""}`)
  }
}

function printPlayableMer101Instructions() {
  banner(`How to reach a playable ${TICKET_KEY}`)
  console.log(
    [
      "This repo serves Sprint Labs behind a feature flag, default OFF. To reach a playable",
      `${TICKET_KEY} on a real dev server:`,
      "",
      "  1. Set Firebase env (.env.local): NEXT_PUBLIC_FIREBASE_* + FIREBASE_SERVICE_ACCOUNT_KEY,",
      "     a real project, not the CI 'dummy' placeholders (see .github/workflows/ci.yml).",
      "  2. Force the flag on for your dev server (env sits under the Firestore override in",
      "     lib/feature-flags.ts's resolution order, so this works without touching Firestore):",
      "       FEATURE_FLAG_SPRINT_LABS_ENABLED=true pnpm dev",
      "  3. Sign in, then visit, in order:",
      "       /sprint-labs/meridian                          (catalog card, enroll)",
      "       /sprint-labs/meridian/run/standup               (sprint 1 standup)",
      "       /sprint-labs/meridian/run/board                 (MER-101 on the board)",
      `       /sprint-labs/meridian/run/ticket/${TICKET_KEY}          (the ask)`,
      `       /sprint-labs/meridian/run/workspace/${TICKET_KEY}       (editor + terminal)`,
      `       /sprint-labs/meridian/run/submit/${TICKET_KEY}          (visible -> hidden -> regression -> adversary)`,
      `       /sprint-labs/meridian/run/retro/${TICKET_KEY}           (referenceDiff + scores, post-finalization)`,
      "",
      "The board also renders every still-stub ticket (viewable, per the authoring-status count",
      "above), just not playable yet -- opening one shows content but no working submit path.",
      "",
      `${TICKET_KEY} itself is proven end to end (materialize -> visible red/green -> provisioning`,
      "-> open against the REAL compiled + sealed registries -> the real client io-case executor",
      "-> server-side hidden-gate comparison -> finalize -> retro) by",
      "`npx vitest run lib/sprint-labs/__tests__/mer-101-end-to-end.test.ts`, which needs no",
      "Firebase env and no dev server at all.",
    ].join("\n")
  )
}

async function main() {
  const compile = runStep("Step 1/3: compile workbooks/meridian", "npx", [
    "tsx",
    "scripts/compile-workbooks.mjs",
    "workbooks/meridian",
  ])

  printAuthoringStatus()

  const validateStatic = runStep("Step 2/3: pnpm lab:validate workbooks/meridian (static)", "npx", [
    "tsx",
    "scripts/lab-validate.mjs",
    "workbooks/meridian",
  ])

  const validateDynamic = runStep(
    "Step 3/3: pnpm lab:validate:dynamic workbooks/meridian (red/green + regression + provisioning)",
    "npx",
    ["tsx", "scripts/lab-validate.mjs", "--dynamic", "workbooks/meridian"]
  )

  printPlayableMer101Instructions()

  banner("Summary")
  console.log(`  compile workbooks/meridian : ${compile.ok ? "PASS" : "FAIL (unexpected -- see Step 1/3 output above; compile is not supposed to fail just because content is incomplete)"}`)
  console.log(`  lab:validate (static)      : ${validateStatic.ok ? "PASS" : "FAIL"}`)
  console.log(`  lab:validate:dynamic       : ${validateDynamic.ok ? "PASS" : "FAIL"}`)

  const allOk = compile.ok && validateStatic.ok && validateDynamic.ok
  if (!allOk) {
    console.log(
      "\nOne or more steps did not pass -- see the failing step's output above. Exiting non-zero."
    )
    process.exitCode = 1
    return
  }
  console.log(`\nAll steps passed. ${TICKET_KEY} is compiled, validated, and playable end to end.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
