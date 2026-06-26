import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"
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
 * Run the current scenario: the in-browser sandbox first, falling back to
 * `POST /api/execute`. The request body is byte-identical to the prior inline
 * `executeCurrentScenario`: `{ code, scenarioId, language, workspaceFiles }`.
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

  const response = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      scenarioId: selectedScenario.id,
      language: isWorkspaceScenario(selectedScenario)
        ? selectedScenario.workspace.language
        : selectedLanguage,
      workspaceFiles,
    }),
  })

  return { ok: response.ok, status: response.status, data: await response.json() }
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
