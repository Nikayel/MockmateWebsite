"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CardBelief, ChallengeReason } from "@/lib/learner-model/types"

const REASONS: Array<{ value: ChallengeReason; label: string; description: string }> = [
  {
    value: "typo",
    label: "I made a typo / misread the problem",
    description:
      "The miss wasn't a misunderstanding — the model will re-grade that attempt without the memory penalty.",
  },
  {
    value: "rushed",
    label: "I knew it but was rushing",
    description:
      "You understood the approach but hurried — the model softens the penalty on that attempt.",
  },
  {
    value: "learned_elsewhere",
    label: "I've learned this since, elsewhere",
    description:
      "Practiced on another platform, studied it in class — the model will verify soon instead of waiting.",
  },
]

/**
 * The client-side shape of a correction. Exported so the page can type the
 * challenge response without importing lib/learner-model/challenges.ts, which
 * pulls firebase-admin.
 */
export interface CorrectionSummary {
  type: "rerate" | "verification_pull_only"
  amendment_source: "event_snapshot" | "field_fallback" | "none"
  before: { stability: number | null }
  after: { stability: number | null }
  verification_due_at: string
}

interface ChallengeDialogProps {
  card: CardBelief | null
  onClose: () => void
  submitChallenge: (
    problemId: string,
    reason: ChallengeReason,
    details?: string
  ) => Promise<CorrectionSummary>
}

export function ChallengeDialog({ card, onClose, submitChallenge }: ChallengeDialogProps) {
  const [reason, setReason] = useState<ChallengeReason | null>(null)
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CorrectionSummary | null>(null)

  // Arrow-key navigation for the radiogroup, which role="radio" promises and this
  // dialog did not deliver. Wraps in both directions, per the WAI-ARIA radio pattern.
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const onOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    const forward = e.key === "ArrowDown" || e.key === "ArrowRight"
    const back = e.key === "ArrowUp" || e.key === "ArrowLeft"
    if (!forward && !back) return
    e.preventDefault()
    const next = (index + (forward ? 1 : REASONS.length - 1)) % REASONS.length
    setReason(REASONS[next].value)
    optionRefs.current[next]?.focus()
  }

  /**
   * Which card the in-flight submission belongs to.
   *
   * This component is mounted permanently by the page and only its `card` prop
   * toggles, so `result` and `error` survive across cards. Submit for card A, close
   * the dialog mid-flight (Escape, overlay, X), then open card B: the resolution
   * would land on the shared state and card B would show card A's success panel —
   * "The model updated", a stability delta, a verification date — for a card that
   * was never challenged. The failure path leaked the same way.
   *
   * Same monotonic-token defence the page already uses for the evidence fetch,
   * applied to the flagship action instead of a side panel.
   */
  const inFlightFor = useRef<string | null>(null)

  /**
   * On success the form unmounts under the focused Submit button, so focus would
   * otherwise fall to the body. Focus the RESULT REGION rather than the Done
   * button: it already carries role="status", so landing there reads the outcome
   * and Tab reaches Done from it.
   *
   * Moved off an `autoFocus` prop deliberately — Radix owns focus on dialog OPEN,
   * and this is a mid-life content swap it does not handle. An effect keyed on
   * `result` says which of the two moments it is and does not fight the other.
   */
  const resultRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (result) resultRef.current?.focus()
  }, [result])

  const reset = () => {
    inFlightFor.current = null
    setReason(null)
    setDetails("")
    setSubmitting(false)
    setError(null)
    setResult(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!card || !reason) return
    const problemId = card.problem_id
    inFlightFor.current = problemId
    setSubmitting(true)
    setError(null)
    try {
      const correction = await submitChallenge(problemId, reason, details.trim() || undefined)
      if (inFlightFor.current !== problemId) return
      setResult(correction)
    } catch {
      if (inFlightFor.current !== problemId) return
      setError("Couldn't record your challenge. Please try again.")
    } finally {
      if (inFlightFor.current === problemId) setSubmitting(false)
    }
  }

  return (
    <Dialog open={card !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dispute this belief</DialogTitle>
          <DialogDescription>
            {card ? `The system's estimate for ${card.title} seems wrong to you. Why?` : ""}
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            {/* Mutually exclusive choices: a radiogroup, so assistive tech
                announces "radio, 1 of 3" rather than three pressed buttons. */}
            <div
              role="radiogroup"
              aria-label="Why does this belief seem wrong?"
              className="space-y-3"
            >
              {REASONS.map((r, i) => {
                const selected = reason === r.value
                return (
                  <button
                    key={r.value}
                    ref={(el) => {
                      optionRefs.current[i] = el
                    }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    // Roving tabindex: role="radio" announces "1 of 3" and promises
                    // arrow-key navigation, which this group did not implement. One
                    // stop for the group, arrows move within it.
                    tabIndex={selected || (reason === null && i === 0) ? 0 : -1}
                    onKeyDown={(e) => onOptionKeyDown(e, i)}
                    onClick={() => setReason(r.value)}
                    // Selection was carried by border-foreground/40 over near-identical
                    // fills — a ~2.25:1 border and a 1.04:1 fill difference, unreadable
                    // on a projector in the flow this page exists for.
                    className={`focus-visible:ring-ring flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                      selected
                        ? "border-accent-strong bg-accent/10"
                        : "border-border hover:border-muted-foreground bg-transparent"
                    }`}
                  >
                    {/* Shape and fill, not a border tint: state survives greyscale,
                        low contrast and a projector. */}
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-accent-strong" : "border-muted-foreground"
                      }`}
                    >
                      {selected && <span className="bg-accent-strong h-1.5 w-1.5 rounded-full" />}
                    </span>
                    <span className="min-w-0">
                      <span className="text-foreground block text-sm font-medium">{r.label}</span>
                      <span className="text-muted-foreground mt-0.5 block text-xs">
                        {r.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              // Placeholder alone is not an accessible name.
              aria-label="Additional details about your challenge (optional)"
              placeholder="Anything else? (optional)"
              className="min-h-16 text-sm"
            />

            {error && (
              <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">
                {error}
              </p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 dark:text-accent w-full border"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit challenge
            </Button>
          </div>
        )}

        {result && (
          // role="status" + focusing Done: on success the form unmounts under the
          // focused Submit button, so focus fell to the body and the outcome was
          // announced to nobody. The error path already uses role="alert"; the
          // flagship action should not be the silent one.
          <div className="space-y-3 outline-none" role="status" tabIndex={-1} ref={resultRef}>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <div className="text-sm">
                <p className="text-foreground font-medium">The model updated</p>
                <p className="text-muted-foreground mt-1">
                  {result.type === "rerate" && result.amendment_source === "event_snapshot"
                    ? "Your last attempt was re-graded without the penalty — memory strength restored"
                    : result.type === "rerate"
                      ? "The penalty on your last attempt was rolled back"
                      : "Your memory state was left as-is"}
                  {result.before.stability !== null &&
                  result.after.stability !== null &&
                  result.after.stability !== result.before.stability
                    ? ` (stability ${Math.round(result.before.stability * 10) / 10}d → ${Math.round(result.after.stability * 10) / 10}d)`
                    : ""}
                  . A quick verification review is scheduled for{" "}
                  {new Date(result.verification_due_at).toLocaleDateString()} — if you're right, the
                  correction sticks.
                </p>
              </div>
            </div>
            <Button
              onClick={handleClose}
              className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 dark:text-accent w-full border"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
