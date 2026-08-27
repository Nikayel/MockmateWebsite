/**
 * Run with `pnpm lab:validate <workbookDir>` (wraps `tsx
 * scripts/lab-validate.mjs`) — not `node scripts/lab-validate.mjs` directly:
 * this file imports TypeScript (`lib/sprint-labs/validate/index.ts`), which
 * plain `node` cannot load. No shebang here on purpose, for the same reason
 * scripts/compile-workbooks.mjs has none: this is never executed standalone
 * in this repo's workflow, only via `tsx` or the npm script.
 *
 * A thin CLI over `lib/sprint-labs/validate`'s static gates (PLAN.md Task
 * 3): parse argv for a workbook directory, load its authored tree, run
 * every rule, print one line of PASS or a grouped failure report naming
 * ticket keys, exit 0/1. All real logic (the tree-snapshot loader, every
 * rule) lives in `lib/sprint-labs/validate/*` as plain, unit-tested
 * functions — this file owns none of it, only argv/stdout/exit code.
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

const ROOT = resolvePath(fileURLToPath(import.meta.url), "..", "..")
const require = createRequire(import.meta.url)
const { loadWorkbookTree, validateWorkbook } = require("../lib/sprint-labs/validate/index.ts")

function usageError(message) {
  console.error(message)
  console.error("Usage: pnpm lab:validate <workbookDir>")
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

export function main(argv = process.argv.slice(2)) {
  const [target] = argv
  if (!target) {
    usageError("Missing required <workbookDir> argument.")
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

  const findings = validateWorkbook(workbook)
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
if (isMain) main()
