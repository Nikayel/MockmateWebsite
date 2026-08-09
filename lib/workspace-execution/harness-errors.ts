/**
 * Recognises failures that belong to the test harness rather than to the candidate.
 *
 * When the sandbox's assert shim was missing `deepEqual`, every test in three debugging
 * scenarios threw "assert.deepEqual is not a function". The console read that as a Type
 * Error and advised the candidate to "verify variable types and function signatures", and
 * the interviewer opened with "I see there's an error in your code". The candidate said the
 * tests looked broken, which was correct, and the interviewer pushed back.
 *
 * A candidate cannot cause any of these. They can only come from the platform, so both the
 * console and the interviewer read this one predicate rather than pattern-matching
 * separately and disagreeing.
 */

/**
 * Deliberately narrow. Claiming a genuine bug in the candidate's code is the platform's
 * fault wastes their interview just as badly as the reverse, so every pattern here names a
 * piece of harness machinery the candidate's code cannot reach.
 */
const HARNESS_ERROR_PATTERNS: RegExp[] = [
  // A method missing from the injected assert module. `assert` is supplied by the sandbox;
  // the candidate never defines it, so a missing member is always ours.
  /\bassert(?:\.\w+)? is not a function\b/i,
  // importScripts could not load the shim, so the factory never reached the worker scope.
  /createassertshim/i,
  /failed to execute 'importscripts'/i,
  // The sandbox could not resolve its own assert module.
  /module not found:\s*(?:node:)?assert\b/i,
  // The worker's results channel never delivered a parseable payload.
  /__workspace_test_results__/i,
  /test runner did not report any test results/i,
  // The scenario asked for a runner that does not exist.
  /workspace runner not found/i,
]

/**
 * Deliberately NOT a rule here: "every failing test reported the same error". It reads like
 * a strong harness signal and is not one. A candidate whose function throws on any input
 * produces an identical error for every case, which is the single most common way to fail a
 * debugging scenario. Treating that as our fault would tell people their broken code was
 * fine.
 */

/**
 * True when the failure is the platform's, not the candidate's.
 *
 * Note this is distinct from `isExecutionServiceError` in lib/piston.ts, which means "the
 * runner is unreachable, try again later". A harness error means the runner ran fine and
 * the scaffolding around the candidate's code is what broke, so retrying changes nothing.
 */
export function isHarnessError(errorMessage: string | null | undefined): boolean {
  if (!errorMessage || typeof errorMessage !== "string") return false
  return HARNESS_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))
}

/**
 * What the candidate is told when the harness breaks. It has to do two things: make clear
 * the failure is not theirs so they stop debugging correct code, and stop them waiting for
 * a retry that cannot help.
 */
export const HARNESS_ERROR_NOTICE =
  "This is a fault in our test harness, not in your code. Your solution has not been " +
  "judged. Please tell us about it so we can fix it, and try a different problem in the " +
  "meantime."
