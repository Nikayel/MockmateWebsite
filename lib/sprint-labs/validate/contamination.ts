/**
 * The contamination gate (PLAN.md Task 9 / WORKBOOK-SPEC.md §5 rule 3 and §6's "contamination
 * gate" bullet; AGENT-CONTEXT.md §5 item 2). For one `ai_policy: "assisted"` ticket: run a COLD,
 * one-shot, pinned-model solve attempt against nothing but the ticket body and its visible tests,
 * REPLAY the model's proposed solution through Task 7's own harness, and record what fraction of
 * the ticket's hidden tests it passed. Over 60% and the ticket is too guessable to ship as a
 * graded-assisted ticket -- the whole point is to replace an author's estimate with a number.
 *
 * ## Why the cold prompt cannot show the model a diff format to fill in
 *
 * The model sees ONLY the ticket body/acceptance-criteria and the raw source of
 * `tests/visible/**` (`buildContaminationPrompt` below) -- never the rest of the codebase, never
 * `setup.diff`, never `reference.diff`, never `tests/hidden/**`. Because it has never seen a
 * single byte of the current file it would be "editing," asking it for a unified diff (matching
 * `reference.diff`'s own format) is not merely a style choice to avoid -- a diff's context lines
 * have to match real surrounding content the model cannot possibly have, so it would only ever
 * produce something `git apply` rejects. Asking for COMPLETE file contents at inferred paths (the
 * visible tests' own `import ... from "path"` lines are the only path information the model has,
 * and are exactly the paths a real learner's solution would need to land at too) is not just more
 * robust, it is the only format a blind model can produce at all. This reads as "the edited src
 * files" in PLAN.md Task 9's own words.
 *
 * ## What gets reused from Task 7, verbatim, and why
 *
 * `materializeThroughSetup` (seed + every prior ticket's `reference.diff` + this ticket's OWN
 * `setup.diff`) is reused UNCHANGED as the RED state to layer the model's proposal onto. It already
 * encodes exactly the right secrecy boundary for free: it never applies THIS ticket's own
 * `reference.diff` (prior tickets' references are fine -- that is just "the codebase as it stood
 * when this ticket opened," the same state a real learner sees). `runTicketFullSuite` (visible +
 * bridged hidden tests, io-case-with-entryPoint and probe alike) is reused unchanged as the
 * replayer -- this module never re-implements hidden-test execution or io-case bridging, per this
 * task's brief ("reuse materialize + ts-replay + the io-case execution, do NOT re-roll").
 *
 * Scope: TypeScript-routed tickets only, matching Task 7's own documented SQL deferral
 * (`dynamic/red-green.ts`'s regression-replay comment, `dynamic/sql-replay.ts`'s header) -- no
 * SQL-routed Meridian ticket exists yet to design a "the model writes SQL blind" prompt against,
 * and PLAN.md Task 9's own brief names only "ts-replay" as the reuse target.
 */
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import {
  FALLBACK_ORDER,
  generateAIResponse,
  getProviderStatus,
  type AIProvider,
} from "@/lib/ai-providers"
import { isValidWorkspacePath, normalizeWorkspaceEdits } from "@/lib/workspace-execution/validators"

import type { AuthoredTicket, AuthoredWorkbook } from "./tree"
import type { ValidationFinding } from "./types"
import { commitAll, writeWorkspaceFiles } from "./dynamic/git-workspace"
import { readVisibleTestFiles } from "./dynamic/hidden-tests"
import { resolveTicketRunnerLanguage } from "./dynamic/language"
import {
  allTicketsInOrder,
  cleanupGitWorkspace,
  findTicketLocation,
  materializeThroughSetup,
} from "./dynamic/materialize"
import { harnessFailedToRun } from "./dynamic/red-green"
import { runTicketFullSuite } from "./dynamic/ts-replay"

/** `passRate > CONTAMINATION_THRESHOLD` fails the ticket for graded-assisted (WORKBOOK-SPEC.md
 *  §5/§6: "Over ~60%"). Exactly 60% is still OK -- "over," not "at or over." */
export const CONTAMINATION_THRESHOLD = 0.6

