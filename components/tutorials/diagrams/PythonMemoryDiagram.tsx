"use client"

import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { StepControls } from "./primitives/StepControls"
import { useStepPlayer } from "./primitives/useStepPlayer"
import type { PythonMemorySpec } from "@/lib/tutorials/diagrams/schema"

/** Stable per-object accent so a name and the object it points at share a color (plus the id label). */
const OBJ_COLORS = [
  {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/50",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  { dot: "bg-blue-500", ring: "ring-blue-500/50", text: "text-blue-600 dark:text-blue-300" },
  { dot: "bg-amber-500", ring: "ring-amber-500/50", text: "text-amber-700 dark:text-amber-300" },
  {
    dot: "bg-violet-500",
    ring: "ring-violet-500/50",
    text: "text-violet-600 dark:text-violet-300",
  },
]

/**
 * Python names → objects memory model (triggered). Steps through code, redrawing which
 * NAMES point at which heap OBJECTS. When `b = a` makes two names share one object,
 * they share a color; a mutation flashes on the object and both names see it. This
 * externalizes the "one list, two names" model behind the classic aliasing bug.
 */
export function PythonMemoryDiagram({ spec }: { spec: PythonMemorySpec }) {
  const player = useStepPlayer(spec.steps.length)
  const step = spec.steps[player.index]

  // Assign each object id a stable color by first appearance across all steps.
  const objIds: string[] = []
  for (const s of spec.steps)
    for (const id of Object.keys(s.objects)) if (!objIds.includes(id)) objIds.push(id)
  // Math.max guards an id that only appears in `names` (never `objects`) so indexOf(-1) can't wrap.
  const colorOf = (id: string) => OBJ_COLORS[Math.max(0, objIds.indexOf(id)) % OBJ_COLORS.length]

  const names = Object.entries(step.names)
  const objects = Object.entries(step.objects)
  const refCount = (id: string) => names.filter(([, oid]) => oid === id).length

  return (
    <DiagramFrame
      label="Names point at objects"
      controls={<StepControls player={player} />}
      caption={spec.caption}
      containerProps={player.containerProps}
      groupLabel="Python names and heap objects, step-through"
    >
      <pre className="border-border bg-muted/30 mb-3 overflow-x-auto rounded-md border p-3 font-mono text-xs leading-relaxed">
        {spec.steps.map((s, i) => (
          <div
            key={i}
            className={cn(i === player.index ? "text-foreground" : "text-muted-foreground/40")}
          >
            <span className="select-none">{i === player.index ? "▸ " : "  "}</span>
            {s.code}
          </div>
        ))}
      </pre>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <figure>
          <figcaption className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
            Names
          </figcaption>
          <ul className="space-y-1.5">
            {names.map(([name, objId]) => {
              const c = colorOf(objId)
              return (
                <li key={name} className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="border-border bg-card rounded border px-2 py-0.5">{name}</span>
                  <ArrowRight className="text-muted-foreground/50 size-3" aria-hidden />
                  <span className={cn("inline-block size-2 rounded-full", c.dot)} aria-hidden />
                  <span className={c.text}>{objId}</span>
                </li>
              )
            })}
          </ul>
        </figure>

        <figure className="min-w-0">
          <figcaption className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
            Objects (heap)
          </figcaption>
          <ul className="flex flex-wrap gap-2">
            {objects.map(([id, obj]) => {
              const c = colorOf(id)
              const aliased = refCount(id) > 1
              const mutated = step.mutated === id
              return (
                <li
                  key={id}
                  className={cn(
                    "border-border bg-card rounded-md border px-3 py-2 font-mono text-xs",
                    !player.reducedMotion && "transition-all duration-300",
                    mutated && cn("ring-2", c.ring)
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn("inline-block size-2 rounded-full", c.dot)} aria-hidden />
                    <span className={cn("font-semibold", c.text)}>{id}</span>
                    <span className="text-muted-foreground/70">{obj.kind}</span>
                    {aliased && (
                      <span className="bg-muted text-muted-foreground rounded px-1 text-[10px]">
                        {refCount(id)} names
                      </span>
                    )}
                  </div>
                  <div className="text-foreground mt-1">{obj.value}</div>
                </li>
              )
            })}
          </ul>
        </figure>
      </div>

      {step.note && (
        <p className="text-muted-foreground mt-3 text-xs" aria-live="polite">
          {step.note}
        </p>
      )}
    </DiagramFrame>
  )
}
