import type { Dispatch, MutableRefObject, SetStateAction } from "react"
import { toast } from "sonner"
// Used only by the deprecated `/api/execute` fallback below (kept commented for reference):
// import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { isExecutionServiceError } from "@/lib/piston"
import { executeScenarioInBrowser } from "@/lib/workspace-execution"
import { HARNESS_ERROR_NOTICE, isHarnessError } from "@/lib/workspace-execution/harness-errors"
import type { Scenario } from "@/lib/scenarios"
import { isWorkspaceScenario } from "../_utils/workspace"
import type {
  ChatMessage,
  ConsoleLogEntry,
  EditorLanguage,
  TestResult,
  WorkspaceContextFile,
} from "../_types"

export interface ExecutionResult {
  ok: boolean
  status: number
  data: any
}

export interface ExecuteScenarioParams {
  selectedScenario: Scenario | null
  code: string
  selectedLanguage: EditorLanguage
  workspaceContext: WorkspaceContextFile[]
}

/**
 * Run the current scenario entirely in the in-browser sandbox (`executeScenarioInBrowser`:
 * Pyodide for Python, a JS/TS sandbox). The server-side `POST /api/execute` (Piston) fallback is
 * DEPRECATED and no longer wired (see `lib/piston.ts`); the client runners cover every supported
 * language, so an unsupported language now returns a 400 instead of hitting the server.
 */
export async function executeScenario({
  selectedScenario,
  code,
  selectedLanguage,
  workspaceContext,
}: ExecuteScenarioParams): Promise<ExecutionResult> {
  if (!selectedScenario) {
    return { ok: false, status: 400, data: { error: "No scenario selected" } }
  }

  const workspaceFiles = isWorkspaceScenario(selectedScenario)
    ? workspaceContext
        .filter((file) => file.role === "editable")
        .map((file) => ({ path: file.path, content: file.content }))
    : undefined

  const browserResult = await executeScenarioInBrowser({
    code,
    scenario: selectedScenario,
    language: isWorkspaceScenario(selectedScenario)
      ? selectedScenario.workspace.language
      : selectedLanguage,
    workspaceFiles,
  })

  if (browserResult) {
    return { ok: !browserResult.error, status: 200, data: browserResult }
  }

  // The client-side runners cover every supported language (JavaScript, TypeScript, Python). A
  // null result means an unsupported language, so there is nothing useful to fall back to.
  //
  // DEPRECATED: the server-side `POST /api/execute` (Piston) fallback is retained for reference
  // only and is no longer wired — see the Piston deprecation note in `lib/piston.ts`.
  //
  // const token = await getCurrentUserToken()
  // const headers: Record<string, string> = { "Content-Type": "application/json" }
  // if (token) headers.Authorization = `Bearer ${token}`
  // const response = await fetch("/api/execute", {
  //   method: "POST",
  //   headers,
  //   body: JSON.stringify({
  //     code,
  //     scenarioId: selectedScenario.id,
  //     language: isWorkspaceScenario(selectedScenario)
  //       ? selectedScenario.workspace.language
  //       : selectedLanguage,
  //     workspaceFiles,
  //   }),
  // })
  // return { ok: response.ok, status: response.status, data: await response.json() }

  return {
    ok: false,
    status: 400,
    data: {
      error: "Unsupported execution language. Supported languages: JavaScript, TypeScript, Python.",
    },
  }
}

/** Why did every test in a run fail? */
export type FailedRunCause =
  /** The runner never ran. Retrying later may work. */
  | "service-down"
  /** Our test scaffolding broke. Nothing the candidate writes can fix it. */
  | "harness"
  /** Their code does not parse. */
  | "syntax"
  /** Their code ran and was wrong, or threw. */
  | "code-error"

const SYNTAX_ERROR_MARKERS = [
  "SyntaxError",
  "Compilation error",
  "Unexpected token",
  "unexpected token",
  "Parse error",
  "IndentationError",
  "invalid syntax",
]

/**
 * Classify a run in which every test failed, so `runCode` and `submitCode` agree about
 * whose fault it was. They previously each inlined their own service-down check and their
 * own copy of the syntax-marker list, and neither had any notion of a harness fault: a
 * missing `assert.deepEqual` in our own sandbox was reported to the candidate as "an error
 * in your code", and they were told to fix it before submitting.
 *
 * Order matters. `service-down` and `harness` both have to be settled before anything is
 * blamed on the candidate.
 */
