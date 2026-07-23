"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The shared shell every ```cswidget interactive renders inside, and the OWNER of the
 * widget a11y contract (mirrors DiagramFrame's role for csdiagram, plus state duties
 * diagrams don't have):
 *
 *  - ONE polite aria-live region per widget. Family components never render their own
 *    live regions; they call `useWidgetA11y().announce(...)` and the frame narrates the
 *    state change as text. SVG bodies are decorative (`aria-hidden`) with the live
 *    region + visible text carrying meaning.
 *  - Native inputs only inside the body: range sliders with aria-valuetext (units),
 *    toggle buttons with aria-pressed, fieldset/legend radio groups.
 *  - Reduced motion: `useWidgetA11y().reducedMotion` is true under
 *    prefers-reduced-motion; families swap transitions for instant state changes and
 *    animations for final-state stills. The widget stays fully functional either way.
 *  - Always-visible reset: any stateful widget passes `onReset` and the frame renders
 *    the button in the header, in the same place in every widget.
 *  - Status is never encoded by color alone: families pair icon/pattern with a word
 *    (the frame cannot enforce this; it is asserted in family tests).
 */
interface WidgetA11y {
  /** Narrate a state change through the frame's single polite live region. */
  announce: (message: string) => void
  /** True under prefers-reduced-motion: instant state swaps, no autoplay, stills. */
  reducedMotion: boolean
}

const WidgetA11yContext = createContext<WidgetA11y | null>(null)

export function useWidgetA11y(): WidgetA11y {
  const ctx = useContext(WidgetA11yContext)
  if (!ctx) throw new Error("useWidgetA11y must be used inside a WidgetFrame")
  return ctx
}

export function WidgetFrame({
  label,
  caption,
  onReset,
  children,
  className,
  bodyClassName,
}: {
  /** Header eyebrow naming the widget kind, e.g. "Check yourself". */
  label: string
  caption?: string
  /** Stateful widgets pass their reset; the frame renders it always-visible in the header. */
  onReset?: () => void
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  // useReducedMotion reads matchMedia: false during SSR, real preference after mount
  // (same convention as useStepPlayer).
  const reducedMotion = useReducedMotion() ?? false

  // Re-announcing the SAME text (e.g. "Not quite." twice in a row) is a silent no-op for
  // most screen readers, so alternate an invisible no-break-space suffix to force it.
  const [liveMessage, setLiveMessage] = useState("")
  const flip = useRef(false)
  const announce = useCallback((message: string) => {
    flip.current = !flip.current
    setLiveMessage(message + (flip.current ? " " : ""))
  }, [])

  const a11y = useMemo(() => ({ announce, reducedMotion }), [announce, reducedMotion])

  return (
    <figure
      className={cn("border-border bg-card/40 my-4 overflow-hidden rounded-lg border", className)}
    >
      <div className="border-border bg-muted/30 flex items-center justify-between gap-3 border-b px-3 py-1.5">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          {label}
        </span>
        {onReset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground h-6 gap-1 px-2 text-[11px]"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset
          </Button>
        )}
      </div>
      <div className={cn("p-4", bodyClassName)}>
        <WidgetA11yContext.Provider value={a11y}>{children}</WidgetA11yContext.Provider>
      </div>
      {caption && (
        <figcaption className="text-muted-foreground border-border/60 border-t px-4 py-2 text-xs">
          {caption}
        </figcaption>
      )}
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>
    </figure>
  )
}

/** Inline error box for a malformed widget spec — visible in dev, quiet and non-crashing in prod. */
export function WidgetError({ message }: { message: string }) {
  return (
    <div
      role="note"
      className="border-destructive/30 bg-destructive/5 text-destructive my-4 rounded-lg border px-3 py-2 font-mono text-xs"
    >
      Widget could not render: {message}
    </div>
  )
}
