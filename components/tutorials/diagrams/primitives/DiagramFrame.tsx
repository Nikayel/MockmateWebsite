import { cn } from "@/lib/utils"

/**
 * The shared shell every lesson diagram renders inside — one card style so static
 * diagrams and triggered animations read as one system with the rest of the lesson
 * (matches SqlResultGrid's bordered/rounded look). Owns the header row (label +
 * optional controls slot), the body, and the caption. Wide bodies scroll inside their
 * own container so a big diagram never makes the page scroll sideways.
 */
export function DiagramFrame({
  label,
  controls,
  caption,
  children,
  className,
  bodyClassName,
  containerProps,
  groupLabel,
}: {
  label?: string
  /** Right-aligned slot in the header — typically <StepControls/>. */
  controls?: React.ReactNode
  caption?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  /** For triggered diagrams: spread `player.containerProps` to make the body a focusable, arrow-key-steppable region. */
  containerProps?: React.HTMLAttributes<HTMLDivElement> & { tabIndex?: number }
  /** Accessible name for the focusable region (what the diagram shows). */
  groupLabel?: string
}) {
  return (
    <figure
      className={cn("border-border bg-card/40 my-4 overflow-hidden rounded-lg border", className)}
    >
      {(label || controls) && (
        <div className="border-border bg-muted/30 flex items-center justify-between gap-3 border-b px-3 py-1.5">
          {label ? (
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {label}
            </span>
          ) : (
            <span />
          )}
          {controls}
        </div>
      )}
      <div
        {...containerProps}
        aria-label={groupLabel}
        className={cn(
          "overflow-x-auto p-4",
          containerProps &&
            "focus-visible:ring-accent/50 rounded-sm outline-none focus-visible:ring-2",
          bodyClassName
        )}
      >
        {children}
      </div>
      {caption && (
        <figcaption className="text-muted-foreground border-border/60 border-t px-4 py-2 text-xs">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/** Inline error box for a malformed spec — visible in dev, quiet and non-crashing in prod. */
export function DiagramError({ message }: { message: string }) {
  return (
    <div
      role="note"
      className="border-destructive/30 bg-destructive/5 text-destructive my-4 rounded-lg border px-3 py-2 font-mono text-xs"
    >
      Diagram could not render: {message}
    </div>
  )
}
