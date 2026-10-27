/** Correlates a test result with its source without persisting extra source snapshots. */
export async function executionSourceRevision(
  code: string,
  files: ReadonlyArray<{ path: string; content: string; role?: string }> = []
): Promise<string | undefined> {
  if (typeof crypto === "undefined" || !crypto.subtle) return undefined
  const editable = files
    .filter((file) => file.role === "editable")
    .map(({ path, content }) => ({ path, content }))
    .sort((a, b) => a.path.localeCompare(b.path))
  const bytes = new TextEncoder().encode(JSON.stringify(editable.length ? editable : code))
  try {
    const digest = await crypto.subtle.digest("SHA-256", bytes)
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
  } catch {
    // Correlation is optional telemetry; it must never prevent practice.
    return undefined
  }
}
