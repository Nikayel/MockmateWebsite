/**
 * The provisioning scans: given the workspace bundle a learner would actually receive when
 * opening ticket K, assert it carries none of the material that must never leave the authoring
 * tree (WORKBOOK-SPEC.md §6, AGENT-CONTEXT.md §4/§8).
 *
 * "The bundle a learner would receive for ticket K" IS `materialize.ts`'s `materializeThroughSetup`
 * output -- seed + every prior ticket's `reference.diff` + this ticket's OWN `setup.diff` (never
 * its `reference.diff`, never its hidden tests, never any secret file). This module does not
 * re-derive that tree; it reuses the exact same materializer the red/green gate uses, on the
 * reasoning that a second, independently-written "provisioning tree" builder would be a second
 * place to get the definition of "learner bundle" subtly wrong.
 *
 * Two scans, each checking BOTH content and PATH/NAME (PLAN.md Task 7 review round 1, Important
 * 2b -- a leak that is itself a filename, not embedded in a blob's bytes, evaded a content-only
 * scan entirely before this round):
 *  - `scanProvisionedBundleContent` -- greps every FILE's content AND PATH in the bundle for four
 *    leak classes: hidden-test signatures (humanName/fileName/probe body/io-case input+expected,
 *    from EVERY ticket in the whole workbook, not just this one -- a hidden test must never leak
 *    regardless of timing), `reference.diff`/`review.yaml`/`author_brief.yaml` raw text, any
 *    LATER ticket's key, and any migration filename that exists somewhere in the workbook's
 *    `reference.diff`/`setup.diff` text but is not yet present in this bundle's OWN `migrations/`
 *    listing ("unshipped migration numbers", WORKBOOK-SPEC.md §6).
 *  - `scanFreshWorkspaceGitObjects` -- AGENT-CONTEXT.md §4 launch blocker 6's specific check: the
 *    bundle's `.git/objects` store (built by `git-workspace.ts`'s real `git init` + apply, never a
 *    clone) contains zero blobs AND zero tree-entry NAMES matching a hidden-test signature, dumped
 *    via `git cat-file --batch-all-objects` exactly as a real exfiltration attempt would.
 *
 * Signature length gating (`MIN_SIGNATURE_LENGTH`) applies ONLY to free-text bodies/expected/input
 * values, never to `humanName`/`fileName` (review round 1, Important 2a): those are the core "zero
 * hidden-test signatures" guarantee's own identifiers, and a short one ("zero", "empty") is exactly
 * as real a leak as a long one -- length-gating them left a hole in the guarantee this module exists
 * to make. A free-text body/expected/input value keeps the floor: a short, generic fragment risks a
 * false-positive match against unrelated legitimate prose, which would make a real leak
 * indistinguishable from noise.
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { AuthoredTicket, AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import {
  cleanupGitWorkspace,
  readAllFiles,
  readAllGitObjectBlobs,
  readAllGitObjectNames,
  type MaterializedFile,
} from "./git-workspace"
import { allTicketsInOrder, findTicketLocation, materializeThroughSetup } from "./materialize"

const MIN_SIGNATURE_LENGTH = 10

function longEnough(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length >= MIN_SIGNATURE_LENGTH
}

interface Signature {
  ticketKey: string
  kind: string
  text: string
  /** Hidden-test signatures only (undefined on secret-file signatures, which are never eligible for
   *  the earned-shipped suppression). `ownerIndex` is the play-order index of the LATEST ticket that
   *  authors this exact text (max over ALL owners, so a later independent re-use still blocks
   *  suppression); `shippedByAnyOwner` is whether some authoring ticket's reference.diff ships the
   *  text into permanent source. Consumed by `isEarnedShippedSignature`. */
  ownerIndex?: number
  shippedByAnyOwner?: boolean
}

/** Whether `referenceDiff` ships `text` into source. `text` is a hidden signature's text -- already
 *  JSON-encoded for io-case values. Matches the JSON-encoded form OR, when the value was a string,
 *  its raw unquoted content, so a reference that ships it with different quoting still counts. A
 *  false negative here only ever means "do not suppress" (keep flagging); it can never hide a leak. */
function referenceShipsValue(referenceDiff: string | undefined | null, text: string): boolean {
  if (typeof referenceDiff !== "string" || referenceDiff.length === 0) return false
  if (referenceDiff.includes(text)) return true
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === "string" && parsed.length > 0) return referenceDiff.includes(parsed)
  } catch {
    // `text` is not a JSON literal (a raw probe body); the direct includes above already answered.
  }
  return false
}

