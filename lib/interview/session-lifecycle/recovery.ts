import { z } from "zod"
import { EDITOR_LANGUAGES } from "@/lib/interview/languages"
import type { getSessionState } from "@/lib/firestore-helpers"

const message = z.object({
  type: z.enum(["ai", "user"]),
  message: z.string(),
  id: z.string().optional(),
  timestamp: z.number().optional(),
  sequence: z.number().optional(),
})
const checkpoint = z.object({
  sessionId: z.string(),
  timestamp: z.number(),
  code: z.string(),
  selectedLanguage: z.enum(EDITOR_LANGUAGES),
  elapsedTime: z.number().nonnegative(),
  chatMessages: z.array(message),
  interviewerMessages: z.array(message),
  workspaceContext: z.array(z.record(z.unknown())).optional(),
  activeWorkspacePath: z.string().nullable().optional(),
  testResults: z.array(z.record(z.unknown())).optional(),
  testSummary: z
    .object({ total: z.number(), passed: z.number(), failed: z.number(), passRate: z.number() })
    .optional(),
  consoleLogs: z.array(z.record(z.unknown())).optional(),
  bugfixEvidenceEvents: z.array(z.record(z.unknown())).optional(),
  isPostInterviewDiscussion: z.boolean().optional(),
  strictDeadlineAt: z.number().nullable().optional(),
  paused: z.boolean().optional(),
  interviewerInput: z.string().optional(),
  chatInput: z.string().optional(),
  testRunRevision: z.string().nullable().optional(),
  realInterviewMode: z.boolean().optional(),
  strictTimeLimit: z.number().nullable().optional(),
})
type SavedState = NonNullable<Awaited<ReturnType<typeof getSessionState>>>

export function localCheckpointSessionId(storageKey: string): string | null {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = checkpoint.safeParse(raw ? JSON.parse(raw) : null)
    return parsed.success && Date.now() - parsed.data.timestamp < 24 * 60 * 60 * 1000
      ? parsed.data.sessionId
      : null
  } catch {
    return null
  }
}

/** Only recover a newer snapshot belonging to this exact attempt. Terminal cloud state wins. */
export function recoverLocalCheckpoint(
  remote: SavedState | null,
  storageKey: string,
  sessionId: string
): SavedState | null {
  if (remote?.completedAt || remote?.feedbackStatus === "pending") return remote
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = checkpoint.safeParse(raw ? JSON.parse(raw) : null)
    if (!parsed.success) return remote
    const local = parsed.data
    if (
      local.sessionId !== sessionId ||
      Date.now() - local.timestamp > 24 * 60 * 60 * 1000 ||
      local.timestamp <= new Date(remote?.savedAt ?? 0).getTime()
    )
      return remote
    return {
      ...remote,
      ...local,
      language: local.selectedLanguage,
      savedAt: new Date(local.timestamp).toISOString(),
    }
  } catch {
    return remote
  }
}
