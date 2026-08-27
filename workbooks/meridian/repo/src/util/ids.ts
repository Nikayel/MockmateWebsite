/**
 * Not cryptographically random - just unique enough for a claim id or a delivery id in this
 * in-memory seed. `prefix` makes ids readable in logs, e.g. `clm_lk3f9a2b`.
 */
export function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}${random}`
}
