"use client"

import { ThumbsDown, ThumbsUp } from "lucide-react"
import { useResponseRating } from "@/lib/hooks/useResponseRating"

export function AIResponseRating({
  generationId,
  responseId,
  label,
}: {
  generationId: string
  responseId: string
  label: string
}) {
  const { isSignedIn, value, error, busy, rate } = useResponseRating(generationId, responseId)
  if (!isSignedIn) return null
  return (
    <div className="mt-1" role="group" aria-label={label} aria-busy={busy}>
      <div className="flex items-center gap-1">
        {(
          [
            ["helpful", "Helpful", ThumbsUp],
            ["unhelpful", "Not helpful", ThumbsDown],
          ] as const
        ).map(([rating, title, Icon]) => (
          <button
            key={rating}
            type="button"
            aria-label={title}
            title={title}
            aria-pressed={value === rating}
            disabled={busy}
            onClick={() => void rate(rating)}
            className={`focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 disabled:opacity-50 ${value === rating ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ))}
        <span role="status" className="text-muted-foreground text-xs">
          {value && !busy && !error ? "Rating saved" : ""}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-destructive mt-1 text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