/** Bump whenever `buildContaminationPrompt`'s template changes in a way that could change what
 *  the model produces. Folded into the cache's content hash so a prompt-wording change correctly
 *  busts every existing cache entry instead of silently reusing a verdict computed against a
 *  different question. */
const CONTAMINATION_PROMPT_VERSION = 1

const CONTAMINATION_SYSTEM_PROMPT = `You are acting as a capable candidate software engineer, working COLD: you have been given only a single engineering ticket and the public ("visible") automated tests that ship with it, for an existing codebase you cannot see any other part of.

Do your best to fully resolve the ticket. Infer which file(s) you must create or rewrite from the import paths the visible tests already use, and from the behavior the ticket and the tests describe. Write COMPLETE file contents for each file, never a diff or a patch -- you cannot see the current contents of any file, so a diff's context lines could never match anything real.

Respond with STRICT JSON ONLY, exactly this shape and nothing else: no markdown fence, no prose before or after it.
{"files":[{"path":"relative/path/from/repo/root.ts","content":"the complete new file contents"}]}`

/** A model response wrapped down to exactly what this module needs: the raw text and which
 *  provider actually answered (for `modelId`/`modelVersion` -- see `ContaminationVerdict`'s doc
 *  comment). Never the full `AIResponse` shape, so a stub in tests has nothing irrelevant to fake. */
export interface ContaminationModelResult {
  text: string
  provider: AIProvider
}

/** The one seam this whole module exists to make stubbable. Every test that exercises gate LOGIC
 *  (prompt assembly, replay, verdict math, cache hit/miss/force) injects a fake here instead of
 *  spending a real API call -- see this file's `__tests__/contamination.test.ts`. */
export type ContaminationModelCaller = (input: {
  systemPrompt: string
  userMessage: string
}) => Promise<ContaminationModelResult>

/** Real production caller: `generateAIResponse` pinned to `service: "sprint-labs-validate"` (R9,
 *  registered in lib/usage/services.ts alongside this call site) at `complexity: "critique"` --
 *  deliberately the HIGHEST-reasoning-effort chain in `FALLBACK_ORDER`
 *  (`["openai-xhigh", "deepseek", "gemini"]`), not `"code"`'s low-effort chain. The gate's entire
 *  purpose is bounding what a STRONG solver can guess cold (WORKBOOK-SPEC.md §5: "A strong model
 *  ... will pass a large fraction of the hidden tests cold"); calling a cheap/low-effort model
 *  would understate real contamination risk, which is the one direction this gate must never be
 *  wrong in. No `userId` (a content-authoring CI tool, not a signed-in request) so rate limiting
 *  never engages; `skipCache: true` is explicit defence -- omitting `eventType` already defaults
 *  it to `"chat_message"`, which happens to already skip `generateAIResponse`'s own response
 *  cache, but that is a side effect of an unrelated default, not a documented contract this file
 *  should rely on. */
async function defaultModelCaller(input: {
  systemPrompt: string
  userMessage: string
}): Promise<ContaminationModelResult> {
  const response = await generateAIResponse(input.systemPrompt, input.userMessage, [], {
    service: "sprint-labs-validate",
    complexity: "critique",
    skipCache: true,
  })
  return { text: response.text, provider: response.provider }
}

/**
 * The COLD prompt: ticket title + body + acceptance criteria (everything a learner sees on the
 * ticket card, per WORKBOOK-SPEC.md §4) plus the raw source of `tests/visible/**` -- and
 * STRUCTURALLY nothing else. This function never reads `ticket.hiddenTests`, `ticket.referenceDiff`,
 * `ticket.setupDiff`, or `ticket.authorBriefRaw` -- there is no leak to guard against here because
 * there is no code path that could read them, which is the whole reason this is a separate,
 * narrowly-typed function rather than a flag on some more general "describe this ticket" helper.
 * `__tests__/contamination.test.ts` asserts this empirically against real Meridian content, not
 * just by this comment.
 */
