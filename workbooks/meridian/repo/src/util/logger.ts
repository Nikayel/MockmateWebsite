/**
 * Whatever you pass in gets stringified and printed. No request id, no tenant id, no claim
 * id unless you remembered to put it in `message` yourself.
 */
export function log(message: string, data?: Record<string, unknown>): void {
  if (data) {
    console.log(`[meridian] ${message}`, data)
  } else {
    console.log(`[meridian] ${message}`)
  }
}
