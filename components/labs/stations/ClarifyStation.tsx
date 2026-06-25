"use client"

/**
 * ClarifyStation (§7.1) — surface ambiguity before building.
 *
 * A guided list of dimensions, each a Question + Assumption pair. Progressive
 * disclosure (P2): one dimension open at a time, the rest collapsed. The first
 * dimension shows a ghost example (as placeholder text) so the user never faces
 * a blank wall. Soft completion: 3+ dimensions recommended, never required.
 * Answers persist to the active run via the store.
 */

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import type { ClarifyAnswer } from "@/lib/labs/types"

interface ClarifyDimension {
  id: string
  label: string
  /** Hint shown under the dimension about what to probe. */
  prompt: string
}

const CLARIFY_DIMENSIONS: ClarifyDimension[] = [
  {
    id: "business-outcome",
    label: "Business outcome",
    prompt: "What does success actually look like for the business?",
  },
  {
    id: "users-bottlenecks",
    label: "Key users & bottlenecks",
    prompt: "Who uses this, and where do they get stuck today?",
  },
  {
    id: "data-freshness",
    label: "Data freshness",
    prompt: "How fresh does the data need to be to be useful?",
  },
  {
    id: "latency-safety-legal",
    label: "Latency, safety & legal",
    prompt: "What latency, safety, or legal constraints bind the design?",
  },
  {
    id: "scale",
    label: "Scale",
    prompt: "What volume and growth must this handle?",
  },
]

/** Ghost example for the first dimension (shown as placeholder, not saved). */
const GHOST_EXAMPLE = {
  question: "What are we optimizing — faster dispatch, fewer dropped calls, or lower cost?",
  assumption: "Assume we optimize time-to-dispatch for life-threatening calls first.",
}

const RECOMMENDED_DIMENSIONS = 3

type RowState = Record<string, { question: string; assumption: string }>

function buildInitialRows(answers: ClarifyAnswer[] | undefined): RowState {
  const rows: RowState = {}
  for (const d of CLARIFY_DIMENSIONS) rows[d.id] = { question: "", assumption: "" }
  for (const a of answers ?? []) {
    if (rows[a.dimension]) {
      rows[a.dimension] = { question: a.question, assumption: a.assumption }
    }
  }
  return rows
}

function deriveAnswers(rows: RowState): ClarifyAnswer[] {
  return CLARIFY_DIMENSIONS.map((d) => ({
    dimension: d.id,
    question: rows[d.id].question.trim(),
    assumption: rows[d.id].assumption.trim(),
  })).filter((a) => a.question || a.assumption)
}

export function ClarifyStation() {
  const run = useCaseLabStore((s) => s.activeRun)
  const setClarify = useCaseLabStore((s) => s.setClarify)

  const [rows, setRows] = useState<RowState>(() => buildInitialRows(run?.answers.clarify))
  const [openId, setOpenId] = useState<string>(CLARIFY_DIMENSIONS[0].id)

  const update = (id: string, field: "question" | "assumption", value: string) => {
    const next: RowState = { ...rows, [id]: { ...rows[id], [field]: value } }
    setRows(next)
    setClarify(deriveAnswers(next))
  }

  const filledCount = deriveAnswers(rows).length

  return (
    <section aria-labelledby="clarify-title" className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 id="clarify-title" className="text-foreground text-lg font-semibold">
          Clarify
        </h2>
        <p className="text-muted-foreground text-sm">
          What would you ask before writing a line? Capture the question and the assumption
          you&apos;d proceed on.
        </p>
      </header>

      <ol className="flex flex-col gap-2">
        {CLARIFY_DIMENSIONS.map((d, i) => {
          const isOpen = openId === d.id
          const isGhost = i === 0
          const row = rows[d.id]
          const answered = Boolean(row.question.trim() || row.assumption.trim())
          return (
            <li key={d.id}>
              <Collapsible
                open={isOpen}
                onOpenChange={(o) => setOpenId(o ? d.id : "")}
                className="border-border rounded-lg border"
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        answered ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      aria-hidden
                    />
                    <span className="text-foreground text-sm font-medium">{d.label}</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "text-muted-foreground h-4 w-4 transition-transform",
                      isOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="flex flex-col gap-3 px-3 pb-3">
                  <p className="text-muted-foreground text-xs">{d.prompt}</p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${d.id}-question`} className="text-xs">
                      Question
                    </Label>
                    <Textarea
                      id={`${d.id}-question`}
                      value={row.question}
                      onChange={(e) => update(d.id, "question", e.target.value)}
                      placeholder={isGhost ? GHOST_EXAMPLE.question : undefined}
                      rows={2}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${d.id}-assumption`} className="text-xs">
                      Assumption if unanswered
                    </Label>
                    <Textarea
                      id={`${d.id}-assumption`}
                      value={row.assumption}
                      onChange={(e) => update(d.id, "assumption", e.target.value)}
                      placeholder={isGhost ? GHOST_EXAMPLE.assumption : undefined}
                      rows={2}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </li>
          )
        })}
      </ol>

      <p className="text-muted-foreground text-xs">
        {filledCount} of {CLARIFY_DIMENSIONS.length} dimensions addressed
        {filledCount < RECOMMENDED_DIMENSIONS
          ? ` — ${RECOMMENDED_DIMENSIONS}+ recommended, but you can move on anytime.`
          : " — nice, you can move on whenever you're ready."}
      </p>
    </section>
  )
}
