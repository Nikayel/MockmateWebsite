"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { StepControls } from "./primitives/StepControls"
import { useStepPlayer } from "./primitives/useStepPlayer"
import { computeJoinSteps, type JoinOutputRow } from "@/lib/tutorials/diagrams/logic"
import { formatCell } from "@/lib/tutorials/diagrams/format"
import type { DiagramCell, JoinSpec } from "@/lib/tutorials/diagrams/schema"

const KIND_LABEL: Record<JoinSpec["kind"], string> = {
  inner: "INNER JOIN",
  left: "LEFT JOIN",
  right: "RIGHT JOIN",
  full: "FULL JOIN",
  anti: "ANTI JOIN",
}

/**
 * JOIN row-matching (triggered). Walks each left row, lights up the right rows whose
 * key matches, and grows the result set below — so a learner SEES why an inner join
 * drops unmatched rows, a left join NULL-fills them, and a fan-out multiplies rows.
 * Motion is the stepping itself (color only), so it stays calm under reduced motion.
 */
export function JoinDiagram({ spec }: { spec: JoinSpec }) {
  const { steps } = useMemo(() => computeJoinSteps(spec), [spec])
  const player = useStepPlayer(steps.length)
  const step = steps[player.index]

  const leftCurrent = step?.side === "left" ? step.rowIndex : null
  const rightCurrent = step?.side === "right-only" ? step.rowIndex : null
  const rightMatched = step?.side === "left" ? step.matches : []

  const emittedSoFar: JoinOutputRow[] = steps.slice(0, player.index + 1).flatMap((s) => s.emits)

  return (
    <DiagramFrame
      label={`${spec.left.name} · ${KIND_LABEL[spec.kind]} · ${spec.right.name}  ON ${spec.on[0]} = ${spec.on[1]}`}
      controls={<StepControls player={player} />}
      caption={spec.caption}
      containerProps={player.containerProps}
      groupLabel={`${KIND_LABEL[spec.kind]} of ${spec.left.name} and ${spec.right.name}, step-through`}
    >
      <div className="flex flex-wrap gap-4">
        <MiniTable
          name={spec.left.name}
          columns={spec.left.columns}
          rows={spec.left.rows}
          keyCol={spec.on[0]}
          currentIndex={leftCurrent}
          matchedIndices={[]}
          reducedMotion={player.reducedMotion}
        />
        <MiniTable
          name={spec.right.name}
          columns={spec.right.columns}
          rows={spec.right.rows}
          keyCol={spec.on[1]}
          currentIndex={rightCurrent}
          matchedIndices={rightMatched}
          reducedMotion={player.reducedMotion}
        />
      </div>

      <p className="text-muted-foreground mt-3 min-h-[1.25rem] text-xs" aria-live="polite">
        {describeStep(spec, step)}
      </p>

      <div className="mt-2">
        <div className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
          Result ({emittedSoFar.length} row{emittedSoFar.length === 1 ? "" : "s"})
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead>
              <tr>
                {spec.left.columns.map((c) => (
                  <ResultTh key={`l-${c}`}>
                    {spec.left.name}.{c}
                  </ResultTh>
                ))}
                {spec.right.columns.map((c) => (
                  <ResultTh key={`r-${c}`}>
                    {spec.right.name}.{c}
                  </ResultTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {emittedSoFar.length === 0 ? (
                <tr>
                  <td
                    colSpan={spec.left.columns.length + spec.right.columns.length}
                    className="text-muted-foreground px-3 py-2 text-center italic"
                  >
                    no rows yet
                  </td>
                </tr>
              ) : (
                emittedSoFar.map((row, i) => (
                  <tr key={i} className="odd:bg-muted/20">
                    {spec.left.columns.map((_, c) => (
                      <ResultTd
                        key={`l-${c}`}
                        value={row.left ? row.left[c] : null}
                        filled={!row.left}
                      />
                    ))}
                    {spec.right.columns.map((_, c) => (
                      <ResultTd
                        key={`r-${c}`}
                        value={row.right ? row.right[c] : null}
                        filled={!row.right}
                      />
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DiagramFrame>
  )
}

function MiniTable({
  name,
  columns,
  rows,
  keyCol,
  currentIndex,
  matchedIndices,
  reducedMotion,
}: {
  name: string
  columns: string[]
  rows: DiagramCell[][]
  keyCol: string
  currentIndex: number | null
  matchedIndices: number[]
  reducedMotion: boolean
}) {
  const keyIdx = columns.indexOf(keyCol)
  const matched = new Set(matchedIndices)

  return (
    <figure className="border-border min-w-[150px] overflow-hidden rounded-md border">
      <figcaption className="bg-muted/50 text-foreground border-border border-b px-3 py-1 font-mono text-xs font-semibold">
        {name}
      </figcaption>
      <table className="w-full border-collapse text-left font-mono text-[11px]">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  "text-muted-foreground border-border border-b px-2 py-1 font-semibold",
                  i === keyIdx && "text-accent"
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => {
            const isCurrent = r === currentIndex
            const isMatch = matched.has(r)
            return (
              <tr
                key={r}
                className={cn(
                  !reducedMotion && "transition-colors duration-300",
                  // Non-color cues alongside the tint: current row = inset ring, matched
                  // row = a left edge bar, so scan/match state survives loss of color (WCAG 1.4.1).
                  isCurrent && "bg-accent/15 ring-accent/50 ring-1 ring-inset",
                  !isCurrent && isMatch && "border-l-2 border-l-emerald-500 bg-emerald-500/10"
                )}
              >
                {row.map((cell, c) => (
                  <td key={c} className="border-border/50 border-b px-2 py-1">
                    {c === keyIdx && isMatch && <span className="sr-only">matched: </span>}
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </figure>
  )
}

function ResultTh({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="bg-muted/40 text-muted-foreground border-border border-b px-3 py-1 font-semibold whitespace-nowrap"
    >
      {children}
    </th>
  )
}

function ResultTd({ value, filled }: { value: DiagramCell; filled: boolean }) {
  const isNull = value === null
  return (
    <td
      className={cn(
        "border-border/60 border-b px-3 py-1",
        (isNull || filled) && "text-muted-foreground/60 italic"
      )}
    >
      {formatCell(value)}
    </td>
  )
}

function describeStep(
  spec: JoinSpec,
  step: ReturnType<typeof computeJoinSteps>["steps"][number] | undefined
): string {
  if (!step) return ""
  const keyIdxL = spec.left.columns.indexOf(spec.on[0])
  const keyIdxR = spec.right.columns.indexOf(spec.on[1])

  if (step.side === "right-only") {
    const key = formatCell(spec.right.rows[step.rowIndex][keyIdxR])
    return `${spec.right.name} ${spec.on[1]}=${key} had no match → kept with NULLs on the left.`
  }
  const key = formatCell(spec.left.rows[step.rowIndex][keyIdxL])
  if (step.matches.length > 0) {
    if (spec.kind === "anti")
      return `${spec.on[0]}=${key} matches → dropped (ANTI JOIN keeps only non-matches).`
    return `${spec.on[0]}=${key} matches ${step.matches.length} ${spec.right.name} row${step.matches.length === 1 ? "" : "s"}.`
  }
  if (spec.kind === "anti")
    return `${spec.on[0]}=${key} has no match → kept (this is what ANTI JOIN returns).`
  if (spec.kind === "left" || spec.kind === "full")
    return `${spec.on[0]}=${key} has no match → kept with NULLs on the right.`
  return `${spec.on[0]}=${key} has no match → dropped.`
}
