import { isExecutionServiceError } from "@/lib/piston"
import { isHarnessError } from "./harness-errors"

export type ExecutionFailureKind = "candidate" | "candidate-timeout" | "service" | "harness"

export interface ExecutionTestObservation {
  sourceRevision?: string
  passed?: boolean
  error?: string | null
  failureKind?: ExecutionFailureKind
}

/** Explicit runner classifications win; legacy messages are interpreted in one place. */
export function classifyExecutionFailure(
  test: ExecutionTestObservation
): ExecutionFailureKind | null {
  if (test.passed === true) return null
  if (
    test.failureKind &&
    ["candidate", "candidate-timeout", "service", "harness"].includes(test.failureKind)
  ) {
    return test.failureKind
  }
  if (isHarnessError(test.error)) return "harness"
  if (
    isExecutionServiceError(test.error) ||
    /service (?:is busy|unavailable)|worker (?:failed to initialize|crashed)|sandbox.*(?:initializ|load).*fail/i.test(
      test.error ?? ""
    )
  ) {
    return "service"
  }
  // A running program exceeding its budget is a candidate result, not an outage.
  if (/timed out|time limit exceeded/i.test(test.error ?? "")) return "candidate-timeout"
  return "candidate"
}

export function isScoreableTest(test: ExecutionTestObservation): boolean {
  const kind = classifyExecutionFailure(test)
  return kind !== "service" && kind !== "harness"
}

export function summarizeExecutionTests(tests: ExecutionTestObservation[]) {
  const scoreable = tests.filter(isScoreableTest)
  const passed = scoreable.filter((test) => test.passed === true).length
  return {
    total: tests.length,
    passed,
    failed: scoreable.length - passed,
    passRate: scoreable.length ? (passed / scoreable.length) * 100 : 0,
    serviceErrors: tests.length - scoreable.length,
    effectiveTotal: scoreable.length,
  }
}
