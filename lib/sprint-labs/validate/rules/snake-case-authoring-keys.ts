/**
 * Ruling R17 (supersedes the R14-only framing): each authored key follows
 * THE SPEC'S OWN SPELLING, checked both directions, not "everything is
 * snake_case." `ai_policy`/`ai_policy_reason`/`concession_triggers` are
 * snake_case (WORKBOOK-SPEC.md §6) -- reject the camelCase guess.
 * `filesTouched`/`newSourceFiles`/`rewrittenFiles` are camelCase
 * (SPRINT-PLAN.md §"Fixes" spells them so) -- reject the snake_case guess
 * (review round 1, C-1b: a silently-empty file-set from a wrong-cased key
 * was how the accumulator gates got fooled). scripts/compile-workbooks.mjs's
 * `rejectWrongCasing` independently confirms the ai_policy-family list and
 * enforces it at compile time; this rule catches the same defect one layer
 * earlier, at `lab validate` time, against the raw parsed frontmatter/YAML
 * (before any compiler has run).
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "snake-case-authoring-keys"

const TICKET_WRONG_TO_RIGHT: ReadonlyArray<readonly [string, string]> = [
  ["aiPolicy", "ai_policy"],
  ["aiPolicyReason", "ai_policy_reason"],
]

const AUTHOR_BRIEF_WRONG_TO_RIGHT: ReadonlyArray<readonly [string, string]> = [
  ["concessionTriggers", "concession_triggers"],
]

/** R17: these are camelCase in the spec, so the snake_case spelling is what's wrong here. */
const SPRINT_WRONG_TO_RIGHT: ReadonlyArray<readonly [string, string]> = [
  ["files_touched", "filesTouched"],
  ["new_source_files", "newSourceFiles"],
  ["rewritten_files", "rewrittenFiles"],
]

function pushIfPresent(
  findings: ValidationFinding[],
  raw: Record<string, unknown>,
  pairs: ReadonlyArray<readonly [string, string]>,
  context: { ticketKey?: string; path: string }
): void {
  for (const [wrong, right] of pairs) {
    if (Object.prototype.hasOwnProperty.call(raw, wrong)) {
      findings.push({
        ruleId: RULE_ID,
        severity: "error",
        ticketKey: context.ticketKey,
        path: context.path,
        message: `${context.ticketKey ? `ticket ${context.ticketKey}'s ` : ""}${context.path} uses "${wrong}"; the authored key is "${right}" (ruling R17)`,
      })
    }
  }
}

export function snakeCaseAuthoringKeys(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    pushIfPresent(findings, sprint.raw, SPRINT_WRONG_TO_RIGHT, { path: "sprint.yaml" })

    for (const ticket of sprint.tickets) {
      pushIfPresent(findings, ticket.frontmatterRaw, TICKET_WRONG_TO_RIGHT, {
        ticketKey: ticket.key,
        path: "ticket.md",
      })
      if (ticket.authorBriefRaw) {
        pushIfPresent(findings, ticket.authorBriefRaw, AUTHOR_BRIEF_WRONG_TO_RIGHT, {
          ticketKey: ticket.key,
          path: "author_brief.yaml",
        })
      }
    }
  }

  return findings
}
