/**
 * Run with `pnpm lab:validate <workbookDir>`, `pnpm lab:validate:dynamic
 * <workbookDir>`, or `pnpm lab:validate:contamination <workbookDir>` (all
 * three wrap `tsx scripts/lab-validate.mjs`) — not `node
 * scripts/lab-validate.mjs` directly: this file imports TypeScript
 * (`lib/sprint-labs/validate/index.ts`), which plain `node` cannot load. No
 * shebang here on purpose, for the same reason scripts/compile-workbooks.mjs
 * has none: this is never executed standalone in this repo's workflow, only
 * via `tsx` or an npm script.
 *
 * A thin CLI over `lib/sprint-labs/validate`'s static gates (PLAN.md Task 3),
 * behind `--dynamic`, `lib/sprint-labs/validate/dynamic`'s red/green +
 * regression + provisioning gates (PLAN.md Task 7), and behind
 * `--contamination`, `lib/sprint-labs/validate/contamination`'s cold
 * pinned-model gate (PLAN.md Task 9): parse argv for a workbook directory and
 * the three flags, load the authored tree, run the static rules (always),
 * the dynamic gate (only with `--dynamic`), and the contamination gate (only
 * with `--contamination`, optionally `--force` to bypass its committed
 * cache), print one line of PASS or a grouped failure report naming ticket
 * keys plus (when `--contamination` ran) a per-ticket passRate/verdict
 * summary, exit 0/1. Static-only stays the default — `pnpm lab:validate`
 * never pays for a `git apply` + Node-harness replay, and never spends a
 * model call — so plain `lab:validate` is still the free, every-commit
 * check; `--dynamic` is the slower CI/content-authoring gate; `--contamination`
 * is the one that costs real money and is opt-in for exactly that reason. All
 * real logic (the tree-snapshot loader, every static rule, the dynamic gate,
 * the contamination gate) lives in `lib/sprint-labs/validate/*` as plain,
 * unit-tested functions — this file owns none of it, only argv/stdout/exit
 * code.
 *
 * Imported via `createRequire`, not a static `import`, matching
 * scripts/compile-workbooks.mjs's own documented workaround: this repo's
 * package.json has no `"type": "module"`, so tsx transpiles `.ts` to
 * CommonJS, and a static ESM `import { loadWorkbookTree } from
 * "../lib/.../index.ts"` then throws "does not provide an export named
 * ..." (confirmed empirically) because Node's CJS/ESM interop only
 * synthesizes a `default` export for this output shape. `require()` via
 * `createRequire` reads the real CommonJS `module.exports` directly, no
 * `default` wrapper, matching how compile-workbooks.mjs loads
 * lib/sprint-labs/types.ts.
 */
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { isAbsolute, relative, resolve as resolvePath } from "node:path"
import { fileURLToPath } from "node:url"
import * as dotenv from "dotenv"

// Only `--contamination` needs real credentials (a pinned-model call, per lib/ai-providers.ts,
// which itself needs Firebase Admin initialized for cost tracking) -- static and `--dynamic` never
// read an env var. Loaded unconditionally anyway, matching the convention already established by
// every other credentialed script in this repo (e.g. scripts/inspect-user-retention-state.ts):
// harmless when `.env.local` is absent (dotenv.config is a silent no-op), and it is what makes
// `pnpm lab:validate:contamination` work with zero extra ceremony once a real `.env.local` exists.
// A bare `tsx`/`node` process, unlike `next dev`/`next build`, never loads it on its own.
dotenv.config({ path: ".env.local" })

const ROOT = resolvePath(fileURLToPath(import.meta.url), "..", "..")
const require = createRequire(import.meta.url)
const { loadWorkbookTree, validateWorkbook } = require("../lib/sprint-labs/validate/index.ts")
const { validateWorkbookDynamic } = require("../lib/sprint-labs/validate/dynamic/index.ts")
const { validateWorkbookContamination } = require("../lib/sprint-labs/validate/contamination.ts")

