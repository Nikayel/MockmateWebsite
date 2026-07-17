import { ArrowRight } from "lucide-react"
import { DiagramFrame } from "./primitives/DiagramFrame"
import type { ComprehensionSpec } from "@/lib/tutorials/diagrams/schema"

/**
 * One colour per comprehension fragment, so the same part is the same colour on both
 * sides of the desugaring. These are CATEGORY colours, not status — amber here means
 * "the filter", not "a warning", which is why it does not follow LessonNotice to orange.
 *
 * Light mode uses the 800 shades and --accent-strong. Measured on the real diagram
 * surface (bg-card/40 over the page), the previous shades sat on the AA line or under
 * it: blue-600 4.47:1, amber-700 4.51:1, and text-accent 3.97:1 — the accent being the
 * `output` fragment, the one the diagram most wants read. The 800s clear 6.4-7.5:1.
 */
const PART_STYLE: Record<string, string> = {
  output: "border-accent/50 bg-accent/10 text-accent-strong",
  iterate: "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-300",
  filter: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
}

/**
 * Comprehension desugaring (static). Puts the explicit for-loop next to the one-line
 * comprehension so a learner sees they are the SAME computation, then names the
 * fragments (output / iterate / filter) that map between the two forms.
 */
export function ComprehensionDiagram({ spec }: { spec: ComprehensionSpec }) {
  return (
    <DiagramFrame label="Same computation, two forms" caption={spec.caption}>
      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <figure className="min-w-0">
          <figcaption className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
            Explicit loop
          </figcaption>
          <pre className="border-border bg-muted/30 overflow-x-auto rounded-md border p-3 font-mono text-xs leading-relaxed">
            {spec.loop.join("\n")}
          </pre>
        </figure>

        <ArrowRight
          className="text-muted-foreground/50 mx-auto hidden size-5 sm:block"
          aria-hidden
        />

        <figure className="min-w-0">
          <figcaption className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
            Comprehension
          </figcaption>
          <pre className="border-accent/40 bg-accent/5 overflow-x-auto rounded-md border p-3 font-mono text-xs leading-relaxed">
            {spec.comp}
          </pre>
        </figure>
      </div>

      {spec.parts && spec.parts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {spec.parts.map((part, i) => (
            <li
              key={`${part.label}-${i}`}
              className={`rounded-md border px-2 py-1 font-mono text-[11px] ${PART_STYLE[part.label] ?? "border-border"}`}
            >
              <span className="font-semibold uppercase">{part.label}</span>{" "}
              <span className="opacity-80">{part.code}</span>
            </li>
          ))}
        </ul>
      )}
    </DiagramFrame>
  )
}
