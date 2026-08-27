/**
 * Run with `pnpm workbooks:compile [workbookDir...]` (wraps `tsx
 * scripts/compile-workbooks.mjs`) — not `node scripts/compile-workbooks.mjs`
 * directly; see why below. No shebang here on purpose: this file is never
 * executed standalone (`./scripts/compile-workbooks.mjs`) in this repo's
 * workflow, only via `tsx` or the npm script, and a `#!/usr/bin/env node`
 * shebang would misstate that plain `node` cannot run it.
 *
 * Compile Sprint Labs workbook authoring sources (workbooks/<id>/) into a
 * public bundle (lib/sprint-labs/content/**) and a sealed, server-only
 * bundle (lib/scenarios/sealed/sprint-labs/**). Generalizes
 * scripts/compile-packs.mjs's public/secret split for a workbook / sprint /
 * ticket content model (docs/sprint-labs/PLAN.md Task 2).
 *
 * Authoring layout per workbook (docs/sprint-labs/WORKBOOK-SPEC.md §6):
 *   workbooks/<id>/workbook.yaml
 *   workbooks/<id>/sprints/<NN-name>/sprint.yaml
 *   workbooks/<id>/sprints/<NN-name>/tickets/<KEY>/{
 *     ticket.md, setup.diff, tests/visible/**, tests/hidden/*.yaml,
 *     adversary/**, review.yaml, author_brief.yaml, reference.diff,
 *     rubric.yaml
 *   }
 *
 * FRONTMATTER/YAML CASING (review round 1, ruling R14 — the spec wins):
 * WORKBOOK-SPEC.md §6 and AUTHORING-RULES.md name most multiword authoring
 * keys in camelCase (`archMapDelta`, `sizingNotes`, `payoffFor`,
 * `payoffSignoff`, `humanName` — all confirmed by direct, repeated
 * grep hits) but name exactly three in snake_case (`ai_policy`,
 * `ai_policy_reason`, `concession_triggers`). This compiler accepts each
 * key in the casing the docs use for it, and REJECTS the other casing with
 * a CompileError naming the correct key (`rejectWrongCasing`) — so a
 * content author who guesses wrong gets a loud, locatable error instead of
 * a silently-dropped field (`acceptanceCriteria`/`doNotVolunteer` aren't
 * spec-named; kept camelCase, matching the dominant pattern and Task 1's
 * own field spelling, with the same reject-the-other-casing guard so a
 * typo doesn't silently vanish either).
 *
 * SECRET-SIDE VALIDATION (review round 1, finding I-1): rubric.yaml,
 * author_brief.yaml, review.yaml, and each hidden test's payload half are
 * now validated through Zod schemas in lib/scenarios/sealed/sprint-labs/
 * schemas.ts, not just read and trusted. In particular, review.yaml is
 * REQUIRED to parse as `{comments: [...]}` with at least one comment, each
 * carrying an author-supplied `id` (never a positional `comment-${i}`,
 * per M-3: positional ids break a future release endpoint's keying) — a
 * review.yaml authored as a bare top-level list, or with zero comments, is
 * now a CompileError, not a silently-empty review round with the trap
 * quietly deleted.
 *
 * LEAK-GATE WIRING (review round 1, findings I-3/M-7): every PUBLIC file
 * write goes through `writePublicFile`, the ONE place `assertPublicSafe`
 * runs before `writeFileSync`. This isn't a style preference: it's what
 * makes "a public emit was never checked" structurally impossible to
 * introduce later by accident — there is exactly one write path, and
 * deleting its `assertPublicSafe` call is exactly what
 * lib/sprint-labs/__tests__/compiler.test.ts's `writePublicFile` unit test
 * exists to catch.
 *
 * PRUNING (review round 1, finding I-5): every run re-derives the
 * authoritative {workbookId -> {sprintNumbers, ticketKeys}} set by scanning
 * every workbook.yaml under workbooks/ (the AUTHORING tree), then deletes any
 * compiled output with no corresponding authored source — a pulled ticket
 * or retired workbook stops shipping instead of lingering forever as a
 * stale file nobody notices. Pruning is best-effort: if some OTHER,
 * unrelated workbook.yaml fails to parse, pruning is skipped for this run
 * (logged, not fatal) rather than risk deleting a sibling's output based on
 * incomplete information — this is also what keeps a single-workbook
 * compile "sibling-safe" per that finding: a broken sibling never blocks
 * compiling (or pruning around) an unrelated, valid workbook. Which
 * directory counts as "workbooks/" is itself parameterized
 * (`--workbooks-root`, default the real one) rather than hardcoded: a
 * compile whose target lives elsewhere (a test, a future CI job against a
 * staging checkout) must not have pruning declare its own just-written
 * output "not authored" because it scanned the wrong tree.
 *
 * PRUNING SAFETY (review round 2, I-5 residual — the reviewer reproduced a
 * wrong/empty/subset --workbooks-root deleting EVERYTHING, including the
 * workbook this same invocation had just compiled): three layers now
 * guard this. (a) The keep set is the authoring-tree scan's ids UNION the
 * ids THIS invocation just compiled, unconditionally — self-protection
 * never depends on --workbooks-root having scanned the right place. (b) If
 * the authoring-tree scan finds ZERO workbooks, pruning refuses to run at
 * all and prints a loud warning naming the root: an empty scan is far
 * likelier a wrong path than a genuinely emptied catalog. (c) `--no-prune`
 * skips pruning entirely, for CI partial-checkout scenarios where neither
 * (a) nor (b) is the right call.
 *
 * FORMATTING GENERATED CONTENT (found verifying round 2's own fix, not
 * asked for by name in any finding, but load-bearing for THIS task's
 * "regenerated bundles diff cleanly" requirement): every generated file
 * this script writes is run through this repo's own `.prettierrc`
 * (`prettier`'s `format`+`resolveConfig`, not hardcoded defaults) before
 * `writeFileSync`. Without this, committing a freshly-compiled file still
 * fires the pre-commit hook's `prettier --write`, which reformats
 * `JSON.stringify`'s quoted keys and short arrays — silently mutating the
 * COMMITTED content away from what this script itself just emitted, so
 * every later recompile-and-diff shows that formatting churn as a false
 * "content changed" signal. Formatting here makes the hook's pass a no-op
 * on already-clean output.
 *
 * TICKET IDENTITY (review round 1, M-1/M-2): a workbook id must be a
 * lowercase slug and a ticket key must start with a letter (never a
 * digit) — both are compiled into JS export names and directory
 * components, so a malformed one would otherwise fail confusingly deep
 * inside codegen. A ticket key must also be unique, case-insensitively,
 * across the WHOLE workbook (not just one sprint): two keys that differ
 * only by case or by a hyphen (`camel()` strips hyphens) would silently
 * shadow one export in the generated registry.ts.
 *
 * PUBLIC REGISTRY SHAPE (review round 1, I-6/M-5): `WorkbookSummary`
 * values are eager (small, needed for the catalog grid); a workbook's
 * sprints + tickets load lazily behind `loadWorkbookContent`, the sealed
 * registry's own shape — a catalog page must not pull every ticket's
 * bodyMd and visible test files into its bundle. Every accessor guards
 * with `Object.prototype.hasOwnProperty.call` (matching the sealed
 * registry, which already did this correctly) so a lookup keyed
 * "constructor"/"__proto__" returns undefined instead of resolving an
 * inherited Object.prototype value or throwing.
 *
 * Two dependency decisions worth recording, per this task's brief (check
 * package.json before adding a YAML dependency):
 *
 *  - Neither `yaml` nor `js-yaml` is a direct dependency of this repo (both
 *    resolve only transitively, through eslint and gray-matter, at
 *    DIFFERENT pinned versions, and pnpm's strict node_modules does not
 *    expose either for a plain `import`/`require` from this script).
 *    `gray-matter` IS a direct dependency (already used for blog/MDX
 *    frontmatter, lib/mdx.ts) and its public `matter.engines.yaml` object
 *    is literally js-yaml's `safeLoad`/`safeDump`
 *    (node_modules/gray-matter/lib/engines.js) — documented, stable API,
 *    not an internal reach-around. `matter(...)` parses ticket.md's
 *    frontmatter + body; `matter.engines.yaml.parse(...)` parses the pure
 *    YAML files. No new dependency needed.
 *  - This script imports lib/sprint-labs/types.ts and lib/scenarios/sealed/
 *    sprint-labs/schemas.ts (Zod schemas) to VALIDATE every authored object
 *    at compile time. Plain `node` cannot resolve types.ts's own
 *    extensionless internal import (`./platform-capabilities`) — confirmed
 *    empirically; Node's native ESM/type-stripping resolver, unlike this
 *    repo's bundler-style `moduleResolution`, requires exact extensions.
 *    `tsx` (already a devDependency, already this repo's convention for
 *    scripts that import typed code — see the `audit:*` scripts in
 *    package.json) resolves it correctly. Run this file with `tsx`, e.g.
 *    via `pnpm workbooks:compile`, not bare `node`. Schema loading is lazy
 *    (only inside `compileWorkbook`/`compileTicket`) so the
 *    field-classification / leak-scan exports below stay importable from
 *    plain vitest tests that never touch the schema-dependent path.
 */

