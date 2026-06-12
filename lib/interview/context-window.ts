import { truncateFileContent, truncateText } from "@/lib/utils"

// Full context: Modern LLMs have large context windows (Gemini 1M, Claude 200K, DeepSeek 64K).
// Most interviews have 30-60 messages, so this keeps useful history with a latency safety cap.
export const MAX_HISTORY_MESSAGES = 30
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
 * Sliding window for conversation history.
 * Keeps most recent messages, summarizes old ones if needed.
 */
export function manageContextWindow(
  context: Array<{ type: string; message: string }>,
  maxMessages: number = MAX_HISTORY_MESSAGES
): Array<{ type: string; message: string }> {
  if (!context || !Array.isArray(context)) return []

  if (context.length <= maxMessages) {
    return context.map((msg) => ({
      ...msg,
      message: truncateText(msg.message, MAX_MESSAGE_LENGTH),
    }))
  }

  const firstMessage = context[0]
  const recentMessages = context.slice(-(maxMessages - 1))
  const droppedCount = context.length - maxMessages
  const summaryMessage = {
    type: "model",
    message: `[Previous ${droppedCount} messages summarized for context management]`,
  }

  return [
    {
      ...firstMessage,
      message: truncateText(firstMessage.message, MAX_MESSAGE_LENGTH),
    },
    summaryMessage,
    ...recentMessages.map((msg) => ({
      ...msg,
      message: truncateText(msg.message, MAX_MESSAGE_LENGTH),
    })),
  ]
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
