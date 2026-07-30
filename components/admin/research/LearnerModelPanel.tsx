"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  Flag,
  ShieldCheck,
  ShieldX,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import type { LearnerModelAdminStats, VerificationOutcome } from "@/lib/learner-model/admin-stats"

/** Human labels for the three structured dispute reasons. */
const REASON_LABELS: Record<string, string> = {
  typo: "Typo / misread",
  rushed: "Knew it, rushed",
  learned_elsewhere: "Learned elsewhere",
}

/** Human labels for how the Correct layer amended the card. */
const SOURCE_LABELS: Record<string, string> = {
  event_snapshot: "FSRS replay",
  field_fallback: "Field fallback",
  none: "Verification only",
}

const EVENT_LABELS: Record<string, string> = {
  olm_model_viewed: "Model viewed",
  olm_concept_expanded: "Concept expanded",
  olm_card_evidence_viewed: "Evidence viewed",
  olm_challenge_submitted: "Challenge submitted",
  olm_correction_applied: "Correction applied",
  olm_verification_scheduled: "Verification scheduled",
  olm_verification_completed: "Verification completed",
  olm_trace_shown: "Trace shown",
}

interface StatTileProps {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}

function StatTile({ icon, label, value, hint }: StatTileProps) {
  return (
    <div className="flex flex-col rounded-lg bg-gray-800/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-2xl font-semibold text-gray-100">{value}</span>
      {hint && <span className="mt-1 text-xs text-gray-500">{hint}</span>}
    </div>
  )
}

/** One reason's dispute record: how often, and how often the learner was right. */
function ReasonRow({ reason, outcome }: { reason: string; outcome: VerificationOutcome }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-800/40 px-3 py-2.5">
      <span className="w-40 shrink-0 text-sm text-gray-300">{REASON_LABELS[reason] ?? reason}</span>
      <span className="w-16 shrink-0 text-sm text-gray-400">{outcome.total}</span>
      <div className="min-w-0 flex-1">
        {outcome.verified > 0 ? (
          <div className="flex items-center gap-2">
            <Progress value={outcome.accuracy_pct ?? 0} className="h-1.5 flex-1" />
            <span className="w-24 shrink-0 text-right text-xs text-gray-400">
              {outcome.accuracy_pct}% right ({outcome.passed}/{outcome.verified})
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">
            {outcome.pending > 0 ? `${outcome.pending} awaiting verification` : "No data yet"}
          </span>
        )}
      </div>
    </div>
  )
}

interface LearnerModelPanelProps {
  data: LearnerModelAdminStats | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}

/**
 * The co-regulation study's read-out: how often learners dispute the model's beliefs,
 * and whether the verification review proves them right. `dispute_accuracy_pct` is the
 * headline dependent variable — everything else contextualises it.
 */
