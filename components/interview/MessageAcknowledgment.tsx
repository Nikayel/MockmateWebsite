/** A receipt attached to the candidate's message, not a correctness signal. */
export function MessageAcknowledgment({ speaker = "Interviewer" }: { speaker?: string }) {
  const label = `${speaker} acknowledged`
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="border-border bg-card inline-flex shrink-0 items-center justify-center rounded-full border px-2 py-1 align-middle text-lg leading-none"
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        }}
      >
        👍
      </span>
    </span>
  )
}
