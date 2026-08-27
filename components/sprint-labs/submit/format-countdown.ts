/** Formats whole seconds as `m:ss` for the cooldown countdown (UX-SPEC.md §8: "Next submission in 11:42"). */
export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