export function buildContaminationPrompt(ticket: AuthoredTicket): {
  systemPrompt: string
  userMessage: string
} {
  const visibleTests = readVisibleTestFiles(ticket)

  const criteriaBlock =
    ticket.acceptanceCriteria.length > 0
      ? `\n\nAcceptance criteria:\n${ticket.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}`
      : ""

  const testsBlock =
    visibleTests.length > 0
      ? visibleTests
          .map((file) => `### ${file.path}\n\`\`\`ts\n${file.content}\n\`\`\``)
          .join("\n\n")
      : "(no visible tests were authored for this ticket)"

  const userMessage = `## Ticket${ticket.title ? `: ${ticket.title}` : ""}

${ticket.bodyMd.trim()}${criteriaBlock}

## Visible tests

${testsBlock}`

  return { systemPrompt: CONTAMINATION_SYSTEM_PROMPT, userMessage }
}

/**
 * Parses the model's response into `{path, content}` files, or `[]` for anything unusable (missing
 * JSON, wrong shape, non-string fields). A model that fails to produce parseable output has, by
 * construction, failed to produce a working solution -- `[]` here means the replay below runs the
 * hidden tier against the untouched RED (setup-only) tree, which legitimately fails most/all of it.
 * That is a correct, honest 0%-ish score for "could not even parse a solution out of this model,"
 * not a crash. Strips a single leading/trailing markdown code fence (```json ... ``` or ``` ... ```)
 * before parsing, since models reliably wrap "JSON only" instructions in one anyway.
 * `normalizeWorkspaceEdits` (already used for the identical `{path, content}[]` shape elsewhere in
 * this codebase -- `lib/workspace-execution/validators.ts`) does the actual field-level narrowing,
 * reused rather than re-implemented.
 */
const JSON_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/

export function parseModelSolution(rawText: string): Array<{ path: string; content: string }> {
  const trimmed = rawText.trim()
  const fenceMatch = JSON_FENCE_PATTERN.exec(trimmed)
  const jsonText = fenceMatch ? fenceMatch[1] : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return []
  }

  if (!parsed || typeof parsed !== "object") return []
  return normalizeWorkspaceEdits((parsed as Record<string, unknown>).files)
}

/**
 * The exact pinned model that produced a verdict. Two fields because "pinned" has two parts that
 * change independently (PLAN.md Task 9: "record the exact pinned model id+version ... a 2026 score
 * isn't a 2028 score"): `modelId` is the STABLE provider slot (`"gemini"`, `"openai-xhigh"`, ...) --
 * the identity `FALLBACK_ORDER` routes to; `modelVersion` is the exact pinned model STRING that
 * slot resolved to at call time (`"gemini-3.6-flash"`, via `lib/ai/model-ids.ts`'s pins). The slot
 * can stay `"gemini"` across a model-ids.ts migration while `modelVersion` changes underneath it
 * (model-ids.ts's own header documents exactly such a migration, 2026-07-28) -- recording only one
 * of the two loses either "which tier answered" or "what that tier actually was," and the whole
 * point of stamping this is to answer both questions two years from now.
 */
export interface ContaminationVerdict {
  ticketKey: string
  modelId: string
  modelVersion: string
  hiddenPassed: number
  hiddenTotal: number
  passRate: number
  /**
   * `"ERROR-hidden-tier-not-exercised"` (review round 1, Important 2) fires whenever
   * `hiddenTestsNotBridged > 0` -- REGARDLESS of what `passRate` happened to compute over the
   * bridged subset, and it takes priority over both other values. An incompletely-exercised hidden
   * tier means the true rate is unknown, and an unknown rate reported as "OK" is a confident lie in
   * exactly the direction this gate must never be wrong in: a ticket whose every hidden test
   * happens to be an un-entryPoint'd io-case would otherwise ALWAYS read as a safe 0% (hiddenTotal
   * 0), the emptiest possible measurement mistaken for the strongest possible one.
   */
  verdict: "OK" | "FAIL-too-guessable" | "ERROR-hidden-tier-not-exercised"
  /** `false` when `parseModelSolution` could not extract any files at all (bad JSON, empty
   *  `files[]`, ...) -- surfaced so a human reading a low passRate can tell "the model tried and
   *  mostly failed" apart from "the model's output could not even be read," without changing the
   *  shape PLAN.md Task 9 specifies for the rest of the verdict. */
  modelProducedParseableSolution: boolean
  /** Count of this ticket's authored hidden tests that Task 7's own bridging could not turn into
   *  something runnable (an io-case with no `entryPoint`, a malformed probe). Zero on every "OK" or
   *  "FAIL-too-guessable" verdict by construction -- see `verdict`'s own doc comment. */
  hiddenTestsNotBridged: number
}

