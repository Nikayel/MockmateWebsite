/**
 * Logs a message to the console, with an optional data object. No request id, tenant id, or
 * claim id is attached automatically.
 */
export function log(message: string, data?: Record<string, unknown>): void {
  if (data) {
    console.log(`[meridian] ${message}`, data)
  } else {
    console.log(`[meridian] ${message}`)
  }
}
