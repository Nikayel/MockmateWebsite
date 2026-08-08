/**
 * The window descriptor every admin metric block ships with.
 *
 * The rule this enforces: a number never renders without saying what span it
 * covers. Both the funnel and the revenue route were building the same object
 * by hand, and the pages were re-deriving the label from the raw range string,
 * which is how "All" ended up labelled as a week.
 */

/** What a metric block covers, ready to render. */
export interface MetricWindow {
  timeRange: string
  /** Human-readable, for example "last 30 days". */
  label: string
  /** Null on the all-time range, which has no floor. */
  startDate: string | null
  endDate: string
}

/** Human-readable window label, so a metric never renders without its scope. */
export function describeWindow(timeRange: string): string {
  switch (timeRange) {
    case "7d":
      return "last 7 days"
    case "30d":
      return "last 30 days"
    case "90d":
      return "last 90 days"
    default:
      return "all time"
  }
}

/** Build the descriptor a route attaches to a windowed block of metrics. */
export function buildMetricWindow(
  timeRange: string,
  startDate: Date | null,
  endDate: Date
): MetricWindow {
  return {
    timeRange,
    label: describeWindow(timeRange),
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate.toISOString(),
  }
}