export interface ContaminationGateOptions {
  /** Injected for tests; defaults to the real `generateAIResponse` call. */
  modelCaller?: ContaminationModelCaller
  /** Recompute even if a matching cache entry exists. */
  force?: boolean
}

/** Every enabled provider's pinned model string, in the exact order `complexity: "critique"` would
 *  try them -- folded into the cache's content hash (see `computeContentHash`) so ANY change to the
 *  pin chain (a model-ids.ts migration, a provider added/removed/reordered) busts every cached
 *  verdict rather than silently keeping a score attributed to a model that is no longer running.
 *  Over-invalidating costs one model call per stale ticket; under-invalidating is a silently wrong
 *  number, so this errs toward invalidating. */
function contaminationModelFingerprint(): string {
  const status = getProviderStatus()
  return FALLBACK_ORDER.critique
    .filter((provider) => status[provider].enabled)
    .map((provider) => `${provider}=${status[provider].model}`)
    .join(",")
}

/** Content hash the cache is keyed by: everything that determines what the COLD prompt says (title,
 *  body, acceptance criteria, visible test sources), plus the prompt template version and the
 *  model fingerprint -- deliberately NOT the ticket's hidden tests or reference.diff, since neither
 *  one changing should, by itself, force re-spending a model call whose prompt never saw them
 *  either. Computed before any model call, so it doubles as the pre-call cache lookup key. */
function computeContentHash(ticket: AuthoredTicket): string {
  const visibleTests = readVisibleTestFiles(ticket)
  const material = JSON.stringify({
    promptVersion: CONTAMINATION_PROMPT_VERSION,
    modelFingerprint: contaminationModelFingerprint(),
    title: ticket.title ?? null,
    bodyMd: ticket.bodyMd,
    acceptanceCriteria: ticket.acceptanceCriteria,
    visibleTests: visibleTests.map((f) => ({ path: f.path, content: f.content })),
  })
  return createHash("sha256").update(material).digest("hex")
}

interface ContaminationCacheEntry {
  contentHash: string
  computedAt: string
  verdict: ContaminationVerdict
}

/** `workbooks/<id>/.validate-cache/contamination/<TICKET-KEY>.json` -- one committed file per
 *  ticket (human-diffable in a PR, easy to spot-check) rather than a hash-named file per content
 *  version: the entry's OWN `contentHash` field is what a lookup compares against, so a content
 *  change naturally invalidates the existing entry in place instead of accumulating an orphaned
 *  file per edit. "Cache verdicts by a content hash" (PLAN.md Task 9) describes what makes an
 *  entry valid, not that the hash must be the filename. */
function cacheFilePath(workbook: AuthoredWorkbook, ticketKey: string): string {
  return join(workbook.dir, ".validate-cache", "contamination", `${ticketKey}.json`)
}

function readCacheEntry(
  workbook: AuthoredWorkbook,
  ticketKey: string
): ContaminationCacheEntry | null {
  const path = cacheFilePath(workbook, ticketKey)
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"))
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.contentHash === "string" &&
      parsed.verdict &&
      typeof parsed.verdict === "object"
    ) {
      return parsed as ContaminationCacheEntry
    }
    return null
  } catch {
    return null // a corrupt cache file is a miss, not a crash
  }
}

