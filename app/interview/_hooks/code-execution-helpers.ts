import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"
// Used only by the deprecated `/api/execute` fallback below (kept commented for reference):
// import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { isExecutionServiceError } from "@/lib/piston"
import { executeScenarioInBrowser } from "@/lib/workspace-execution"
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

export interface ApiErrorContext {
  setConsoleLogs: Dispatch<SetStateAction<ConsoleLogEntry[]>>
  setTestResults: Dispatch<SetStateAction<TestResult[]>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setIsRunningTests: Dispatch<SetStateAction<boolean>>
  playSound: (type: "hint" | "success" | "fail" | "milestone") => void
}

/**
 * Handle a failed `/api/execute` call (scenario not found, timeout, service
 * down, etc.). Identical in both `runCode` and `submitCode`: writes the console
 * + test-result error, either nudges the interviewer (transient error, deduped
 * against the last two messages) or toasts (service down), plays the fail sound,
 * and clears the running flag. Callers `return` immediately after.
 */
export function applyExecutionApiError(execution: ExecutionResult, ctx: ApiErrorContext) {
  const errorMessage = execution.data.error || `Server error (${execution.status})`
  const isServiceDown = isExecutionServiceError(errorMessage)

  ctx.setConsoleLogs([
    {
      type: "error",
      message: isServiceDown
        ? "❌ Code execution service is temporarily unavailable. Please try again in a few minutes."
        : `❌ Execution Error: ${errorMessage}`,
      timestamp: Date.now(),
    },
  ])
  ctx.setTestResults([
    {
      description: "Execution Error",
      passed: false,
      error: isServiceDown
        ? "Code execution service is temporarily unavailable. Please try again in a few minutes."
        : errorMessage,
      input: "",
      expected: "",
      actual: "",
    },
  ])

  if (!isServiceDown) {
    ctx.setInterviewerMessages((prev) => {
      const recentMessages = prev.slice(-2)
      const hasRecentErrorMsg = recentMessages.some(
        (msg) =>
          msg.type === "ai" &&
          (msg.message.includes("problem running your code") ||
            msg.message.includes("error in your code"))
      )
      if (hasRecentErrorMsg) return prev
      return [
        ...prev,
        {
          type: "ai",
          message: `There was a problem running your code: ${errorMessage}. Check that your function name matches what the problem expects, and try again.`,
        },
      ]
    })
  } else {
    toast.error("Code execution unavailable", {
      description: "Our code runner is temporarily unavailable. Please try again in a few minutes.",
      duration: 8000,
    })
  }

  ctx.playSound("fail")
  ctx.setIsRunningTests(false)
}