/** A hidden-test-signature hit is an EARNED, SHIPPED value -- not a leak -- when every ticket that
 *  authors the signature is STRICTLY before the scanned ticket in play order (`ownerIndex <
 *  bundleIndex`) AND some owner ships it into source (`shippedByAnyOwner`). Rationale: once ticket Y
 *  is earned, its reference.diff is permanent source every later ticket's cumulative tree carries,
 *  and Y's hidden tier is never replayed downstream (red-green.ts regresses VISIBLE tiers only), so
 *  Y's shipped value surfacing in a strictly-later bundle cannot be exploited. Same-ticket
 *  (`ownerIndex === bundleIndex`) and future-owner hits still fire, and so do non-shipped grading
 *  identifiers (a humanName is never `shippedByAnyOwner`). */
function isEarnedShippedSignature(signature: Signature, bundleIndex: number): boolean {
  return (
    signature.ownerIndex !== undefined &&
    signature.shippedByAnyOwner === true &&
    signature.ownerIndex < bundleIndex
  )
}

/** De-duplicates by exact `.text` (first occurrence wins), keeping insertion order. A ticket whose
 *  hidden test names its own YAML file after its humanName (`humanName: "zero"`, filename
 *  `zero.yaml`) would otherwise produce two IDENTICAL signature entries; scanning duplicates
 *  against multiple matching files then inflates finding counts (2 real leak locations became 4
 *  reported findings before this fix -- caught by this task's own short-signature-leak fixture). */
function dedupeSignatures(signatures: Signature[]): Signature[] {
  const seen = new Set<string>()
  const out: Signature[] = []
  for (const signature of signatures) {
    if (seen.has(signature.text)) continue
    seen.add(signature.text)
    out.push(signature)
  }
  return out
}

/** Every hidden test's leak-worthy text, across every ticket in the workbook, each carrying the
 *  temporal metadata `isEarnedShippedSignature` needs. `humanName`/`fileName` are NEVER length-gated
 *  (see this file's header) and are NEVER shipped-eligible (a grading identifier is never
 *  legitimately shipped source); `body` keeps the free-text floor and is likewise not
 *  shipped-eligible (assertion code is not shipped source); only io-case `expected`/`input` VALUES
 *  can be a value a ticket's own reference.diff legitimately ships into permanent source. Per unique
 *  text we keep the MAX owner index and OR the shipped flag across all owners, so a later independent
 *  re-use of the same text still blocks suppression (never suppress a FUTURE ticket's answer). */
function collectHiddenTestSignatures(workbook: AuthoredWorkbook): Signature[] {
  interface Aggregate {
    kind: string
    firstOwnerKey: string
    ownerIndex: number
    shippedByAnyOwner: boolean
  }
  const byText = new Map<string, Aggregate>()

  allTicketsInOrder(workbook).forEach(({ ticket }, index) => {
    const candidates: Array<{ text: string; shippedEligible: boolean }> = []
    for (const hidden of ticket.hiddenTests) {
      for (const candidate of [hidden.humanName, hidden.fileName]) {
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          candidates.push({ text: candidate, shippedEligible: false })
        }
      }
      if (typeof hidden.raw.body === "string" && longEnough(hidden.raw.body)) {
        candidates.push({ text: hidden.raw.body, shippedEligible: false })
      }
      for (const value of [hidden.raw.expected, hidden.raw.input]) {
        if (value === undefined) continue
        const text = JSON.stringify(value)
        if (longEnough(text)) candidates.push({ text, shippedEligible: true })
      }
    }

    for (const { text, shippedEligible } of candidates) {
      const ships = shippedEligible && referenceShipsValue(ticket.referenceDiff, text)
      const existing = byText.get(text)
      if (existing) {
        existing.ownerIndex = Math.max(existing.ownerIndex, index)
        existing.shippedByAnyOwner = existing.shippedByAnyOwner || ships
      } else {
        byText.set(text, {
          kind: "hidden-test",
          firstOwnerKey: ticket.key,
          ownerIndex: index,
          shippedByAnyOwner: ships,
        })
      }
    }
  })

  const out: Signature[] = []
  for (const [text, aggregate] of byText) {
    out.push({
      ticketKey: aggregate.firstOwnerKey,
      kind: aggregate.kind,
      text,
      ownerIndex: aggregate.ownerIndex,
      shippedByAnyOwner: aggregate.shippedByAnyOwner,
    })
  }
  return out
}

/** `reference.diff` (always read via `load-tree.ts`) plus `review.yaml`/`author_brief.yaml`'s raw
 *  file text, read fresh here since `load-tree.ts` never captures `review.yaml` at all (no Task 3
 *  static rule needs it) and only exposes `author_brief.yaml` pre-parsed -- a leak-scan wants the
 *  literal file bytes, not a re-serialization that could accidentally normalize away a leak. Free
 *  text, so it keeps the length floor. */
