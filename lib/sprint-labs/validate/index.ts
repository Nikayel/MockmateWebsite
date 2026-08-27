/**
 * `lab validate` — composition root for the static gates (PLAN.md Task 3).
 *
 * `VALIDATION_RULES` is every pure rule function from `rules/*`, in no
 * particular order (each is independent; findings carry their own
 * `ruleId`). `validateWorkbook` loads nothing itself -- it takes an
 * already-parsed `AuthoredWorkbook` tree-snapshot and runs every rule
 * against it, which is what makes each rule (and this composition) testable
 * without touching the filesystem. `scripts/lab-validate.mjs` is the only
 * caller that combines this with `loadWorkbookTree`.
 */

import type { AuthoredWorkbook } from "./tree"
import type { ValidationFinding, ValidationRule } from "./types"

import { migrationFilenamesUniqueGapless } from "./rules/migration-filenames-unique-gapless"
import { filesTouchedExist } from "./rules/files-touched-exist"
import { newSourceFilesSetDifference } from "./rules/new-source-files-set-difference"
import { ticketHasObjective } from "./rules/ticket-has-objective"
import { objectiveTagVocabulary } from "./rules/objective-tag-vocabulary"
import { aiPolicyReasonRequired } from "./rules/ai-policy-reason-required"
import { payoffRequiresSignoff } from "./rules/payoff-requires-signoff"
import { prNumbersMonotonic } from "./rules/pr-numbers-monotonic"
import { oneNamePerFile } from "./rules/one-name-per-file"
import { hiddenTestsHaveHumanName } from "./rules/hidden-tests-have-human-name"
import { scoreFeedingTicketHasIoCase } from "./rules/score-feeding-ticket-has-io-case"
import { noEmDashInProse } from "./rules/no-em-dash-in-prose"
import { noFilePathEnumeration } from "./rules/no-file-path-enumeration"
import { noDuplicatedHunkFromUnshippedReference } from "./rules/no-duplicated-hunk-from-unshipped-reference"
import { snakeCaseAuthoringKeys } from "./rules/snake-case-authoring-keys"

export const VALIDATION_RULES: ValidationRule[] = [
  migrationFilenamesUniqueGapless,
  filesTouchedExist,
  newSourceFilesSetDifference,
  ticketHasObjective,
  objectiveTagVocabulary,
  aiPolicyReasonRequired,
  payoffRequiresSignoff,
  prNumbersMonotonic,
  oneNamePerFile,
  hiddenTestsHaveHumanName,
  scoreFeedingTicketHasIoCase,
  noEmDashInProse,
  noFilePathEnumeration,
  noDuplicatedHunkFromUnshippedReference,
  snakeCaseAuthoringKeys,
]

export function validateWorkbook(workbook: AuthoredWorkbook): ValidationFinding[] {
  return VALIDATION_RULES.flatMap((rule) => rule(workbook))
}

export { loadWorkbookTree } from "./load-tree"
export type { AuthoredWorkbook } from "./tree"
export type { FindingSeverity, ValidationFinding, ValidationRule } from "./types"