import { createRequire } from "node:module"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, isAbsolute, join, relative, resolve as resolvePath } from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"
import { format as prettierFormat, resolveConfig as resolvePrettierConfig } from "prettier"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const WORKBOOKS_DIR = join(ROOT, "workbooks")
const DEFAULT_PUBLIC_DIR = join(ROOT, "lib/sprint-labs/content")
const DEFAULT_SEALED_DIR = join(ROOT, "lib/scenarios/sealed/sprint-labs")

const GENERATED =
  "// GENERATED by scripts/compile-workbooks.mjs — edit workbooks/<id>/ and recompile."

/** M-2: workbook ids are directory-safe, module-safe lowercase slugs. */
const WORKBOOK_ID_PATTERN = /^[a-z][a-z0-9-]*$/
/** M-2: ticket keys must start with a letter (never a digit) so `camel()` always yields a valid export name. */
const TICKET_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/

// ============================================================
// Task 1 + sealed-schema loading — lazy, tsx-only (see file header)
// ============================================================

let _schemas = null
function schemas() {
  if (!_schemas) {
    const require = createRequire(import.meta.url)
    _schemas = require("../lib/sprint-labs/types.ts")
  }
  return _schemas
}

let _sealedSchemas = null
function sealedSchemas() {
  if (!_sealedSchemas) {
    const require = createRequire(import.meta.url)
    _sealedSchemas = require("../lib/scenarios/sealed/sprint-labs/schemas.ts")
  }
  return _sealedSchemas
}

// ============================================================
// Secret-classification allowlist — the ONE table (PLAN.md Task 2 ruling)
// ============================================================

/**
 * Field names that must NEVER appear anywhere inside a value handed to
 * `assertPublicSafe`. This is the single source of truth for what counts
 * as secret content (hidden-test expecteds/inputs/probe bodies, the
 * adversary runner, review.yaml, author_brief.yaml, reference.diff, rubric
 * weights). `writePublicFile` is the ONLY place this runs before a public
 * write (review round 1, I-3/M-7) — do not call `assertPublicSafe`
 * ad hoc elsewhere and consider the payload "checked": if it didn't go
 * through `writePublicFile`, it wasn't.
 */
export const SECRET_FIELDS = new Set([
  // hidden test / io-case / probe payload
  "expected",
  "input",
  "body",
  "hiddenCases",
  // io-case entryPoint (PLAN.md Task 7 review round 1, Critical 2) — names WHICH export is under
  // test, more than a learner is meant to know pre-submit, even though it doesn't itself reveal
  // the reference implementation.
  "entryPoint",
  // adversary
  "adversaryFiles",
  // review.yaml
  "review",
  "correct",
  // author_brief.yaml
  "authorBrief",
  "intent",
  "decisions",
  "decision",
  "justification",
  "doNotVolunteer",
  "concessionTriggers",
  // reference.diff
  "referenceDiff",
  // rubric.yaml
  "rubric",
  "weights",
  "notes",
  "understanding",
  "problemSolving",
  "codeQuality",
  "communication",
  "verification",
])

/**
 * Recursively walks `value` and throws the moment it finds an object key
 * that is in `SECRET_FIELDS`. `context` (a file path) rides the error
 * message so a failure is loud and locatable, matching this task's "fails
 * loudly with the file path" requirement.
 */
