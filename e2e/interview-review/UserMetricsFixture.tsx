import { useEffect, useState } from "react"
import { MetricsOverview } from "@/components/dashboard/MetricsOverview"
import { BugfixMetricsCard } from "@/components/dashboard/BugfixMetricsCard"
import type { UserMetricsData } from "@/lib/user-metrics/service"
import { formatMetricScore } from "@/lib/user-metrics/display"

/** Real dashboard cards sharing one HTTP response, as on the dashboard page. */
export function UserMetricsFixture() {
  const [data, setData] = useState<UserMetricsData | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/user/metrics?days=7", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable")
        const body = await response.json()
        if (!controller.signal.aborted) {
          setData(body.data)
          setError(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setData(null)
          setError(true)
        }
      })
    return () => controller.abort()
  }, [attempt])
  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-2">
      <div>
        <p>Recent interview average: {formatMetricScore(data?.recentAverage)}</p>
        <BugfixMetricsCard metrics={data} error={error} />
      </div>
      <MetricsOverview data={data} error={error} onRetry={() => setAttempt((n) => n + 1)} />
    </div>
  )
}
