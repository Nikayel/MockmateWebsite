import { ArrowRight } from "lucide-react"
import { DiagramFrame } from "./primitives/DiagramFrame"
import type { ComprehensionSpec } from "@/lib/tutorials/diagrams/schema"

const PART_STYLE: Record<string, string> = {
  output: "border-accent/50 bg-accent/10 text-accent",
  iterate: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  filter: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
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
