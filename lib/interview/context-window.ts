import { truncateFileContent, truncateText } from "@/lib/utils"

// Full context: Modern LLMs have large context windows (Gemini 1M, Claude 200K, DeepSeek 64K).
// Most interviews have 30-60 messages, so this keeps useful history with a latency safety cap.
export const MAX_HISTORY_MESSAGES = 30
export const MAX_MESSAGE_LENGTH = 4000
export const MAX_WORKSPACE_FILES = 5
export const MAX_FILE_SIZE = 10000

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
  workspaceContext: Array<{ path: string; content: string }>,
  maxFiles: number = MAX_WORKSPACE_FILES,
  maxFileSize: number = MAX_FILE_SIZE
): Array<{ path: string; content: string }> {
  if (!workspaceContext || !Array.isArray(workspaceContext)) return []

  return workspaceContext.slice(0, maxFiles).map((file) => ({
    path: file.path,
    content: truncateFileContent(file.content, maxFileSize),
  }))
}
