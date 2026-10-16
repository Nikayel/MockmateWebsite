"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function localInputTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function tomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  return localInputTime(date)
}

export function PracticeReminderForm({
  id,
  reminderAt,
  writing,
  onSave,
  onCancel,
}: {
  id: string
  reminderAt: string | null
  writing: boolean
  onSave: (reminderAt: string | null) => Promise<void>
  onCancel: () => void
}) {
  const [time, setTime] = useState(() =>
    reminderAt ? localInputTime(new Date(reminderAt)) : tomorrow()
  )
  const [validation, setValidation] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])

  const submit = () => {
    const date = new Date(time)
    if (
      !Number.isFinite(date.getTime()) ||
      localInputTime(date) !== time ||
      date.getTime() < Date.now() + 60_000 ||
      date.getTime() > Date.now() + 30 * 86_400_000
    ) {
      setValidation("Choose a valid local time between one minute and 30 days from now.")
      input.current?.focus()
      return
    }
    setValidation(null)
    void onSave(date.toISOString())
  }

  return (
    <form
      id={id}
      aria-label="Email reminder"
      className="border-border/50 bg-muted/30 col-span-full space-y-3 rounded-lg border p-3 sm:p-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <label className="block text-sm font-medium" htmlFor={`${id}-time`}>
        Email me a reminder
      </label>
      <Input
        ref={input}
        id={`${id}-time`}
        type="datetime-local"
        value={time}
        onChange={(event) => {
          setTime(event.target.value)
          setValidation(null)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !writing) {
            event.preventDefault()
            onCancel()
          }
        }}
        aria-invalid={Boolean(validation)}
        aria-describedby={`${id}-help${validation ? ` ${id}-validation` : ""}`}
        disabled={writing}
        className="min-h-11 max-w-full [color-scheme:light] dark:[color-scheme:dark]"
        required
      />
      <p id={`${id}-help`} className="text-muted-foreground text-xs leading-5">
        Your local time ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Delivery may be later
        to respect quiet hours and your email preferences.
      </p>
      {validation && (
        <p id={`${id}-validation`} role="alert" className="text-destructive text-sm">
          {validation}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" loading={writing} className="min-h-11">
          {writing ? "Saving…" : reminderAt ? "Save changes" : "Set reminder"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={writing}
          className="min-h-11"
          onClick={onCancel}
        >
          Cancel
        </Button>
        {reminderAt && (
          <Button
            type="button"
            variant="ghost"
            disabled={writing}
            className="text-destructive min-h-11"
            onClick={() => void onSave(null)}
          >
            Cancel reminder
          </Button>
        )}
      </div>
    </form>
  )
}