export function assertPublicSafe(value, context) {
  const seen = new Set()
  function walk(node, path) {
    if (node === null || typeof node !== "object") return
    if (seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`))
      return
    }
    for (const key of Object.keys(node)) {
      if (SECRET_FIELDS.has(key)) {
        throw new Error(
          `secret-classified field "${key}" found in a PUBLIC emit (${context}, at ${path}.${key}). ` +
            `"${key}" is listed in SECRET_FIELDS (scripts/compile-workbooks.mjs) and must never reach ` +
            `a public bundle.`
        )
      }
      walk(node[key], `${path}.${key}`)
    }
  }
  walk(value, "$")
}

/**
 * Formats generated content through this repo's own .prettierrc before
 * writing (discovered verifying round 2's fix, not asked for by name in
 * any finding, but load-bearing for this task's own "regenerated bundles
 * diff cleanly" requirement): committing a generated file runs it through
 * the pre-commit hook's `prettier --write` regardless, which reformats
 * `JSON.stringify`'s quoted object keys and short arrays — silently
 * mutating the committed content away from what this script itself just
 * emitted. Every later `pnpm workbooks:compile` + `git diff` would then
 * show that formatting churn as if it were a real content change.
 * Formatting here, once, with the project's real config
 * (`resolveConfig`, not hardcoded defaults) makes the hook's pass a no-op
 * on already-clean output. Config is resolved once and cached: it is the
 * same for every generated file in this repo.
 */
let _prettierConfig = null
async function prettierConfig() {
  if (_prettierConfig === null) {
    _prettierConfig = (await resolvePrettierConfig(ROOT)) ?? {}
  }
  return _prettierConfig
}

async function formatGenerated(content, filePath) {
  try {
    const config = await prettierConfig()
    return await prettierFormat(content, { ...config, filepath: filePath })
  } catch (err) {
    // A formatting hiccup must never block a successful compile; the
    // content is still syntactically valid and correctly gated, just not
    // prettier-clean until the next `pnpm lint:fix`.
    console.error(`Warning: prettier formatting failed for ${relative(ROOT, filePath)}: ${err.message}`)
    return content
  }
}

/**
 * THE chokepoint for every public-bundle write (review round 1, I-3/M-7).
 * `payload` is the plain data object the file's content was rendered from
 * (or, for registry.ts, the discovery array of workbook/sprint/ticket
 * identifiers it was built from) — always the value most likely to carry a
 * mistakenly-included secret field, checked here regardless of whatever
 * checks already ran upstream. Deleting this function's `assertPublicSafe`
 * call is exactly what the "writePublicFile" test in compiler.test.ts
 * exists to catch.
 */
export async function writePublicFile(filePath, payload, content, context) {
  assertPublicSafe(payload, context ?? relative(ROOT, filePath))
  const formatted = await formatGenerated(content, filePath)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, formatted)
}

// ============================================================
// Errors
// ============================================================

export class CompileError extends Error {
  constructor(filePath, issue) {
    const details =
      issue && Array.isArray(issue.issues)
        ? issue.issues
            .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
            .join("\n")
        : `  - ${String(issue)}`
    super(`${filePath}\n${details}`)
    this.name = "CompileError"
    this.filePath = filePath
  }
}

// ============================================================
// Filesystem + YAML helpers
// ============================================================

function camel(kebab) {
  return kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}

/** M-4: plain codepoint comparison — `localeCompare` is locale/ICU-dependent and not safe for deterministic output. */
function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

function safeReaddir(dir) {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

function safeReaddirDirs(dir) {
  return safeReaddir(dir).filter((name) => !name.startsWith(".") && statSync(join(dir, name)).isDirectory())
}

function listSubdirs(dir) {
  return safeReaddirDirs(dir).sort()
}

function listYamlFiles(dir) {
  return safeReaddir(dir)
    .filter((name) => !name.startsWith(".") && (name.endsWith(".yaml") || name.endsWith(".yml")))
    .sort()
    .map((name) => join(dir, name))
}

function readFilesRecursive(dir, base = dir) {
  const out = []
  for (const name of safeReaddir(dir).sort()) {
    if (name.startsWith(".")) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...readFilesRecursive(full, base))
    } else {
      out.push({
        path: relative(base, full).split("\\").join("/"),
        content: readFileSync(full, "utf8"),
      })
    }
  }
  return out.sort((a, b) => compareStrings(a.path, b.path))
}

function readYaml(filePath) {
  let raw
  try {
    raw = readFileSync(filePath, "utf8")
  } catch (err) {
    throw new CompileError(filePath, `file not found or unreadable: ${err.message}`)
  }
  try {
    return matter.engines.yaml.parse(raw) ?? {}
  } catch (err) {
    throw new CompileError(filePath, `invalid YAML: ${err.message}`)
  }
}

function readOptionalYaml(filePath) {
  return existsSync(filePath) ? readYaml(filePath) : null
}

function basenameNoExt(filePath) {
  return basename(filePath).replace(/\.(yaml|yml)$/, "")
}

/**
 * Ruling R14: throws a loud, spec-quoting CompileError if `data` carries
 * `wrongKey` — used both directions (reject camelCase where the spec names
 * snake_case, and vice versa) so a guessed-wrong casing never silently
 * vanishes into `undefined`/`?? []` instead of compiling.
 */
export function rejectWrongCasing(data, filePath, wrongKey, rightKey) {
  if (data && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, wrongKey)) {
    throw new CompileError(
      filePath,
      `use "${rightKey}", not "${wrongKey}" (WORKBOOK-SPEC.md/AUTHORING-RULES.md name this field "${rightKey}").`
    )
  }
}

function resolveObjectives(ids, vocabMap, contextPath) {
  if (!Array.isArray(ids)) {
    throw new CompileError(contextPath, `objectives must be a list of ids, got ${JSON.stringify(ids)}`)
  }
  return ids.map((id) => {
    const found = vocabMap.get(id)
    if (!found) {
      throw new CompileError(
        contextPath,
        `objective id "${id}" is not in the workbook's objectives vocabulary (workbook.yaml)`
      )
    }
    return { id: found.id, label: found.label, canDo: found.canDo }
  })
}

// ============================================================
// Compile: ticket / sprint / workbook
// ============================================================

