import { Sparra, type SparraState } from "@/components/brand/Sparra"
import { cn } from "@/lib/utils"

interface SparraLoaderProps {
  /** Visible caption under the mark. Keep it short ("Loading dashboard…"). */
  label?: string
  /** Defaults to the idle bob; pass "thinking" for AI/compute waits. */
  state?: SparraState
  size?: number
  /** Fills the viewport and paints the app background (route-level loading). */
  fullPage?: boolean
  className?: string
}

/**
 * The one branded wait state. Fades in after a 150ms beat so fast loads
 * never flash it (see .sparra-loader in sparra.css). Announced politely
 * to screen readers via role="status".
 */
export function SparraLoader({
  label,
  state = "idle",
  size = 56,
  fullPage = false,
  className,
}: SparraLoaderProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center",
        fullPage ? "bg-background min-h-screen" : "py-16",
        className
      )}
    >
      <div className="sparra-loader flex flex-col items-center gap-5">
        <Sparra state={state} size={size} />
        {label ? (
          <p className="text-muted-foreground text-sm tracking-wide">{label}</p>
        ) : (
          <span className="sr-only">Loading</span>
        )}
      </div>
    </div>
  )
}

export default SparraLoader
