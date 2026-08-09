import { cn } from "@/lib/utils"
import { Sparra } from "@/components/brand/Sparra"

interface LogoProps {
  className?: string
  size?: number
}

/**
 * The CodeSparring mark — Sparra's static default face on the ember chip.
 * For animated states use components/brand/Sparra directly.
 */
export function Logo({ className = "", size = 32 }: LogoProps) {
  return <Sparra size={size} className={className} />
}

/**
 * Horizontal lockup: mark + wordmark in Geist SemiBold, per
 * design/brand/README.md (gap = 25% of icon width, single-ink wordmark).
 */
export function LogoWithText({ className = "", size = 28 }: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ gap: Math.round(size * 0.25) }}
    >
      <Sparra size={size} />
      <span
        className="font-ui text-foreground font-semibold tracking-[-0.035em]"
        style={{ fontSize: Math.max(Math.round(size * 0.6), 14) }}
      >
        CodeSparring
      </span>
    </span>
  )
}

export default Logo