function compileTicket(ticketDir, ticketKey, workbookId, objectiveVocab) {
  const { ticketPublicSchema, ticketSecretMetaSchema } = schemas()
  const { authoredReviewSchema, sealedAuthorBriefSchema, sealedRubricSchema, sealedIoCasePayloadSchema, sealedProbePayloadSchema } =
    sealedSchemas()

  const ticketMdPath = join(ticketDir, "ticket.md")
  if (!existsSync(ticketMdPath)) {
    throw new CompileError(ticketMdPath, "ticket.md is required for every ticket")
  }
  const { data, content } = matter(readFileSync(ticketMdPath, "utf8"))
  const bodyMd = content.trim()

  rejectWrongCasing(data, ticketMdPath, "aiPolicy", "ai_policy")
  rejectWrongCasing(data, ticketMdPath, "aiPolicyReason", "ai_policy_reason")
  rejectWrongCasing(data, ticketMdPath, "payoff_for", "payoffFor")
  rejectWrongCasing(data, ticketMdPath, "acceptance_criteria", "acceptanceCriteria")

  const adversaryFiles = readFilesRecursive(join(ticketDir, "adversary"))
  const adversaryPresent = adversaryFiles.length > 0

  const rawTicket = {
    key: ticketKey,
    title: data.title,
    points: data.points,
    labels: data.labels ?? [],
    aiPolicy: data.ai_policy,
    ...(data.ai_policy_reason !== undefined ? { aiPolicyReason: data.ai_policy_reason } : {}),
    objectives: resolveObjectives(data.objectives ?? [], objectiveVocab, ticketMdPath),
    bodyMd,
    acceptanceCriteria: data.acceptanceCriteria ?? [],
    adversaryPresent,
    ...(data.payoffFor !== undefined ? { payoffFor: data.payoffFor } : {}),
  }
  const ticketParse = ticketPublicSchema.safeParse(rawTicket)
  if (!ticketParse.success) throw new CompileError(ticketMdPath, ticketParse.error)
  const ticketPublic = ticketParse.data

  const setupDiffPath = join(ticketDir, "setup.diff")
  const setupDiff = existsSync(setupDiffPath) ? readFileSync(setupDiffPath, "utf8") : null

  const visibleTestFiles = readFilesRecursive(join(ticketDir, "tests/visible"))

  const hiddenTests = []
  const hiddenCases = []
  for (const filePath of listYamlFiles(join(ticketDir, "tests/hidden"))) {
    const raw = readYaml(filePath)
    rejectWrongCasing(raw, filePath, "human_name", "humanName")
    rejectWrongCasing(raw, filePath, "entry_point", "entryPoint")
    const id = basenameNoExt(filePath)
    const tags = raw.tags ?? []
    const metaParse = ticketSecretMetaSchema.safeParse({
      id,
      humanName: raw.humanName,
      tags,
      kind: raw.kind,
    })
    if (!metaParse.success) throw new CompileError(filePath, metaParse.error)
    hiddenTests.push(metaParse.data)

    if (raw.kind === "io-case") {
      const payloadParse = sealedIoCasePayloadSchema.safeParse({
        input: raw.input,
        expected: raw.expected,
        entryPoint: raw.entryPoint,
      })
      if (!payloadParse.success) throw new CompileError(filePath, payloadParse.error)
      hiddenCases.push({
        id,
        humanName: raw.humanName,
        tags,
        kind: raw.kind,
        input: payloadParse.data.input,
        expected: payloadParse.data.expected,
        ...(payloadParse.data.entryPoint !== undefined
          ? { entryPoint: payloadParse.data.entryPoint }
          : {}),
      })
    } else if (raw.kind === "probe") {
      const payloadParse = sealedProbePayloadSchema.safeParse({ body: raw.body })
      if (!payloadParse.success) throw new CompileError(filePath, payloadParse.error)
      hiddenCases.push({ id, humanName: raw.humanName, tags, kind: raw.kind, body: payloadParse.data.body })
    } else {
      throw new CompileError(filePath, `unknown hidden-test kind "${raw.kind}" (expected "io-case" or "probe")`)
    }
  }

  // review.yaml — I-1/M-3: must parse as {comments: [...]} with >=1 comment,
  // each carrying an author-supplied stable id. A bare top-level list or a
  // zero-comment file is a CompileError, never a silently-empty round.
  const reviewPath = join(ticketDir, "review.yaml")
  let review = null
  if (existsSync(reviewPath)) {
    const reviewRaw = readYaml(reviewPath)
    const reviewParse = authoredReviewSchema.safeParse(reviewRaw)
    if (!reviewParse.success) throw new CompileError(reviewPath, reviewParse.error)
    const seenCommentIds = new Set()
    for (const comment of reviewParse.data.comments) {
      if (seenCommentIds.has(comment.id)) {
        throw new CompileError(reviewPath, `duplicate review comment id "${comment.id}"`)
      }
      seenCommentIds.add(comment.id)
    }
    review = reviewParse.data.comments
  }

  const authorBriefPath = join(ticketDir, "author_brief.yaml")
  let authorBrief = null
  if (existsSync(authorBriefPath)) {
    const rawBrief = readYaml(authorBriefPath)
    rejectWrongCasing(rawBrief, authorBriefPath, "concessionTriggers", "concession_triggers")
    rejectWrongCasing(rawBrief, authorBriefPath, "do_not_volunteer", "doNotVolunteer")
    const briefParse = sealedAuthorBriefSchema.safeParse({
      intent: rawBrief.intent,
      decisions: rawBrief.decisions,
      doNotVolunteer: rawBrief.doNotVolunteer,
      concessionTriggers: rawBrief.concession_triggers,
    })
    if (!briefParse.success) throw new CompileError(authorBriefPath, briefParse.error)
    authorBrief = briefParse.data
  }

  const referenceDiffPath = join(ticketDir, "reference.diff")
  if (!existsSync(referenceDiffPath)) {
    throw new CompileError(referenceDiffPath, "reference.diff is required for every ticket")
  }
  const referenceDiff = readFileSync(referenceDiffPath, "utf8")

  const rubricPath = join(ticketDir, "rubric.yaml")
  if (!existsSync(rubricPath)) {
    throw new CompileError(rubricPath, "rubric.yaml is required for every ticket")
  }
  const rawRubric = readYaml(rubricPath)
  rejectWrongCasing(rawRubric.weights, rubricPath, "problem_solving", "problemSolving")
  rejectWrongCasing(rawRubric.weights, rubricPath, "code_quality", "codeQuality")
  const rubricParse = sealedRubricSchema.safeParse(rawRubric)
  if (!rubricParse.success) throw new CompileError(rubricPath, rubricParse.error)

  const compiledTicket = { ticket: ticketPublic, setupDiff, visibleTestFiles, hiddenTests }

  const sealed = {
    workbookId,
    ticketKey,
    hiddenCases,
    adversaryFiles,
    review,
    authorBrief,
    referenceDiff,
    rubric: rubricParse.data,
  }

  return { publicTicket: compiledTicket, sealed }
}

