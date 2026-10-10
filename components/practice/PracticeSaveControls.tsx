"use client"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePracticePlan } from "@/lib/hooks/usePracticePlan"
import type { NextPracticeRecommendation } from "@/lib/agents/recommendations/next-practice-types"

function localInputTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}
function tomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  return localInputTime(date)
}
export function PracticeSaveControls({
  sourceSessionId,
  recommendation,
}: {
  sourceSessionId: string
  recommendation: NextPracticeRecommendation
}) {
  const { result, save, writing, error } = usePracticePlan()
  const [showReminder, setShowReminder] = useState(false)
  const [time, setTime] = useState(tomorrow)
  const [validation, setValidation] = useState<string | null>(null)
  const id = useId()
  const saved =
    (result.status === "ready" || result.status === "complete") &&
    result.plan.sourceSessionId === sourceSessionId &&
    result.plan.recommendation.scenarioId === recommendation.scenarioId
      ? result.plan
      : null
  const submit = async (remind: boolean) => {
    const date = new Date(time)
    if (
      remind &&
      (!Number.isFinite(date.getTime()) ||
        localInputTime(date) !== time ||
        date.getTime() < Date.now() + 60_000 ||
        date.getTime() > Date.now() + 30 * 86_400_000)
    ) {
      setValidation("Choose a valid local time between one minute and 30 days from now.")
      return
    }
    setValidation(null)
    const accepted = await save({
      sourceSessionId,
      scenarioId: recommendation.scenarioId,
      reminderAt: remind ? date.toISOString() : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    if (accepted) setShowReminder(false)
  }
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="min-h-11"
          disabled={writing || saved?.reminderStatus === "none"}
          onClick={() => void submit(false)}
        >
          {writing
            ? "Saving…"
            : saved?.reminderStatus === "pending"
              ? "Save without reminder"
              : saved?.reminderStatus === "none"
                ? "Saved for later"
                : "Save for later"}
        </Button>
        <Button
          variant="ghost"
          className="min-h-11"
          disabled={writing}
          onClick={() => setShowReminder((value) => !value)}
        >
          Remind me
        </Button>
      </div>
      {showReminder && (
        <form
          className="border-border space-y-2 rounded-lg border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void submit(true)
          }}
        >
          <label className="block text-sm font-medium" htmlFor={id}>
            Email me after this time
          </label>
          <Input
            id={id}
            type="datetime-local"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="min-h-11"
            required
          />
          <p className="text-muted-foreground text-xs">
            Your local time. We respect your email preferences and quiet hours.
          </p>
          <Button type="submit" variant="outline" disabled={writing} className="min-h-11">
            {writing ? "Saving…" : "Save and schedule reminder"}
          </Button>
        </form>
      )}
      {(validation || error) && (
        <p role="alert" className="text-destructive text-sm">
          {validation || error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-muted-foreground text-sm">
          {saved.reminderStatus === "pending"
            ? `Saved. We'll email you after ${new Date(saved.reminderAt!).toLocaleString()}.`
            : saved.reminderStatus === "sent"
              ? "Saved. Your reminder was sent."
              : saved.reminderStatus === "failed" || saved.reminderStatus === "uncertain"
                ? "Your task is saved, but we couldn't confirm the reminder. You can choose a new reminder time."
                : saved.reminderStatus === "cancelled"
                  ? "Your task is saved. The reminder is cancelled."
                  : saved.reminderStatus === "sending"
                    ? "Saved. Your reminder is being sent."
                    : "Saved to your dashboard. No email reminder scheduled."}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        One saved next task at a time. Saving replaces your earlier task and its pending reminder.
      </p>
    </div>
  )
}
