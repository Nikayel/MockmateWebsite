/**
 * Human-readable duration for Learn active-time milliseconds, shared by the admin
 * learn-usage page and the user-profile drawer so the two never round differently.
 * Sub-minute amounts render as seconds because early accounts will mostly hold dust,
 * and "0m" for a real 40-second visit reads as a bug.
 */
export function formatLearnDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 1000) return "0s"
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}