function compileWorkbook(workbookDir) {
  const { workbookSummarySchema, sprintPublicSchema } = schemas()

  const workbookYamlPath = join(workbookDir, "workbook.yaml")
  if (!existsSync(workbookYamlPath)) {
    throw new CompileError(workbookYamlPath, "workbook.yaml is required")
  }
  const rawWorkbook = readYaml(workbookYamlPath)
  const summaryParse = workbookSummarySchema.safeParse(rawWorkbook)
  if (!summaryParse.success) throw new CompileError(workbookYamlPath, summaryParse.error)
  const summary = summaryParse.data
  const workbookId = summary.id
  if (!WORKBOOK_ID_PATTERN.test(workbookId)) {
    throw new CompileError(
      workbookYamlPath,
      `workbook id "${workbookId}" must be a lowercase slug (letters, digits, hyphens; starting with a letter)`
    )
  }
  const objectiveVocab = new Map(summary.objectives.map((o) => [o.id, o]))

  const sprintsDir = join(workbookDir, "sprints")
  const sprints = []
  const ticketsByKey = {}
  const sealedByTicketKey = {}
  // M-1: a ticket key must be unique, case-insensitively, across the WHOLE
  // workbook (not just within one sprint) — both an exact duplicate and a
  // same-export-name collision ("DEMO-101" vs "demo-101") are compile errors.
  const seenTicketKeys = new Set()
  const seenExportNames = new Map()

  for (const sprintDirName of listSubdirs(sprintsDir)) {
    const sprintDir = join(sprintsDir, sprintDirName)
    const sprintYamlPath = join(sprintDir, "sprint.yaml")
    if (!existsSync(sprintYamlPath)) {
      throw new CompileError(sprintYamlPath, "sprint.yaml is required for every sprint directory")
    }
    const rawSprint = readYaml(sprintYamlPath)
    rejectWrongCasing(rawSprint, sprintYamlPath, "standup_quote", "standupQuote")
    rejectWrongCasing(rawSprint, sprintYamlPath, "arch_map_delta", "archMapDelta")
    rejectWrongCasing(rawSprint, sprintYamlPath, "sizing_notes", "sizingNotes")
    const rawSprintResolved = {
      ...rawSprint,
      objectives: resolveObjectives(rawSprint.objectives ?? [], objectiveVocab, sprintYamlPath),
    }
    const sprintParse = sprintPublicSchema.safeParse(rawSprintResolved)
    if (!sprintParse.success) throw new CompileError(sprintYamlPath, sprintParse.error)
    const sprintPublic = sprintParse.data
    sprints.push(sprintPublic)

    // PLAN.md Task 16: ticketCount/points are DERIVED from this sprint's own
    // compiled tickets, never authored in sprint.yaml -- computed here, after
    // the schema parse above, and attached onto the same object reference
    // already pushed into `sprints` so no second pass over the array is
    // needed. A stub sprint.yaml (no tickets yet) compiles with both left
    // undefined, since ticketPublicSchema/sprintPublicSchema require them
    // positive when present, never zero.
    let sprintTicketCount = 0
    let sprintPointsSum = 0

    const ticketsDir = join(sprintDir, "tickets")
    for (const ticketKey of listSubdirs(ticketsDir)) {
      const ticketContextPath = join(ticketsDir, ticketKey)
      if (!TICKET_KEY_PATTERN.test(ticketKey)) {
        throw new CompileError(
          ticketContextPath,
          `ticket key "${ticketKey}" must start with a letter and contain only letters, digits, and hyphens`
        )
      }
      if (seenTicketKeys.has(ticketKey)) {
        throw new CompileError(ticketContextPath, `duplicate ticket key "${ticketKey}" already used elsewhere in this workbook`)
      }
      seenTicketKeys.add(ticketKey)
      const exportName = camel(ticketKey.toLowerCase())
      if (seenExportNames.has(exportName)) {
        throw new CompileError(
          ticketContextPath,
          `ticket key "${ticketKey}" collides with "${seenExportNames.get(exportName)}" (both produce the export ` +
            `name "${exportName}"); ticket keys must be unique case-insensitively`
        )
      }
      seenExportNames.set(exportName, ticketKey)

      const { publicTicket, sealed } = compileTicket(ticketContextPath, ticketKey, workbookId, objectiveVocab)
      ticketsByKey[ticketKey] = publicTicket
      sealedByTicketKey[ticketKey] = sealed
      sprintTicketCount += 1
      sprintPointsSum += publicTicket.ticket.points
    }

    if (sprintTicketCount > 0) {
      sprintPublic.ticketCount = sprintTicketCount
      sprintPublic.points = sprintPointsSum
    }
  }

  sprints.sort((a, b) => a.number - b.number)

  return { workbookId, compiled: { summary, sprints, ticketsByKey }, sealedByTicketKey }
}

// ============================================================
// Code generation — public
// ============================================================

function renderWorkbookModule(workbookId, summary) {
  const name = camel(workbookId)
  return `${GENERATED}
import type { WorkbookSummary } from "@/lib/sprint-labs/types"

export const ${name}Workbook: WorkbookSummary = ${JSON.stringify(summary, null, 2)}
`
}

function renderSprintModule(workbookId, sprintPublic) {
  const nn = String(sprintPublic.number).padStart(2, "0")
  const exportName = `${camel(workbookId)}Sprint${nn}`
  return `${GENERATED}
import type { SprintPublic } from "@/lib/sprint-labs/types"

export const ${exportName}: SprintPublic = ${JSON.stringify(sprintPublic, null, 2)}
`
}

function renderTicketModule(ticketKey, compiledTicket) {
  const exportName = `${camel(ticketKey.toLowerCase())}Ticket`
  return `${GENERATED}
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"

export const ${exportName}: CompiledTicket = ${JSON.stringify(compiledTicket, null, 2)}
`
}

// ============================================================
// Code generation — sealed
// ============================================================

function renderSealedTicketModule(sealed) {
  return `${GENERATED}
import type { SealedTicketContent } from "@/lib/scenarios/sealed/sprint-labs/types"

if (typeof window !== "undefined") {
  throw new Error("Sealed sprint-labs content must never load in the browser.")
}

export const sealed: SealedTicketContent = ${JSON.stringify(sealed, null, 2)}
`
}

// ============================================================
// Registry rebuild — derived from a scan of compiled OUTPUT (which sprint/
// ticket files exist), always run after pruning so it never lists a file
// that pruning just deleted.
// ============================================================

function discoverCompiledWorkbooks(publicDir) {
  const workbookIds = safeReaddirDirs(publicDir).sort()
  return workbookIds.map((workbookId) => {
    const sprintStems = safeReaddir(join(publicDir, workbookId, "sprints"))
      .filter((n) => n.endsWith(".ts"))
      .map((n) => n.replace(/\.ts$/, ""))
      .sort()
    const ticketKeys = safeReaddir(join(publicDir, workbookId, "tickets"))
      .filter((n) => n.endsWith(".ts"))
      .map((n) => n.replace(/\.ts$/, ""))
      .sort()
    return { workbookId, sprintStems, ticketKeys }
  })
}

