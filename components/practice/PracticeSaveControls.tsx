"use client"

import { useId, useRef, useState } from "react"
import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePracticePlan } from "@/lib/hooks/usePracticePlan"
import type { NextPracticeRecommendation } from "@/lib/agents/recommendations/next-practice-types"
import { PracticeReminderForm } from "./PracticeReminderForm"
import { PracticeSaveStatus } from "./PracticeSaveStatus"

export function PracticeSaveControls({
  sourceSessionId,
  recommendation,
}: {
  sourceSessionId: string
  recommendation: NextPracticeRecommendation
}) {
  const { result, save, writing, error } = usePracticePlan()
  const [editing, setEditing] = useState(false)
  const actions = useRef<HTMLDivElement>(null)
  const formId = useId()
  const saved =
    (result.status === "ready" || result.status === "complete") &&
    result.plan.sourceSessionId === sourceSessionId &&
    result.plan.recommendation.scenarioId === recommendation.scenarioId
      ? result.plan
      : null
  const replacing = result.status === "ready" && !saved ? result.plan : null
  const unavailable = result.status === "loading" || result.status === "signed_out"

  const submit = async (reminderAt: string | null) => {
    const accepted = await save({
      sourceSessionId,
      scenarioId: recommendation.scenarioId,
      reminderAt,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    if (accepted) {
      setEditing(false)
      requestAnimationFrame(() =>
        actions.current?.querySelector<HTMLElement>('[role="status"]')?.focus()
      )
    }
  }

  return (
    <>
      <div ref={actions} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1">
        {saved ? (
          <>
            <PracticeSaveStatus plan={saved} complete={result.status === "complete"} />
            {result.status !== "complete" && saved.reminderStatus !== "sending" && (
              <Button
                variant="ghost"
                className="min-h-11"
                disabled={writing}
                aria-expanded={editing}
                aria-controls={formId}
                onClick={() => setEditing((value) => !value)}
              >
                {saved.reminderStatus === "pending" ? "Edit reminder" : "Add reminder"}
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={unavailable}
            loading={writing}
            onClick={() => void submit(null)}
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            {writing ? "Saving…" : "Save for later"}
          </Button>
        )}
      </div>
      {editing && saved && (
        <PracticeReminderForm
          key={saved.revision}
          id={formId}
          reminderAt={saved.reminderStatus === "pending" ? saved.reminderAt : null}
          writing={writing}
          onSave={submit}
          onCancel={() => {
            setEditing(false)
            actions.current?.querySelector("button")?.focus()
          }}
        />
      )}
      {error && (
        <p role="alert" className="text-destructive col-span-full text-sm">
          {error}
        </p>
      )}
      {replacing && (
        <p className="text-muted-foreground col-span-full text-xs leading-5 break-words">
          Saving replaces “{replacing.recommendation.title}” in your dashboard
          {replacing.reminderStatus === "pending" ? " and cancels its reminder" : ""}.
        </p>
      )}
    </>
  )
}