function collectSecretFileSignatures(workbook: AuthoredWorkbook): Signature[] {
  const signatures: Signature[] = []
  for (const { ticket } of allTicketsInOrder(workbook)) {
    if (longEnough(ticket.referenceDiff)) {
      signatures.push({
        ticketKey: ticket.key,
        kind: "reference.diff",
        text: ticket.referenceDiff as string,
      })
    }
    for (const [fileName, kind] of [
      ["review.yaml", "review.yaml"],
      ["author_brief.yaml", "author_brief.yaml"],
    ] as const) {
      const raw = readOptionalRawFile(ticket.dirPath, fileName)
      if (longEnough(raw)) signatures.push({ ticketKey: ticket.key, kind, text: raw as string })
    }
  }
  return dedupeSignatures(signatures)
}

/** Mirrors load-tree.ts's own `readFileIfExists` -- a leak-scan wants the literal file bytes. */
function readOptionalRawFile(ticketDir: string, fileName: string): string | null {
  const path = join(ticketDir, fileName)
  return existsSync(path) ? readFileSync(path, "utf8") : null
}

const MIGRATION_PATH = /migrations\/[\w.-]+\.sql/g

/** Every migration filename referenced anywhere in any ticket's `setup.diff`/`reference.diff` text
 *  across the whole workbook -- the "eventually shipped" universe a bundle's OWN `migrations/`
 *  listing is compared against. */
function collectMigrationFilenameUniverse(workbook: AuthoredWorkbook): Set<string> {
  const names = new Set<string>()
  for (const { ticket } of allTicketsInOrder(workbook)) {
    for (const text of [ticket.setupDiff, ticket.referenceDiff]) {
      if (!text) continue
      for (const match of text.matchAll(MIGRATION_PATH)) names.add(match[0])
    }
  }
  return names
}

function bundleContainsPath(files: MaterializedFile[], path: string): boolean {
  return files.some((file) => file.path === path || file.path.endsWith(`/${path}`))
}

interface SignatureHit {
  signature: Signature
  file: MaterializedFile
}

/** Checks both a file's CONTENT and its PATH against every signature (Important 2b: a leak that is
 *  itself a filename, never embedded in any blob's bytes, must not evade this scan). Returns which
 *  FILE each hit came from, so the caller's finding can point at it directly rather than leaving a
 *  human to grep the whole bundle for a 60-character truncated signature snippet. */
function scanFilesForSignatures(
  bundle: MaterializedFile[],
  signatures: Signature[]
): SignatureHit[] {
  const hits: SignatureHit[] = []
  for (const file of bundle) {
    for (const signature of signatures) {
      if (file.content.includes(signature.text) || file.path.includes(signature.text)) {
        hits.push({ signature, file })
      }
    }
  }
  return hits
}

export interface ProvisioningScanFindings {
  contentFindings: ValidationFinding[]
  gitObjectFindings: ValidationFinding[]
}

/** Scans the bundle a learner would receive when opening `ticket` for every leak class this
 *  module knows about. Materializes and cleans up its own workspace. */