export function LearnerModelPanel({ data, loading, error, onRefresh }: LearnerModelPanelProps) {
  if (loading && !data) {
    return (
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading learner model stats…
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="py-10 text-center">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-amber-400" />
          <p role="alert" className="mb-4 text-sm text-gray-300">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { challenges, events_by_type, events_by_condition, events_total, recent } = data
  const noChallenges = challenges.total === 0

  return (
    <div className="space-y-4">
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center text-gray-100">
              <Brain className="mr-2 h-4 w-4 text-purple-400" />
              Open Learner Model
            </CardTitle>
            <CardDescription className="text-gray-400">
              Inspect / challenge / correct — when learners dispute what the system believes about
              them, the verification review says who was right.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.truncated && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Showing the most recent {challenges.total} challenges only. Older disputes exist and
              are excluded from these percentages.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={<Flag className="h-3.5 w-3.5" />}
              label="Challenges"
              value={String(challenges.total)}
              hint={`${challenges.distinct_challengers} distinct ${
                challenges.distinct_challengers === 1 ? "learner" : "learners"
              }`}
            />
            <StatTile
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="Dispute accuracy"
              value={challenges.accuracy_pct === null ? "—" : `${challenges.accuracy_pct}%`}
              hint={
                challenges.verified > 0
                  ? `${challenges.passed} of ${challenges.verified} verified`
                  : "No verifications resolved yet"
              }
            />
            <StatTile
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Awaiting verification"
              value={String(challenges.pending)}
              hint="Review pulled to the next day"
            />
            <StatTile
              icon={<ShieldX className="h-3.5 w-3.5" />}
              label="Model vindicated"
              value={String(challenges.failed)}
              hint={
                challenges.mean_verification_score !== null
                  ? `Mean verification score ${challenges.mean_verification_score}`
                  : undefined
              }
            />
          </div>

          {noChallenges && (
            <p className="rounded-lg bg-gray-800/40 p-4 text-center text-sm text-gray-400">
              No challenges recorded yet. The dispute accuracy figure fills in once learners start
              correcting the model and their verification reviews come due.
            </p>
          )}

          {!noChallenges && (
            <div>
              <h4 className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                By stated reason
              </h4>
              <div className="space-y-1.5">
                {Object.entries(challenges.by_reason).map(([reason, outcome]) => (
                  <ReasonRow key={reason} reason={reason} outcome={outcome} />
                ))}
              </div>
            </div>
          )}

          {!noChallenges && (
            <div>
              <h4 className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                How the model was amended
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(challenges.by_amendment_source).map(([source, count]) => (
                  <Badge key={source} variant="outline" className="border-gray-700 text-gray-300">
                    {SOURCE_LABELS[source] ?? source}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-sm text-gray-100">Study conditions & engagement</CardTitle>
          <CardDescription className="text-gray-400">
            The black-box control arm should not be silent — comparable view volume is what makes
            the conditions comparable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              icon={<Eye className="h-3.5 w-3.5" />}
              label="Open condition events"
              value={String(events_by_condition.open ?? 0)}
              hint={
                events_total > 0
                  ? `${Math.round(((events_by_condition.open ?? 0) / events_total) * 100)}% of all events`
                  : undefined
              }
            />
            <StatTile
              icon={<EyeOff className="h-3.5 w-3.5" />}
              label="Black-box control events"
              value={String(events_by_condition.black_box ?? 0)}
              hint={
                events_total > 0
                  ? `${Math.round(((events_by_condition.black_box ?? 0) / events_total) * 100)}% of all events`
                  : "Control arm not enabled"
              }
            />
          </div>

          <div>
            <h4 className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
              Event volume by type
            </h4>
            <div className="space-y-1">
              {Object.entries(events_by_type).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between rounded px-3 py-1.5 text-sm odd:bg-gray-800/30"
                >
                  <span className="text-gray-300">{EVENT_LABELS[type] ?? type}</span>
                  <span className="font-mono text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {recent.length > 0 && (
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-sm text-gray-100">Recent challenges</CardTitle>
            <CardDescription className="text-gray-400">
              What the model believed, what the learner said, and how it resolved.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Problem</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Believed</th>
                  <th className="pb-2 font-medium">Stability</th>
                  <th className="pb-2 font-medium">Outcome</th>
                  <th className="pb-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} className="border-b border-gray-800/50 last:border-0">
                    <td className="py-2 pr-3 text-gray-200">
                      {row.title}
                      {row.condition === "black_box" && (
                        <Badge
                          variant="outline"
                          className="ml-2 border-gray-700 text-[10px] text-gray-400"
                        >
                          control
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-gray-400">
                      {REASON_LABELS[row.reason] ?? row.reason}
                    </td>
                    <td className="py-2 pr-3 text-gray-400">
                      {row.believed_retrievability === null
                        ? "—"
                        : `${Math.round(row.believed_retrievability)}%`}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-400">
                      {row.stability_before === null || row.stability_after === null
                        ? "—"
                        : `${row.stability_before.toFixed(1)} → ${row.stability_after.toFixed(1)}d`}
                    </td>
                    <td className="py-2 pr-3">
                      {row.status === "pending_verification" ? (
                        <span className="text-xs text-amber-400">Pending</span>
                      ) : row.verification_passed ? (
                        <span className="text-xs text-emerald-400">
                          Learner right ({row.verification_score})
                        </span>
                      ) : (
                        <span className="text-xs text-rose-400">
                          Model right ({row.verification_score})
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-gray-500">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
