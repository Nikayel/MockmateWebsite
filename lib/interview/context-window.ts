import { truncateFileContent, truncateText } from "@/lib/utils"

// Conversation history is NOT capped by message count. GPT-5.6 Luna, which is
// first in FALLBACK_ORDER for every task class, has a 1,050,000-token context
// window; a long interview is 20-30K tokens, so the cap never bought headroom
// we needed and it cost us correctness.
//
// It cost us on 2026-08-22. A 43-message session dropped its first 13 messages,
// so by the time the interviewer had probed the same thread seven times it
// could no longer see that it had already probed it once. That reads as an
// interviewer ignoring its own two-probe rule. It was amnesia, and no amount of
// prompt instruction fixes a message the model was never shown.
//
// Per-message truncation stays: one pasted 50KB blob should not be able to
// dominate a turn. That is a shape guard, not a memory limit.
//
// Two cost notes if this is ever revisited. Cached input is 10x cheaper than
// fresh ($0.02 vs $0.20 per 1M), and an append-only history is the ideal cache
// shape because each turn's prefix is byte-identical to the last, so growing
// history is close to free as long as nothing volatile is injected AHEAD of it.
// And there is a cliff at 272K input tokens, where the whole request reprices at
// 2x input and 1.5x output. An interview is an order of magnitude below that.
export const MAX_MESSAGE_LENGTH = 4000
export const MAX_WORKSPACE_FILES = 5
export const MAX_FILE_SIZE = 10000

export interface WorkspaceContextItem {
  path: string
  content: string
  role?: string
  description?: string
  hidden?: boolean
  active?: boolean
  edited?: boolean
}

/**
 * Prepare the full conversation history for the model.
 *
 * Every message is kept, in order. Only the length of an individual message is
 * bounded. This used to be a sliding window that dropped the middle of the
 * conversation and replaced it with a "[Previous N messages summarized]" marker
 * that summarized nothing - the dropped turns were simply gone, and the marker
 * made their absence look intentional in the transcript.
 */
export function manageContextWindow(
  context: Array<{ type: string; message: string }>
): Array<{ type: string; message: string }> {
  if (!context || !Array.isArray(context)) return []

  return context.map((msg) => ({
    ...msg,
    message: truncateText(msg.message, MAX_MESSAGE_LENGTH),
  }))
}

/**
 * Limit workspace context before adding it to the model prompt.
 */
export function manageWorkspaceContext(
  workspaceContext: WorkspaceContextItem[],
  maxFiles: number = MAX_WORKSPACE_FILES,
  maxFileSize: number = MAX_FILE_SIZE
): WorkspaceContextItem[] {
  if (!workspaceContext || !Array.isArray(workspaceContext)) return []

  const rolePriority: Record<string, number> = {
    editable: 30,
    test: 20,
    docs: 15,
    readonly: 10,
  }

  return workspaceContext
    .filter((file) => !file.hidden)
    .map((file, index) => ({ file, index }))
    .sort((a, b) => {
      const aPriority =
        (a.file.active ? 100 : 0) +
        (a.file.edited ? 50 : 0) +
        (rolePriority[a.file.role || ""] || 0)
      const bPriority =
        (b.file.active ? 100 : 0) +
        (b.file.edited ? 50 : 0) +
        (rolePriority[b.file.role || ""] || 0)

      return bPriority - aPriority || a.index - b.index
    })
    .slice(0, maxFiles)
    .map(({ file }) => ({
      ...file,
      content: truncateFileContent(file.content, maxFileSize),
    }))
}