function usageError(message) {
  console.error(message)
  console.error("Usage: pnpm lab:validate [--dynamic] [--contamination [--force]] <workbookDir>")
  process.exitCode = 1
}

function severityRank(severity) {
  return severity === "error" ? 0 : 1
}

function formatFinding(finding) {
  const parts = [finding.ticketKey ? `[${finding.ticketKey}]` : null, finding.path ? `(${finding.path})` : null]
    .filter(Boolean)
    .join(" ")
  return `  ${finding.severity.toUpperCase()} ${finding.ruleId}${parts ? " " + parts : ""}: ${finding.message}`
}

/** Groups findings by ruleId, each group internally sorted so ticket-scoped findings are easy to scan. */
function groupByRule(findings) {
  const byRule = new Map()
  for (const finding of findings) {
    const group = byRule.get(finding.ruleId) ?? []
    group.push(finding)
    byRule.set(finding.ruleId, group)
  }
  for (const group of byRule.values()) {
    group.sort((a, b) => (a.ticketKey ?? "").localeCompare(b.ticketKey ?? ""))
  }
  return byRule
}

export async function main(argv = process.argv.slice(2)) {
  const dynamic = argv.includes("--dynamic")
  const contamination = argv.includes("--contamination")
  const force = argv.includes("--force")
  const [target] = argv.filter(
    (arg) => arg !== "--dynamic" && arg !== "--contamination" && arg !== "--force"
  )
  if (!target) {
    usageError("Missing required <workbookDir> argument.")
    return
  }
  if (force && !contamination) {
    usageError("--force only applies alongside --contamination.")
    return
  }

  const workbookDir = isAbsolute(target) ? target : resolvePath(process.cwd(), target)
  if (!existsSync(workbookDir)) {
    usageError(`Workbook directory does not exist: ${workbookDir}`)
    return
  }

  let workbook
  try {
    workbook = loadWorkbookTree(workbookDir)
  } catch (err) {
    console.error(`FAILED loading ${relative(ROOT, workbookDir)}: ${err.message}`)
    process.exitCode = 1
    return
  }

  const staticFindings = validateWorkbook(workbook)
  const dynamicFindings = dynamic ? await validateWorkbookDynamic(workbook) : []
  const contaminationResult = contamination
    ? await validateWorkbookContamination(workbook, { force })
    : { verdicts: [], findings: [] }

  if (contaminationResult.verdicts.length > 0) {
    console.log("contamination:")
    for (const verdict of contaminationResult.verdicts) {
      const pct = (verdict.passRate * 100).toFixed(1)
      console.log(
        `  ${verdict.ticketKey}: ${pct}% (${verdict.hiddenPassed}/${verdict.hiddenTotal} hidden) ${verdict.verdict} [${verdict.modelId}/${verdict.modelVersion}]`
      )
    }
    console.log("")
  }

  const findings = [...staticFindings, ...dynamicFindings, ...contaminationResult.findings]
  const errors = findings.filter((f) => f.severity === "error")
  const warnings = findings.filter((f) => f.severity === "warn")

  if (findings.length === 0) {
    console.log(`PASS ${workbook.id}`)
    return
  }

  if (errors.length === 0) {
    console.log(`PASS ${workbook.id} (${warnings.length} warning${warnings.length === 1 ? "" : "s"})`)
    for (const [ruleId, group] of groupByRule(warnings)) {
      console.log(`\n${ruleId}:`)
      for (const finding of group.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))) {
        console.log(formatFinding(finding))
      }
    }
    return
  }

  console.error(
    `FAIL ${workbook.id}: ${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
  )
  for (const [ruleId, group] of groupByRule(findings)) {
    console.error(`\n${ruleId}:`)
    for (const finding of group.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))) {
      console.error(formatFinding(finding))
    }
  }
  process.exitCode = 1
}

const isMain = typeof process.argv[1] === "string" && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])
if (isMain) {
  main().catch((err) => {
    console.error(`FAILED: ${err instanceof Error ? err.message : String(err)}`)
    process.exitCode = 1
  })
}
