"use client"

import { useState } from "react"
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

interface CorrectionSummary {
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

  const reset = () => {
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
    setSubmitting(true)
    setError(null)
    try {
      setResult(await submitChallenge(card.problem_id, reason, details.trim() || undefined))
    } catch {
      setError("Couldn't record your challenge. Please try again.")
    } finally {
      setSubmitting(false)
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
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.value}
                  onClick={() => setReason(r.value)}
                  className={`focus-visible:ring-ring w-full rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    reason === r.value
                      ? "border-foreground/40 bg-card"
                      : "border-border bg-card/30 hover:bg-card/60"
                  }`}
                >
                  <p className="text-foreground text-sm font-medium">{r.label}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{r.description}</p>
                </button>
              ))}
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
              className="bg-card text-foreground hover:bg-muted w-full"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit challenge
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
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
            <Button onClick={handleClose} className="bg-card text-foreground hover:bg-muted w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
