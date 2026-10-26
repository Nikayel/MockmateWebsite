import { ThumbsUp } from "lucide-react"

/** A receipt attached to the candidate's message, not a correctness signal. */
export function MessageAcknowledgment({ speaker = "Interviewer" }: { speaker?: string }) {
  const label = `${speaker} acknowledged`
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="border-border bg-muted/40 text-muted-foreground mt-2 inline-flex rounded-full border px-2 py-1"
    >
      <ThumbsUp className="h-3 w-3" aria-hidden="true" />
    </span>
  )
}
