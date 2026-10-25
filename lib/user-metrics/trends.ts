import type { MetricsSnapshot } from "./types"

export function metricTrends(snapshot: MetricsSnapshot, days: number, now = Date.now()) {
  const firstDay = new Date(now - (days - 1) * 86400000).toISOString().slice(0, 10)
  const daily = snapshot.daily.filter((day) => day.date >= firstDay)
  let trend: "improving" | "stable" | "declining" = "stable"
  if (daily.length >= 4) {
    const midpoint = Math.floor(daily.length / 2)
    const weighted = (rows: typeof daily) =>
      rows.reduce((sum, row) => sum + row.score * row.sessions, 0) /
      rows.reduce((sum, row) => sum + row.sessions, 0)
    const change = weighted(daily.slice(midpoint)) - weighted(daily.slice(0, midpoint))
    if (change > 5) trend = "improving"
    if (change < -5) trend = "declining"
  }
  const descriptions = {
    improving: "Your interview scores have increased across this period.",
    declining: "Your interview scores have decreased across this period.",
    stable: "Your interview scores are steady across this period.",
  }
  return {
    daily,
    weeklyAverage: snapshot.weeklyAverage,
    trend,
    trendDescription:
      daily.length < 4 ? "Complete interviews on more days to see a trend." : descriptions[trend],
  }
}