/**
 * I-6/M-5: workbook SUMMARIES stay eagerly imported (small, needed for the
 * catalog grid); each workbook's sprints + tickets load lazily behind
 * `loadWorkbookContent`, the sealed registry's own shape — a catalog page
 * must not pull every ticket's bodyMd + visible test files into its
 * bundle just to render summary cards. Every accessor uses an explicit
 * `Object.prototype.hasOwnProperty.call` guard (matching the sealed
 * registry, which already did this correctly) so a lookup keyed
 * "constructor"/"__proto__"/"toString" returns undefined instead of
 * silently resolving an inherited Object.prototype value (a wrong answer
 * today; `getSprint`'s old `?.sprints.find(...)` chain would even throw a
 * TypeError for those keys, since `?.` only guards the immediately
 * preceding access).
 */
function renderPublicRegistry(workbooks) {
  const importLines = []
  const summaryEntries = []
  const loaderEntries = []

  for (const { workbookId, sprintStems, ticketKeys } of workbooks) {
    const wbName = camel(workbookId)
    importLines.push(`import { ${wbName}Workbook } from "./${workbookId}/workbook"`)
    summaryEntries.push(`  ${JSON.stringify(workbookId)}: ${wbName}Workbook,`)

    const sprintExportNames = sprintStems.map((stem) => `${wbName}Sprint${stem.replace("sprint-", "")}`)
    const ticketExportNames = ticketKeys.map((key) => `${camel(key.toLowerCase())}Ticket`)

    const importExprs = [
      ...sprintStems.map((stem) => `import("./${workbookId}/sprints/${stem}")`),
      ...ticketKeys.map((key) => `import("./${workbookId}/tickets/${key}")`),
    ]
    const destructurePattern = [...sprintExportNames, ...ticketExportNames].map((n) => `{ ${n} }`).join(", ")
    const ticketsByKeyBody = ticketKeys
      .map((key, i) => `        ${JSON.stringify(key)}: ${ticketExportNames[i]},`)
      .join("\n")

    loaderEntries.push(
      `  ${JSON.stringify(workbookId)}: async () => {\n` +
        `    const [${destructurePattern}] = await Promise.all([\n      ${importExprs.join(",\n      ")},\n    ])\n` +
        `    return {\n` +
        `      sprints: [${sprintExportNames.join(", ")}],\n` +
        `      ticketsByKey: {\n${ticketsByKeyBody}\n      },\n` +
        `    }\n` +
        `  },`
    )
  }

  return `${GENERATED}
import type { CompiledTicket, WorkbookContent } from "./types"
import type { SprintPublic, WorkbookSummary } from "@/lib/sprint-labs/types"
${importLines.join("\n")}

const WORKBOOK_SUMMARIES: Record<string, WorkbookSummary> = {
${summaryEntries.join("\n")}
}

const WORKBOOK_CONTENT_LOADERS: Record<string, () => Promise<WorkbookContent>> = {
${loaderEntries.join("\n")}
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function listWorkbookSummaries(): WorkbookSummary[] {
  return Object.values(WORKBOOK_SUMMARIES).sort((a, b) => compareStrings(a.id, b.id))
}

export function getWorkbookSummary(workbookId: string): WorkbookSummary | undefined {
  return hasOwn(WORKBOOK_SUMMARIES, workbookId) ? WORKBOOK_SUMMARIES[workbookId] : undefined
}

/**
 * Loads a workbook's sprints + tickets lazily, behind a dynamic import: a
 * catalog page that only calls listWorkbookSummaries()/getWorkbookSummary()
 * must not pull every ticket's bodyMd and visible test files into its
 * bundle. Mirrors the sealed registry's loadSealedTicket shape.
 */
export async function loadWorkbookContent(workbookId: string): Promise<WorkbookContent | null> {
  const loader = hasOwn(WORKBOOK_CONTENT_LOADERS, workbookId) ? WORKBOOK_CONTENT_LOADERS[workbookId] : undefined
  if (!loader) return null
  return await loader()
}

export async function getWorkbookSprints(workbookId: string): Promise<SprintPublic[] | undefined> {
  const content = await loadWorkbookContent(workbookId)
  return content?.sprints
}

export async function getSprint(workbookId: string, sprintNumber: number): Promise<SprintPublic | undefined> {
  const content = await loadWorkbookContent(workbookId)
  return content?.sprints.find((s) => s.number === sprintNumber)
}

export async function getTicket(workbookId: string, ticketKey: string): Promise<CompiledTicket | undefined> {
  const content = await loadWorkbookContent(workbookId)
  if (!content) return undefined
  return hasOwn(content.ticketsByKey, ticketKey) ? content.ticketsByKey[ticketKey] : undefined
}

export function workbookIds(): string[] {
  return Object.keys(WORKBOOK_SUMMARIES).sort(compareStrings)
}
`
}

function renderSealedRegistry(workbooks) {
  const loaderLines = []
  for (const { workbookId, ticketKeys } of workbooks) {
    for (const ticketKey of ticketKeys) {
      loaderLines.push(
        `  ${JSON.stringify(`${workbookId}:${ticketKey}`)}: () => import("./${workbookId}/${ticketKey}.server"),`
      )
    }
  }

  return `${GENERATED}
/**
 * Sealed sprint-labs registry (SERVER-ONLY). The ONLY loader for per-ticket
 * sealed modules; generalizes lib/scenarios/sealed/registry.server.ts (the
 * bugfix pack precedent) for a two-part (workbookId, ticketKey) key. Import
 * graph enforced by lib/sprint-labs/__tests__/sealing.test.ts.
 */
import type { SealedTicketContent } from "./types"

if (typeof window !== "undefined") {
  throw new Error("Sealed sprint-labs content must never load in the browser.")
}

const SEALED_TICKET_LOADERS: Record<string, () => Promise<{ sealed: SealedTicketContent }>> = {
${loaderLines.join("\n")}
}

function loaderKey(workbookId: string, ticketKey: string): string {
  return workbookId + ":" + ticketKey
}

export function hasSealedTicket(workbookId: string, ticketKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(SEALED_TICKET_LOADERS, loaderKey(workbookId, ticketKey))
}

export async function loadSealedTicket(
  workbookId: string,
  ticketKey: string
): Promise<SealedTicketContent | null> {
  const loader = SEALED_TICKET_LOADERS[loaderKey(workbookId, ticketKey)]
  if (!loader) return null
  const mod = await loader()
  return mod.sealed
}

/**
 * Defense-in-depth accessor (docs/sprint-labs/PLAN.md Task 14 review fix
 * M1): returns ONLY authorBrief, so a caller that needs the review-only
 * persona's material never even holds a reference to referenceDiff,
 * hiddenCases, or review -- those fields are eligible for GC the instant
 * this function returns, never passed to anything near a prompt builder.
 * Prefer this over loadSealedTicket whenever authorBrief is all the caller
 * needs.
 */
export async function loadSealedAuthorBrief(
  workbookId: string,
  ticketKey: string
): Promise<SealedTicketContent["authorBrief"]> {
  const loader = SEALED_TICKET_LOADERS[loaderKey(workbookId, ticketKey)]
  if (!loader) return null
  const mod = await loader()
  return mod.sealed.authorBrief
}

export function sealedTicketRegistryKeys(): string[] {
  return Object.keys(SEALED_TICKET_LOADERS)
}
`
}

