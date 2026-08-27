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
 * ONE HONEST CAVEAT, computed fresh every run rather than hardcoded: `compileWorkbook`
 * (scripts/compile-workbooks.mjs) requires `reference.diff` + `rubric.yaml` on EVERY ticket in the
 * workbook it is pointed at -- there is no "skip the stubs" mode. `workbooks/meridian` currently
 * ships 50 ticket directories; only the ones that already authored both files compile. Until every
 * ticket does, step 1 fails here -- correctly, not as a bug in this script -- and this script says
 * exactly which tickets are still missing them (scanned fresh each run, never a stale hardcoded
 * list) so the failure is actionable instead of a wall of compiler stack.
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

/** Every ticket directory under workbooks/meridian/sprints/*\/tickets/* missing reference.diff or
 *  rubric.yaml -- scanned fresh, so this list shrinks as content authoring lands instead of going
 *  stale like a hand-maintained one would. */
function findUnauthoredTickets() {
  const sprintsDir = join(MERIDIAN_DIR, "sprints")
  if (!existsSync(sprintsDir)) return []
  const missing = []
  for (const sprintDirName of readdirSync(sprintsDir).sort()) {
    const ticketsDir = join(sprintsDir, sprintDirName, "tickets")
    if (!existsSync(ticketsDir)) continue
    for (const ticketKey of readdirSync(ticketsDir).sort()) {
      const ticketDir = join(ticketsDir, ticketKey)
      const hasReference = existsSync(join(ticketDir, "reference.diff"))
      const hasRubric = existsSync(join(ticketDir, "rubric.yaml"))
      if (!hasReference || !hasRubric) {
        missing.push({ ticketKey, hasReference, hasRubric })
      }
    }
  }
  return missing
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
      "Sprint 1 (MER-101 through MER-105) is the only fully authored sprint today; MER-101 itself",
      "is proven end to end (materialize -> visible red/green -> provisioning -> open -> the real",
      "client io-case executor -> server-side hidden-gate comparison -> finalize -> retro) by",
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

  if (!compile.ok) {
    const unauthored = findUnauthoredTickets()
    banner("Step 1/3 diagnosis")
    console.log(
      `workbooks/meridian did not compile. ${unauthored.length} of its ticket ` +
        `director${unauthored.length === 1 ? "y is" : "ies are"} still missing reference.diff ` +
        "and/or rubric.yaml (compile-workbooks.mjs requires both on every ticket in the workbook " +
        "it is pointed at -- there is no partial-workbook mode). This is expected while content " +
        "authoring is in progress; it is not a bug in this script or in MER-101, which IS fully " +
        "authored. First few still missing:"
    )
    for (const entry of unauthored.slice(0, 10)) {
      console.log(
        `  - ${entry.ticketKey}: reference.diff ${entry.hasReference ? "OK" : "MISSING"}, ` +
          `rubric.yaml ${entry.hasRubric ? "OK" : "MISSING"}`
      )
    }
    if (unauthored.length > 10) console.log(`  ... and ${unauthored.length - 10} more`)
  }

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
  console.log(`  compile workbooks/meridian : ${compile.ok ? "PASS" : "FAIL (see Step 1/3 diagnosis above)"}`)
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