export function scanProvisionedBundleContent(
  workbook: AuthoredWorkbook,
  ticket: AuthoredTicket
): ValidationFinding[] {
  const materialized = materializeThroughSetup(workbook, ticket.key)
  try {
    if (materialized.failure) {
      // The red/green gate already reports a diff-apply failure for this ticket; the provisioning
      // scan has nothing to scan and stays silent rather than double-reporting the same root cause.
      return []
    }

    const bundle = readAllFiles(materialized.ws)
    const findings: ValidationFinding[] = []

    const orderedTickets = allTicketsInOrder(workbook)
    const bundleIndex = orderedTickets.findIndex((entry) => entry.ticket.key === ticket.key)

    // Hidden-test signatures get the earned-shipped suppression (a downstream ticket legitimately
    // carrying an earlier, earned ticket's shipped value is not a leak). Secret-file signatures
    // (raw reference.diff/review.yaml/author_brief.yaml text) never legitimately appear in a
    // materialized bundle, so they stay timing-independent.
    const hiddenHits = scanFilesForSignatures(bundle, collectHiddenTestSignatures(workbook)).filter(
      (hit) => !isEarnedShippedSignature(hit.signature, bundleIndex)
    )
    const secretHits = scanFilesForSignatures(bundle, collectSecretFileSignatures(workbook))
    for (const hit of [...hiddenHits, ...secretHits]) {
      findings.push({
        ruleId: "dynamic-provisioning-leak",
        severity: "error",
        ticketKey: ticket.key,
        path: hit.file.path,
        message: `learner bundle for "${ticket.key}" contains ${hit.signature.kind} content authored for "${hit.signature.ticketKey}" in ${hit.file.path} (leaked signature: ${JSON.stringify(hit.signature.text.slice(0, 60))}...)`,
      })
    }

    // Deliberately NOT gated by longEnough/MIN_SIGNATURE_LENGTH: a real ticket key ("MER-401",
    // "DEMO-102") is only 7-8 characters, well under that threshold, but its `[A-Z]+-\d+` shape is
    // already distinctive enough that a false positive in ordinary source/comment prose is not a
    // real risk -- gating this on length would have silently made the check a no-op for every
    // realistically-shaped key (caught by this task's own leak-future-marker fixture test, whose
    // "LEAK-102" is 8 characters). Checks path too, same reasoning as the hidden-test scan above.
    const futureKeys = orderedTickets.slice(bundleIndex + 1).map((entry) => entry.ticket.key)
    for (const futureKey of futureKeys) {
      const hit = bundle.find(
        (file) => file.content.includes(futureKey) || file.path.includes(futureKey)
      )
      if (hit) {
        findings.push({
          ruleId: "dynamic-provisioning-leak",
          severity: "error",
          ticketKey: ticket.key,
          path: hit.path,
          message: `learner bundle for "${ticket.key}" mentions future ticket key "${futureKey}" in ${hit.path}`,
        })
      }
    }

    const migrationUniverse = collectMigrationFilenameUniverse(workbook)
    for (const migrationName of migrationUniverse) {
      const shortName = migrationName.split("/").pop() as string
      if (bundleContainsPath(bundle, migrationName)) continue // already shipped into this bundle
      const hit = bundle.find(
        (file) => file.content.includes(shortName) || file.path.includes(shortName)
      )
      if (hit) {
        findings.push({
          ruleId: "dynamic-provisioning-leak",
          severity: "error",
          ticketKey: ticket.key,
          path: hit.path,
          message: `learner bundle for "${ticket.key}" references unshipped migration "${shortName}" in ${hit.path}`,
        })
      }
    }

    return findings
  } finally {
    cleanupGitWorkspace(materialized.ws)
  }
}

/** AGENT-CONTEXT.md §4 launch blocker 6: a workspace provisioned by `git init` + copy (never a
 *  clone) has zero git OBJECTS -- blob content AND tree-entry names -- matching a hidden-test
 *  signature. */
export function scanFreshWorkspaceGitObjects(
  workbook: AuthoredWorkbook,
  ticket: AuthoredTicket
): ValidationFinding[] {
  const materialized = materializeThroughSetup(workbook, ticket.key)
  try {
    if (materialized.failure) return []

    const blobs = readAllGitObjectBlobs(materialized.ws)
    const names = readAllGitObjectNames(materialized.ws)
    const signatures = collectHiddenTestSignatures(workbook)
    const findings: ValidationFinding[] = []

    const orderedTickets = allTicketsInOrder(workbook)
    const bundleIndex = orderedTickets.findIndex((entry) => entry.ticket.key === ticket.key)

    for (const signature of signatures) {
      // Same earned-shipped suppression as the content scan: a git blob for an earlier, earned
      // ticket's shipped source file legitimately contains that ticket's now-public value.
      if (isEarnedShippedSignature(signature, bundleIndex)) continue
      const blobHit = blobs.some((blob) => blob.includes(signature.text))
      const nameHit = names.some((name) => name.includes(signature.text))
      if (blobHit || nameHit) {
        // Both evidence types are named when both matched -- defaulting to "blob content"
        // whenever a blob ALSO happened to match would silently hide a real tree-entry-name hit
        // whenever the same signature also appears in some unrelated file's content.
        const evidence = [blobHit && "blob content", nameHit && "tree entry name"]
          .filter((v): v is string => Boolean(v))
          .join(" and ")
        findings.push({
          ruleId: "dynamic-fresh-workspace-git-objects",
          severity: "error",
          ticketKey: ticket.key,
          message: `a git object (${evidence}) in the freshly provisioned workspace for "${ticket.key}" matches a hidden-test signature authored for "${signature.ticketKey}" -- provisioning must never carry git history (git init + copy, never clone).`,
        })
      }
    }

    return findings
  } finally {
    cleanupGitWorkspace(materialized.ws)
  }
}

/** Runs both scans for a single ticket -- the composition `dynamic/index.ts` calls per ticket. */
export function scanProvisioning(
  workbook: AuthoredWorkbook,
  ticketKey: string
): ProvisioningScanFindings {
  const { ticket } = findTicketLocation(workbook, ticketKey)
  return {
    contentFindings: scanProvisionedBundleContent(workbook, ticket),
    gitObjectFindings: scanFreshWorkspaceGitObjects(workbook, ticket),
  }
}