// ============================================================
// Disk writes
// ============================================================

async function writeSealedFile(filePath, content) {
  const formatted = await formatGenerated(content, filePath)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, formatted)
}

async function writeCompiledWorkbook(workbookId, compiled, sealedByTicketKey, publicDir, sealedDir) {
  const pubWbDir = join(publicDir, workbookId)
  await writePublicFile(
    join(pubWbDir, "workbook.ts"),
    compiled.summary,
    renderWorkbookModule(workbookId, compiled.summary)
  )
  for (const sprint of compiled.sprints) {
    const nn = String(sprint.number).padStart(2, "0")
    await writePublicFile(
      join(pubWbDir, "sprints", `sprint-${nn}.ts`),
      sprint,
      renderSprintModule(workbookId, sprint)
    )
  }
  for (const [ticketKey, compiledTicket] of Object.entries(compiled.ticketsByKey)) {
    await writePublicFile(
      join(pubWbDir, "tickets", `${ticketKey}.ts`),
      compiledTicket,
      renderTicketModule(ticketKey, compiledTicket)
    )
  }

  const sealWbDir = join(sealedDir, workbookId)
  for (const [ticketKey, sealed] of Object.entries(sealedByTicketKey)) {
    await writeSealedFile(join(sealWbDir, `${ticketKey}.server.ts`), renderSealedTicketModule(sealed))
  }
}

/**
 * I-5: the authoritative set of {workbookId -> sprint numbers, ticket keys}
 * comes from the AUTHORING tree (every workbook.yaml under workbooks/), not
 * from whatever is already compiled — so a single-workbook compile can still
 * correctly know a SIBLING workbook's current shape without recompiling
 * it. Throws (via readYaml) on any malformed authored YAML; callers that
 * want best-effort behavior (pruning) must catch.
 *
 * Takes `workbooksRoot` explicitly rather than reading the module-level
 * `WORKBOOKS_DIR` constant directly: a bare CLI invocation authors against
 * the real workbooks/ directory, but a test (or a future CI job compiling a
 * staging content checkout elsewhere) passes an explicit target directory
 * that may not live under workbooks/ at all. Hardcoding `WORKBOOKS_DIR` here
 * caused pruning to declare a just-compiled, real workbook "no longer
 * authored" (because it was never under workbooks/ to begin with) and
 * delete the output this same run had just written — parameterizing this
 * is the fix, not a test-only workaround.
 */
function discoverAuthoredWorkbooks(workbooksRoot) {
  const dirNames = listSubdirs(workbooksRoot).filter((name) => existsSync(join(workbooksRoot, name, "workbook.yaml")))
  return dirNames.map((dirName) => {
    const workbookDir = join(workbooksRoot, dirName)
    const rawWorkbook = readYaml(join(workbookDir, "workbook.yaml"))
    const sprintNumbers = []
    const ticketKeys = []
    const sprintsDir = join(workbookDir, "sprints")
    for (const sprintDirName of listSubdirs(sprintsDir)) {
      const sprintYamlPath = join(sprintsDir, sprintDirName, "sprint.yaml")
      if (existsSync(sprintYamlPath)) {
        const rawSprint = readYaml(sprintYamlPath)
        if (typeof rawSprint.number === "number") sprintNumbers.push(rawSprint.number)
      }
      for (const ticketKey of listSubdirs(join(sprintsDir, sprintDirName, "tickets"))) {
        ticketKeys.push(ticketKey)
      }
    }
    return { workbookId: rawWorkbook.id, dirName, sprintNumbers, ticketKeys }
  })
}

/**
 * Deletes compiled output (public + sealed) with no corresponding authored
 * source (I-5): a workbook removed from workbooks/ entirely, a sprint
 * directory removed from a still-authored workbook, or a ticket directory
 * removed from a still-authored sprint. Best-effort: if ANY authored
 * workbook.yaml/sprint.yaml fails to parse (a sibling mid-edit), pruning is
 * skipped for this run rather than deleting output based on an incomplete
 * picture of what currently exists.
 *
 * Review round 2 finding (I-5 residual, reproduced by the reviewer): a
 * wrong, empty, or subset `--workbooks-root` used to prune EVERYTHING,
 * including the workbook(s) this very invocation had just compiled and
 * written — an empty authoring-tree scan is a far more likely sign of a
 * bad path than a genuinely emptied catalog. Three layers now guard
 * against that:
 *  (a) `justCompiledIds` (the workbook ids THIS invocation just compiled)
 *      are unconditionally added to the keep set, regardless of whether
 *      the authoring-tree scan happens to also find them. If one of them
 *      isn't in the scan (because `workbooksRoot` doesn't cover it), its
 *      whole directory is still protected, though its OWN stale
 *      ticket/sprint files can't be fine-grained-pruned this run (there is
 *      no authoritative per-ticket data for it without a matching
 *      authoring-tree entry) — safe degradation, never data loss.
 *  (b) if the authoring-tree scan finds ZERO workbooks, pruning refuses to
 *      run at all and prints a loud warning naming the root.
 *  (c) `--no-prune` (see parseArgs/main) skips this function entirely, for
 *      CI partial-checkout scenarios where neither (a) nor (b) apply.
 */