export function classifyFailedRun(firstError: string | null | undefined): FailedRunCause {
  if (isExecutionServiceError(firstError)) return "service-down"
  if (isHarnessError(firstError)) return "harness"
  if (firstError && SYNTAX_ERROR_MARKERS.some((marker) => firstError.includes(marker))) {
    return "syntax"
  }
  return "code-error"
}

/**
 * Say something about a failed run at most once per distinct failure.
 *
 * This replaces a `prev.slice(-2)` scan of the transcript, which asked "did I already say
 * this in the last two messages" and so was defeated by any two intervening messages. The
 * proactive silence poll supplied exactly that: run fails, we speak, two nudges land over
 * the next five minutes, the candidate runs again, and the same canned line is repeated as
 * though nothing had been said. That is what a candidate saw twice without ever typing.
 *
 * Keyed on the error text, so a candidate who changes their code and hits a genuinely
 * different error still hears about it, and one who reruns the same broken code does not.
 */
export function announceRunFailure(
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  announcedFailureRef: MutableRefObject<string | null>,
  failureSignature: string | null | undefined,
  message: string
): void {
  const signature = failureSignature ?? "unknown"
  if (announcedFailureRef.current === signature) return
  announcedFailureRef.current = signature
  setInterviewerMessages((prev) => [...prev, { type: "ai", message }])
}

export interface ApiErrorContext {
  setConsoleLogs: Dispatch<SetStateAction<ConsoleLogEntry[]>>
  setTestResults: Dispatch<SetStateAction<TestResult[]>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setIsRunningTests: Dispatch<SetStateAction<boolean>>
  playSound: (type: "hint" | "success" | "fail" | "milestone") => void
  announcedFailureRef: MutableRefObject<string | null>
}

/**
 * Handle a failed execution call (scenario not found, timeout, service down, harness
 * fault). Identical in both `runCode` and `submitCode`: writes the console + test-result
 * error, either speaks to the candidate or toasts, plays the fail sound, and clears the
 * running flag. Callers `return` immediately after.
 *
 * This used to split the world in two: service down, or the candidate's fault. Everything
 * the browser sandbox itself could fail at — a missing workspace runner, a results channel
 * that never reported — landed in the second bucket and was answered with "check that your
 * function name matches what the problem expects", which is advice about code the candidate
 * had written correctly.
 */
export function applyExecutionApiError(execution: ExecutionResult, ctx: ApiErrorContext) {
  const errorMessage = execution.data.error || `Server error (${execution.status})`
  const cause = classifyFailedRun(errorMessage)
  const isPlatformFault = cause === "service-down" || cause === "harness"

  const consoleMessage =
    cause === "service-down"
      ? "❌ Code execution service is temporarily unavailable. Please try again in a few minutes."
      : cause === "harness"
        ? `❌ ${HARNESS_ERROR_NOTICE}`
        : `❌ Execution Error: ${errorMessage}`

  ctx.setConsoleLogs([{ type: "error", message: consoleMessage, timestamp: Date.now() }])
  ctx.setTestResults([
    {
      description: "Execution Error",
      passed: false,
      error:
        cause === "service-down"
          ? "Code execution service is temporarily unavailable. Please try again in a few minutes."
          : errorMessage,
      input: "",
      expected: "",
      actual: "",
    },
  ])

  if (cause === "service-down") {
    toast.error("Code execution unavailable", {
      description: "Our code runner is temporarily unavailable. Please try again in a few minutes.",
      duration: 8000,
    })
  } else if (cause === "harness") {
    toast.error("This one is on us", { description: HARNESS_ERROR_NOTICE, duration: 12000 })
    announceRunFailure(
      ctx.setInterviewerMessages,
      ctx.announcedFailureRef,
      errorMessage,
      "That failure is coming from our own tooling, not from your code. Nothing you write " +
        "will make it pass, so please do not spend the interview on it. Try another problem " +
        "and let us know this happened."
    )
  } else {
    announceRunFailure(
      ctx.setInterviewerMessages,
      ctx.announcedFailureRef,
      errorMessage,
      `There was a problem running your code: ${errorMessage}. Check that your function name ` +
        `matches what the problem expects, and try again.`
    )
  }

  // No failure sound when the platform is what broke. The candidate did not fail.
  if (!isPlatformFault) {
    ctx.playSound("fail")
  }
  ctx.setIsRunningTests(false)
}
