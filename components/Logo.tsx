import { cn } from "@/lib/utils"
import { Sparra } from "@/components/brand/Sparra"

interface LogoProps {
  className?: string
  size?: number
}

/**
 * The CodeSparring mark — Sparra's default face on the ember chip, kept
 * alive with an occasional blink (and a gentle bob when its wrapping
 * `.group` link is hovered). For full states use components/brand/Sparra.
 */
export function Logo({ className = "", size = 32 }: LogoProps) {
  return <Sparra size={size} className={cn("sparra-blink", className)} />
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
      <Sparra size={size} className="sparra-blink" />
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
