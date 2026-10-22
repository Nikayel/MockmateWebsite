import { parseGuidedLabProgress } from "@/lib/bugfix/guided-lab/persistence"
import { z } from "zod"
import { EDITOR_LANGUAGES } from "@/lib/interview/languages"
import type { getSessionState } from "@/lib/firestore-helpers"

const message = z.object({
  type: z.enum(["ai", "user"]),
  message: z.string(),
  id: z.string().optional(),
  timestamp: z.number().optional(),
  sequence: z.number().optional(),
  phase: z.literal("post_interview").optional(),
})
const checkpoint = z.object({
  sessionId: z.string(),
  ownerId: z.string().optional(),
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
  guidedLabProgress: z.unknown().transform(parseGuidedLabProgress).optional(),
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

/** The same stored checkpoint contract is used by authenticated and guest recovery. */
export function normalizeStoredCheckpoint(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const stored = raw as Record<string, unknown>
  const parsed = checkpoint.omit({ sessionId: true, timestamp: true }).partial().safeParse({
    code: stored.code,
    selectedLanguage: stored.language,
    elapsedTime: stored.elapsed_time,
    chatMessages: stored.chat_messages,
    interviewerMessages: stored.interviewer_messages,
    workspaceContext: stored.workspace_context,
    activeWorkspacePath: stored.active_workspace_path,
    testResults: stored.test_results,
    testSummary: stored.test_summary,
    consoleLogs: stored.console_logs,
    bugfixEvidenceEvents: stored.bugfix_evidence_events,
    guidedLabProgress: stored.guided_lab_progress,
    isPostInterviewDiscussion: stored.is_post_interview_discussion,
    paused: stored.paused,
    interviewerInput: stored.interviewer_input,
    chatInput: stored.chat_input,
    testRunRevision: stored.test_run_revision,
    realInterviewMode: stored.real_interview_mode,
    strictTimeLimit: stored.strict_time_limit,
    strictDeadlineAt: stored.strict_deadline_at,
  })
  if (!parsed.success) return null
  const { selectedLanguage, ...state } = parsed.data
  return {
    ...state,
    language: selectedLanguage,
    savedAt: typeof stored.saved_at === "string" ? stored.saved_at : undefined,
  }
}

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
      (remote?.ownerId && local.ownerId && remote.ownerId !== local.ownerId) ||
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
