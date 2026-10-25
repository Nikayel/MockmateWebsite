import Link from "next/link"
import { ShieldCheck, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatMetricScore } from "@/lib/user-metrics/display"
import type { CanonicalMetricsData } from "@/lib/user-metrics/response"

export function BugfixMetricsCard({
  metrics,
  error,
}: {
  metrics: CanonicalMetricsData | null
  error: boolean
}) {
  const bugfix = metrics?.bugfix
  const evidence = bugfix?.latest?.evidence
  const needsPractice =
    evidence &&
    (evidence.reproducedBeforeEditing === false ||
      (evidence.inspectedFiles !== undefined && evidence.inspectedFiles.length < 2) ||
      (evidence.inspectedTestOrDocs !== undefined && evidence.inspectedTestOrDocs.length === 0))
  const labs = metrics?.guidedLabs
  const scoreColor = (value: number | null | undefined) =>
    value == null
      ? "text-muted-foreground"
      : value >= 80
        ? "text-emerald-400"
        : value >= 60
          ? "text-amber-400"
          : "text-red-400"
  return (
    <div className="border-border/50 bg-card/50 rounded-xl border p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="text-muted-foreground truncate text-sm font-medium">
            Bugfix Readiness
          </span>
        </div>
        <span className={`text-xl font-light ${scoreColor(bugfix?.readiness)}`}>
          {formatMetricScore(bugfix?.readiness)}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-muted-foreground text-sm">
          Couldn't load debugging metrics. Use Retry in Performance Insights.
        </p>
      ) : !metrics ? (
        <p role="status" className="text-muted-foreground text-sm">
          Loading debugging metrics…
        </p>
      ) : bugfix?.latest ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Latest {Math.min(bugfix.sessions, 5)} completed bugfix interviews. Guided labs are
            separate.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Last Score", formatMetricScore(bugfix.latest.debuggingScore)],
              ["Files Opened", evidence?.inspectedFiles?.length ?? "—"],
              ["Tests Run", evidence?.visibleTestsRun ?? "—"],
              ["AI Shortcut", evidence?.aiShortcutCount ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="bg-background/60 rounded-lg p-2">
                <p className="text-muted-foreground">{label}</p>
                <p className="text-foreground">{value}</p>
              </div>
            ))}
          </div>
          {needsPractice && (
            <p className="text-muted-foreground text-xs">
              Practice reproducing the failure before editing and checking the visible tests.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Complete a bugfix interview to build your debugging signal.
        </p>
      )}
      {labs && labs.sessions > 0 && (
        <div className="border-border/50 text-muted-foreground mt-4 border-t pt-3 text-xs">
          <p className="text-foreground font-medium">
            Guided practice · {labs.sessions} completed {labs.sessions === 1 ? "lab" : "labs"}
          </p>
          <p className="mt-1">
            Average mastery {formatMetricScore(labs.averageMastery)} · {labs.practiceMinutes} min
            practice
          </p>
        </div>
      )}
      <Link href="/interview?track=debugging">
        <Button
          size="sm"
          variant="outline"
          className="border-border text-muted-foreground hover:bg-muted mt-4 h-8 w-full text-xs"
        >
          <Terminal className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Practice Bugfix
        </Button>
      </Link>
    </div>
  )
}