function pruneStaleOutput(publicDir, sealedDir, workbooksRoot, justCompiledIds) {
  let authored
  try {
    authored = discoverAuthoredWorkbooks(workbooksRoot)
  } catch (err) {
    console.error(
      `Skipping stale-output pruning: an authored workbook.yaml/sprint.yaml did not parse ` +
        `(${String(err.message).split("\n")[0]}). Fix it and recompile to prune.`
    )
    return
  }

  if (authored.length === 0) {
    console.error(
      `Skipping stale-output pruning: authoring root "${workbooksRoot}" contains no workbooks; ` +
        `refusing to prune. An empty scan is far likelier a wrong --workbooks-root than a genuinely ` +
        `emptied catalog. Pass --no-prune if this is intentional (e.g. a CI partial checkout).`
    )
    return
  }

  const keepTicketsByWorkbook = new Map(authored.map((w) => [w.workbookId, new Set(w.ticketKeys)]))
  const keepSprintStemsByWorkbook = new Map(
    authored.map((w) => [
      w.workbookId,
      new Set(w.sprintNumbers.map((n) => `sprint-${String(n).padStart(2, "0")}`)),
    ])
  )
  const keepWorkbookIds = new Set([...authored.map((w) => w.workbookId), ...justCompiledIds])

  for (const workbookId of safeReaddirDirs(publicDir)) {
    if (!keepWorkbookIds.has(workbookId)) {
      rmSync(join(publicDir, workbookId), { recursive: true, force: true })
      console.log(`pruned stale public output: ${workbookId} (no longer authored)`)
      continue
    }
    const keptTickets = keepTicketsByWorkbook.get(workbookId)
    const keptStems = keepSprintStemsByWorkbook.get(workbookId)
    if (!keptTickets || !keptStems) continue // self-protected (a) but absent from this root's scan — no fine-grained data to prune against.
    for (const file of safeReaddir(join(publicDir, workbookId, "tickets")).filter((n) => n.endsWith(".ts"))) {
      if (!keptTickets.has(file.replace(/\.ts$/, ""))) {
        rmSync(join(publicDir, workbookId, "tickets", file), { force: true })
        console.log(`pruned stale ticket output: ${workbookId}/tickets/${file}`)
      }
    }
    for (const file of safeReaddir(join(publicDir, workbookId, "sprints")).filter((n) => n.endsWith(".ts"))) {
      if (!keptStems.has(file.replace(/\.ts$/, ""))) {
        rmSync(join(publicDir, workbookId, "sprints", file), { force: true })
        console.log(`pruned stale sprint output: ${workbookId}/sprints/${file}`)
      }
    }
  }

  for (const workbookId of safeReaddirDirs(sealedDir)) {
    if (!keepWorkbookIds.has(workbookId)) {
      rmSync(join(sealedDir, workbookId), { recursive: true, force: true })
      console.log(`pruned stale sealed output: ${workbookId} (no longer authored)`)
      continue
    }
    const keptTickets = keepTicketsByWorkbook.get(workbookId)
    if (!keptTickets) continue // self-protected (a) but absent from this root's scan.
    for (const file of safeReaddir(join(sealedDir, workbookId)).filter((n) => n.endsWith(".server.ts"))) {
      if (!keptTickets.has(file.replace(/\.server\.ts$/, ""))) {
        rmSync(join(sealedDir, workbookId, file), { force: true })
        console.log(`pruned stale sealed ticket output: ${workbookId}/${file}`)
      }
    }
  }
}

async function regenerateRegistries(publicDir, sealedDir) {
  const workbooks = discoverCompiledWorkbooks(publicDir)
  mkdirSync(publicDir, { recursive: true })
  mkdirSync(sealedDir, { recursive: true })
  // Review round 2 (I-3 residual): this PUBLIC write used to bypass
  // writePublicFile via a bare writeFileSync, making "every public emit
  // goes through the one chokepoint" false for exactly this path. `workbooks`
  // (filenames/ids only) passes assertPublicSafe trivially today; the point
  // is the invariant now holds structurally, not that this particular
  // payload was ever a realistic leak vector.
  await writePublicFile(join(publicDir, "registry.ts"), workbooks, renderPublicRegistry(workbooks))
  // The SEALED registry is not a public emit — writePublicFile's
  // assertPublicSafe would be the wrong check to run against content that
  // is SUPPOSED to reference secret-classified fields (that's the entire
  // point of the sealed registry.server.ts's own runtime window guard).
  await writeSealedFile(join(sealedDir, "registry.server.ts"), renderSealedRegistry(workbooks))
  return workbooks.length
}

// ============================================================
// CLI
// ============================================================

function parseArgs(argv) {
  const positional = []
  const options = {
    publicDir: DEFAULT_PUBLIC_DIR,
    sealedDir: DEFAULT_SEALED_DIR,
    workbooksRoot: WORKBOOKS_DIR,
    noPrune: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--public-dir") options.publicDir = resolvePath(process.cwd(), argv[++i])
    else if (arg === "--sealed-dir") options.sealedDir = resolvePath(process.cwd(), argv[++i])
    else if (arg === "--workbooks-root") options.workbooksRoot = resolvePath(process.cwd(), argv[++i])
    else if (arg === "--no-prune") options.noPrune = true
    else positional.push(arg)
  }
  return { positional, options }
}

/**
 * Which directory pruning (and no-args auto-discovery) treats as "the
 * workbooks/ tree" — defaults to the real one, overridable via
 * `--workbooks-root` for a compile whose target(s) live elsewhere (tests;
 * a future CI job against a staging content checkout).
 */
function discoverWorkbookDirs(workbooksRoot) {
  return listSubdirs(workbooksRoot).filter((name) => existsSync(join(workbooksRoot, name, "workbook.yaml")))
}

export async function main(argv = process.argv.slice(2)) {
  const { positional, options } = parseArgs(argv)
  const targets =
    positional.length > 0
      ? positional.map((p) => (isAbsolute(p) ? p : resolvePath(process.cwd(), p)))
      : discoverWorkbookDirs(options.workbooksRoot).map((name) => join(options.workbooksRoot, name))

  if (targets.length === 0) {
    console.error("No workbook directories found under workbooks/*, and none given as arguments.")
    process.exitCode = 1
    return
  }

  const results = []
  let failed = false
  for (const dir of targets) {
    try {
      const result = compileWorkbook(dir)
      results.push(result)
      console.log(`compiled ${relative(ROOT, dir)} (${result.workbookId})`)
    } catch (err) {
      failed = true
      console.error(`FAILED compiling ${relative(ROOT, dir)}:\n${err.message}`)
    }
  }

  if (failed) {
    console.error("Aborting: no output written because at least one workbook failed to compile.")
    process.exitCode = 1
    return
  }

  for (const { workbookId, compiled, sealedByTicketKey } of results) {
    await writeCompiledWorkbook(workbookId, compiled, sealedByTicketKey, options.publicDir, options.sealedDir)
  }

  if (options.noPrune) {
    console.log("Skipping stale-output pruning: --no-prune was passed.")
  } else {
    const justCompiledIds = new Set(results.map((r) => r.workbookId))
    pruneStaleOutput(options.publicDir, options.sealedDir, options.workbooksRoot, justCompiledIds)
  }

  const count = await regenerateRegistries(options.publicDir, options.sealedDir)
  console.log(`regenerated public + sealed registries (${count} workbook(s))`)
}

const isMain =
  typeof process.argv[1] === "string" && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.stack : err)
    process.exitCode = 1
  })
}
