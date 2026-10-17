import { buildConversationTimeline } from "./conversation"
import type { SessionContext } from "./schema"

interface WorkspaceFile {
  path: string
  content: string
  originalContent?: string
  hidden?: boolean
  role?: string
}
type Message = Parameters<typeof buildConversationTimeline>[0][number]

/** A content identity for evidence comparison, not a security signature. */
export function contentRevision(value: unknown): string {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index++)
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619)
  return `v1-${(hash >>> 0).toString(16)}-${text.length}`
}

export function workspaceRevision(files: WorkspaceFile[], code: string): string {
  const visible = files
    .filter((file) => !file.hidden)
    .map(({ path, content }) => ({ path, content }))
    .sort((a, b) => a.path.localeCompare(b.path))
  return contentRevision(visible.length ? visible : code)
}

export function buildSessionContext(input: {
  task: SessionContext["task"]
  workspace: WorkspaceFile[]
  code: string
  starterCode?: string
  interviewerMessages: Message[]
  partnerMessages: Message[]
  testRunRevision?: string | null
}): SessionContext {
  const publicFiles = input.workspace.filter((file) => !file.hidden)
  const files: SessionContext["files"] = publicFiles.length
    ? publicFiles.map((file) => ({
        path: file.path,
        content: file.content,
        ...(file.role ? { role: file.role } : {}),
        ...(file.originalContent !== undefined ? { originalContent: file.originalContent } : {}),
        status:
          file.originalContent === undefined
            ? "baseline_unknown"
            : file.originalContent === file.content
              ? "unchanged"
              : "modified",
      }))
    : [
        {
          path: "solution",
          content: input.code,
          ...(input.starterCode !== undefined ? { originalContent: input.starterCode } : {}),
          status:
            input.starterCode === undefined
              ? "baseline_unknown"
              : input.code === input.starterCode
                ? "unchanged"
                : "modified",
        },
      ]
  const currentRevision = workspaceRevision(input.workspace, input.code)
  return {
    task: input.task,
    baselineVersion: contentRevision(
      files.map(({ path, originalContent }) => ({ path, originalContent: originalContent ?? null }))
    ),
    currentRevision,
    files,
    timeline: buildConversationTimeline(input.interviewerMessages, input.partnerMessages),
    testRunRevision: input.testRunRevision ?? null,
    testsMatchCurrentRevision: !!input.testRunRevision && input.testRunRevision === currentRevision,
  }
}