function writeCacheEntry(
  workbook: AuthoredWorkbook,
  ticketKey: string,
  entry: ContaminationCacheEntry
): void {
  const path = cacheFilePath(workbook, ticketKey)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(entry, null, 2)}\n`, "utf8")
}

/** Applies the model's proposed files onto the materialized RED workspace and replays this
 *  ticket's full suite (visible + bridged hidden), reusing Task 7's `runTicketFullSuite` unchanged.
 *  A path that fails `isValidWorkspacePath` (absolute, `..`, embedded NUL -- the same validator
 *  `writeWorkspaceFiles` itself enforces) is dropped rather than thrown: a blind model inventing a
 *  bad path is an expected failure mode of this gate, not a reason to crash the whole ticket.
 *
 *  `hiddenTestsNotBridged` (from Task 7's own `hiddenFindings`, never dropped) is what lets a
 *  caller tell "the hidden tier ran and the model failed it" apart from "the hidden tier could not
 *  be exercised at all" -- an io-case with no `entryPoint`, or a malformed probe, produces a
 *  finding there instead of a runnable case, and `hiddenPassed`/`hiddenTotal` below reflect ONLY
 *  the subset that did bridge. Silently reading that subset's rate as the whole truth is exactly
 *  the risk-understating failure this gate exists to prevent (review round 1, Important 2). */
async function replayProposedSolution(
  workbook: AuthoredWorkbook,
  ticket: AuthoredTicket,
  proposedFiles: Array<{ path: string; content: string }>
): Promise<{ hiddenPassed: number; hiddenTotal: number; hiddenTestsNotBridged: number }> {
  const materialized = materializeThroughSetup(workbook, ticket.key)
  try {
    if (materialized.failure) {
      throw new Error(
        `contamination gate: could not materialize the red state for "${ticket.key}" (${materialized.failure.ticketKey}'s ${materialized.failure.diffKind}.diff failed to apply: ${materialized.failure.error})`
      )
    }

    const validFiles = proposedFiles.filter((f) => isValidWorkspacePath(f.path))
    if (validFiles.length > 0) {
      writeWorkspaceFiles(materialized.ws, validFiles)
      commitAll(materialized.ws, `contamination: ${ticket.key} model-proposed solution`)
    }

    const run = await runTicketFullSuite(materialized.ws, ticket)
    if (harnessFailedToRun(run.result)) {
      throw new Error(
        `contamination gate: the harness could not run at all for "${ticket.key}": ${run.result.error ?? "zero results with success:false"}`
      )
    }

    const hiddenResults = run.result.results.filter((r) => r.isHidden)
    return {
      hiddenTotal: hiddenResults.length,
      hiddenPassed: hiddenResults.filter((r) => r.passed).length,
      hiddenTestsNotBridged: run.hiddenFindings.length,
    }
  } finally {
    cleanupGitWorkspace(materialized.ws)
  }
}

/**
 * The contamination gate for exactly one ticket: assemble the cold prompt, call the (possibly
 * cached, possibly stubbed) model, replay its proposal through Task 7's harness, and return the
 * verdict. Caches by content hash under `workbooks/<id>/.validate-cache/contamination/` --
 * `force: true` recomputes and overwrites regardless of a matching entry.
 *
 * Policy-agnostic on purpose: this function computes a number for ANY ticket with visible tests,
 * whatever its `ai_policy`. `validateWorkbookContamination` below is where "only assisted tickets
 * are graded against the 60% threshold" is decided -- keeping that decision out of this function
 * is what lets a test exercise the replay mechanism against a fixture ticket without needing to
 * fake an `ai_policy` it doesn't care about.
 */
export async function runContaminationGateForTicket(
  workbook: AuthoredWorkbook,
  ticketKey: string,
  options: ContaminationGateOptions = {}
): Promise<ContaminationVerdict> {
  const { ticket } = findTicketLocation(workbook, ticketKey)
  const contentHash = computeContentHash(ticket)

  if (!options.force) {
    const cached = readCacheEntry(workbook, ticketKey)
    if (cached && cached.contentHash === contentHash) {
      return cached.verdict
    }
  }

  const modelCaller = options.modelCaller ?? defaultModelCaller
  const { systemPrompt, userMessage } = buildContaminationPrompt(ticket)
  const modelResult = await modelCaller({ systemPrompt, userMessage })
  const proposedFiles = parseModelSolution(modelResult.text)

  const { hiddenPassed, hiddenTotal, hiddenTestsNotBridged } = await replayProposedSolution(
    workbook,
    ticket,
    proposedFiles
  )
  const passRate = hiddenTotal === 0 ? 0 : hiddenPassed / hiddenTotal

  const verdict: ContaminationVerdict = {
    ticketKey,
    modelId: modelResult.provider,
    modelVersion: getProviderStatus()[modelResult.provider]?.model ?? "unknown",
    hiddenPassed,
    hiddenTotal,
    passRate,
    verdict:
      hiddenTestsNotBridged > 0
        ? "ERROR-hidden-tier-not-exercised"
        : passRate > CONTAMINATION_THRESHOLD
          ? "FAIL-too-guessable"
          : "OK",
    modelProducedParseableSolution: proposedFiles.length > 0,
    hiddenTestsNotBridged,
  }

  writeCacheEntry(workbook, ticketKey, {
    contentHash,
    computedAt: new Date().toISOString(),
    verdict,
  })

  return verdict
}

