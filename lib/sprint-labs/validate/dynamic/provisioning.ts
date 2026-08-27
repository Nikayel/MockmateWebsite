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
 * Two scans:
 *  - `scanProvisionedBundleContent` -- greps every FILE's content in the bundle for four leak
 *    classes: hidden-test signatures (humanName/fileName/probe body/io-case input+expected, from
 *    EVERY ticket in the whole workbook, not just this one -- a hidden test must never leak
 *    regardless of timing), `reference.diff`/`review.yaml`/`author_brief.yaml` raw text, any
 *    LATER ticket's key, and any migration filename that exists somewhere in the workbook's
 *    `reference.diff`/`setup.diff` text but is not yet present in this bundle's OWN `migrations/`
 *    listing ("unshipped migration numbers", WORKBOOK-SPEC.md §6).
 *  - `scanFreshWorkspaceGitObjects` -- AGENT-CONTEXT.md §4 launch blocker 6's specific check: the
 *    bundle's `.git/objects` store (built by `git-workspace.ts`'s real `git init` + apply, never a
 *    clone) contains zero blobs matching a hidden-test signature, dumped via `git cat-file
 *    --batch-all-objects` exactly as a real exfiltration attempt would.
 *
 * A signature shorter than `MIN_SIGNATURE_LENGTH` is excluded from both scans: a short, generic
 * string (a one-word `humanName`, a bare ticket key that also reads as ordinary prose) risks a
 * false-positive match against unrelated legitimate content, which would make a real leak
 * indistinguishable from noise. This is a precision/recall tradeoff stated once here rather than
 * silently at each call site.
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { AuthoredTicket, AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import {
  cleanupGitWorkspace,
  readAllFiles,
  readAllGitObjectBlobs,
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
}

/** Every hidden test's leak-worthy text, across every ticket in the workbook. */
function collectHiddenTestSignatures(workbook: AuthoredWorkbook): Signature[] {
  const signatures: Signature[] = []
  for (const { ticket } of allTicketsInOrder(workbook)) {
    for (const hidden of ticket.hiddenTests) {
      const candidates = [hidden.humanName, hidden.fileName, hidden.raw.body]
      if (hidden.raw.expected !== undefined) candidates.push(JSON.stringify(hidden.raw.expected))
      if (hidden.raw.input !== undefined) candidates.push(JSON.stringify(hidden.raw.input))
      for (const candidate of candidates) {
        if (typeof candidate === "string" && longEnough(candidate)) {
          signatures.push({ ticketKey: ticket.key, kind: "hidden-test", text: candidate })
        }
      }
    }
  }
  return signatures
}

/** `reference.diff` (always read via `load-tree.ts`) plus `review.yaml`/`author_brief.yaml`'s raw
 *  file text, read fresh here since `load-tree.ts` never captures `review.yaml` at all (no Task 3
 *  static rule needs it) and only exposes `author_brief.yaml` pre-parsed -- a leak-scan wants the
 *  literal file bytes, not a re-serialization that could accidentally normalize away a leak. */
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
  return signatures
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

function scanTextsForSignatures(bundle: MaterializedFile[], signatures: Signature[]): Signature[] {
  const hits: Signature[] = []
  for (const file of bundle) {
    for (const signature of signatures) {
      if (file.content.includes(signature.text)) hits.push(signature)
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

    const hiddenHits = scanTextsForSignatures(bundle, collectHiddenTestSignatures(workbook))
    const secretHits = scanTextsForSignatures(bundle, collectSecretFileSignatures(workbook))
    for (const hit of [...hiddenHits, ...secretHits]) {
      findings.push({
        ruleId: "dynamic-provisioning-leak",
        severity: "error",
        ticketKey: ticket.key,
        message: `learner bundle for "${ticket.key}" contains ${hit.kind} content authored for "${hit.ticketKey}" (leaked signature: ${JSON.stringify(hit.text.slice(0, 60))}...)`,
      })
    }

    // Deliberately NOT gated by longEnough/MIN_SIGNATURE_LENGTH: a real ticket key ("MER-401",
    // "DEMO-102") is only 7-8 characters, well under that threshold, but its `[A-Z]+-\d+` shape is
    // already distinctive enough that a false positive in ordinary source/comment prose is not a
    // real risk -- gating this on length would have silently made the check a no-op for every
    // realistically-shaped key (caught by this task's own leak-future-marker fixture test, whose
    // "LEAK-102" is 8 characters).
    const allKeys = allTicketsInOrder(workbook)
    const thisIndex = allKeys.findIndex((entry) => entry.ticket.key === ticket.key)
    const futureKeys = allKeys.slice(thisIndex + 1).map((entry) => entry.ticket.key)
    for (const futureKey of futureKeys) {
      const hit = bundle.find((file) => file.content.includes(futureKey))
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
      const hit = bundle.find((file) => file.content.includes(shortName))
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
 *  clone) has zero git OBJECTS (not just working-tree files) matching a hidden-test signature. */
export function scanFreshWorkspaceGitObjects(
  workbook: AuthoredWorkbook,
  ticket: AuthoredTicket
): ValidationFinding[] {
  const materialized = materializeThroughSetup(workbook, ticket.key)
  try {
    if (materialized.failure) return []

    const blobs = readAllGitObjectBlobs(materialized.ws)
    const signatures = collectHiddenTestSignatures(workbook)
    const findings: ValidationFinding[] = []

    for (const blob of blobs) {
      for (const signature of signatures) {
        if (blob.includes(signature.text)) {
          findings.push({
            ruleId: "dynamic-fresh-workspace-git-objects",
            severity: "error",
            ticketKey: ticket.key,
            message: `a git object in the freshly provisioned workspace for "${ticket.key}" matches a hidden-test signature authored for "${signature.ticketKey}" -- provisioning must never carry git history (git init + copy, never clone).`,
          })
        }
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
