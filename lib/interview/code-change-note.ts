/**
 * "The candidate edited the code since their last message" annotation.
 *
 * Every chat turn re-sends the full current code, but past turns carry only chat
 * text, so the model cannot tell whether the code changed between messages. In a
 * real session that read as confusion: a candidate applied the fix being
 * discussed, and the AI could only guess ("you may have already applied the
 * fix") instead of acknowledging the edit and pointing them at Run Tests.
 *
 * The note rides the outgoing `message` string (the same carrier as the
 * post-interview bracketed context in useInterviewChat), so the transcript, the
 * request schema, and the payload contract stay untouched: it reaches the model
 * once, is never rendered, and is never replayed as history.
 */

export interface ChatCodeSnapshot {
  /** The active editor buffer (the only code single-file scenarios have). */
  code: string
  /** Workspace file contents by path; empty for single-file scenarios. */
  files: Record<string, string>
}

const MAX_LISTED_FILES = 5

/** Narrow the untyped workspace context the chat hook holds into a snapshot. */
export function snapshotChatCode(
  code: string | undefined,
  workspaceContext: unknown
): ChatCodeSnapshot {
  const files: Record<string, string> = {}
  if (Array.isArray(workspaceContext)) {
    for (const file of workspaceContext) {
      if (
        file &&
        typeof file === "object" &&
        typeof (file as { path?: unknown }).path === "string" &&
        typeof (file as { content?: unknown }).content === "string"
      ) {
        files[(file as { path: string }).path] = (file as { content: string }).content
      }
    }
  }
  return { code: code ?? "", files }
}

/**
 * A bracketed model-facing note describing what changed since the previous send
 * in this chat lane, or "" when there is no previous send or nothing changed.
 */
export function buildCodeChangeNote(
  previous: ChatCodeSnapshot | null | undefined,
  current: ChatCodeSnapshot
): string {
  if (!previous) {
    return ""
  }

  const paths = new Set([...Object.keys(previous.files), ...Object.keys(current.files)])
  const changedFiles = [...paths].filter((path) => previous.files[path] !== current.files[path])

  if (changedFiles.length > 0) {
    const listed = changedFiles.slice(0, MAX_LISTED_FILES).join(", ")
    const overflow =
      changedFiles.length > MAX_LISTED_FILES
        ? ` and ${changedFiles.length - MAX_LISTED_FILES} more`
        : ""
    return `\n\n[CODE UPDATE: The candidate edited the code since their last message in this chat (changed: ${listed}${overflow}). The codebase context below is the current state.]`
  }

  if (previous.code !== current.code) {
    return `\n\n[CODE UPDATE: The candidate edited their code since their last message in this chat. The current code below reflects the change.]`
  }

  return ""
}