export interface ContaminationWorkbookResult {
  verdicts: ContaminationVerdict[]
  findings: ValidationFinding[]
}

/**
 * Runs the contamination gate over every ELIGIBLE ticket in `workbook`: `ai_policy: "assisted"`
 * (WORKBOOK-SPEC.md §6 -- the gate exists to decide whether a ticket "can ship as a graded assisted
 * ticket"; `unassisted`/`review-only` tickets are not graded-assisted and their measurement
 * integrity is a different, already-handled concern -- AGENT-CONTEXT.md §5 point 4), a
 * `reference.diff` actually shipped (a Task 16 stub contributes zero findings, mirroring
 * `dynamic/index.ts`'s identical stub convention verbatim), TypeScript-routed
 * (`resolveTicketRunnerLanguage`, matching this module's documented scope), and at least one
 * authored hidden test (nothing to bound a rate against otherwise -- reported as a WARN, not
 * silently skipped, mirroring `dynamic/index.ts`'s `dynamic-no-visible-tests` WARN for the
 * analogous "authored content but nothing executable" gap).
 *
 * One ticket's crash (a real bug here, an unexpected filesystem/model error) becomes a named
 * finding and the loop continues -- it must never hide every OTHER ticket's result behind it,
 * exactly the same per-ticket try/catch shape `dynamic/index.ts` uses.
 */
export async function validateWorkbookContamination(
  workbook: AuthoredWorkbook,
  options: ContaminationGateOptions = {}
): Promise<ContaminationWorkbookResult> {
  const verdicts: ContaminationVerdict[] = []
  const findings: ValidationFinding[] = []

  for (const { ticket } of allTicketsInOrder(workbook)) {
    if (ticket.aiPolicy !== "assisted") continue
    if (!ticket.referenceDiff) continue // stub: nothing shipped yet, nothing to check
    if (resolveTicketRunnerLanguage(workbook, ticket) !== "typescript") continue

    if (ticket.hiddenTests.length === 0) {
      findings.push({
        ruleId: "contamination-no-hidden-tests",
        severity: "warn",
        ticketKey: ticket.key,
        message:
          "ai_policy: assisted with a shipped reference.diff but zero authored hidden tests; the contamination gate has nothing to bound a passRate against.",
      })
      continue
    }

    try {
      const verdict = await runContaminationGateForTicket(workbook, ticket.key, options)
      verdicts.push(verdict)

      if (verdict.verdict === "FAIL-too-guessable") {
        findings.push({
          ruleId: "contamination-gate",
          severity: "error",
          ticketKey: ticket.key,
          message: `passRate ${(verdict.passRate * 100).toFixed(1)}% (${verdict.hiddenPassed}/${verdict.hiddenTotal} hidden) exceeds the ${(CONTAMINATION_THRESHOLD * 100).toFixed(0)}% contamination threshold -- too guessable to ship as a graded-assisted ticket [${verdict.modelId}/${verdict.modelVersion}].`,
        })
      } else if (verdict.verdict === "ERROR-hidden-tier-not-exercised") {
        findings.push({
          ruleId: "contamination-gate-hidden-tier-not-exercised",
          severity: "error",
          ticketKey: ticket.key,
          message: `${verdict.hiddenTestsNotBridged} of this ticket's hidden test(s) could not be bridged into something runnable (an io-case with no entryPoint, or a malformed probe), so the contamination gate could not exercise the hidden tier at all and cannot report a trustworthy passRate. Author entryPoint on every io-case hidden test for this ticket before it can ship as graded-assisted.`,
        })
      }
    } catch (error) {
      findings.push({
        ruleId: "contamination-gate-crashed",
        severity: "error",
        ticketKey: ticket.key,
        message: `contamination gate threw while validating this ticket: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  return { verdicts, findings }
}
