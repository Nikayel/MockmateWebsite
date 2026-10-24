/** Tolerant readers for historical Firestore documents at the admin boundary. */
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

export function count(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function timestamp(value: unknown): string | null {
  const raw = record(value)
  const date =
    value instanceof Date ? value : typeof raw.toDate === "function" ? raw.toDate() : value
  if (typeof date !== "string" && !(date instanceof Date)) return null
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
