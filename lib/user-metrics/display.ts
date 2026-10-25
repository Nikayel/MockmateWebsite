export function formatMetricScore(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)}%`
}
