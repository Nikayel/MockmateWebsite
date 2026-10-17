import { truncateFileContent, truncateText } from "@/lib/utils"

// Explicit request-size validation owns the outer bound. Keep all accepted public context.
export const MAX_MESSAGE_LENGTH = 4000
export const MAX_WORKSPACE_FILES = 100
export const MAX_FILE_SIZE = 100000

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
