/**
 * Structural deep-equal for comparing a client-posted io-case output against
 * the sealed `expected` value (the server-side comparison D1 depends on —
 * docs/sprint-labs/EXECUTION-STATE.md). Inputs are always JSON-compatible:
 * io-cases are authored as YAML data (WORKBOOK-SPEC.md §6), so this never
 * needs to handle functions, symbols, `Date`, or circular references.
 *
 * Array vs plain-object is a hard mismatch even when their enumerable
 * contents look alike (`[1,2]` is never equal to `{0:1,1:2}`) — an
 * io-case's `expected` shape is authored once and should never accidentally
 * "pass" against a structurally different value.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false
  }

  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  if (aIsArray !== bIsArray) return false

  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }

  const aRecord = a as Record<string, unknown>
  const bRecord = b as Record<string, unknown>
  const aKeys = Object.keys(aRecord)
  const bKeys = Object.keys(bRecord)
  if (aKeys.length !== bKeys.length) return false

  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(bRecord, key) && deepEqual(aRecord[key], bRecord[key])
  )
}
