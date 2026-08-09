import { cn } from "@/lib/utils"

/**
 * Trailing "…" whose dots fade in sequence (see .sparra-ellipsis in
 * sparra.css). Typographic and quiet — append after wait copy instead of a
 * literal ellipsis so the text reads as in-progress, not stalled.
 * Decorative: hidden from screen readers, which get the plain label text.
 */
export function AnimatedEllipsis({ className }: { className?: string }) {
  return (
    <span className={cn("sparra-ellipsis", className)} aria-hidden="true">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  )
}

export default AnimatedEllipsis
