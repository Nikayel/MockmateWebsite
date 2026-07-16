"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { cn } from "@/lib/utils"
import type { BugSymptom } from "@/lib/scenarios/types"

/**
 * BugfixBrief — the single source of truth for what the candidate must do.
 *
 * Replaces a panel that told the same story three times (a Description heading
 * over prose that opened "Incident Report", an amber card also titled "Incident
 * Report", and an Expected line restating it again). Roughly fifteen sentences of
 * read-before-you-code became three.
 *
 * Order is deliberate and answers the candidate's questions in the order they ask
 * them: what do I do (task) -> what is wrong (symptom) -> how do I know I'm done
 * (acceptance) -> why does this exist (report, collapsed).
 *
 * Nothing here may name the bug's cause or location. `bugDescription` and
 * `groundTruth` state the root cause outright and are deliberately not accepted as
 * props — locating the fault is the assessment.
 */

const LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70"

interface BugfixBriefProps {
  /** One imperative sentence. */
  task?: string
  /** Expected vs actual, symptom-level only. */
  symptom?: BugSymptom
  /** Acceptance rows. Real criteria, not decoration. */
  acceptance?: string[]
  /** The incident narrative. The ONLY copy, and collapsed by default. */
  report?: string
  /** Fallback when a scenario has no authored `task` yet. */
  fallbackStatement?: string
  /** Real-interview mode shows a deliberately vaguer statement. */
  isFuzzy?: boolean
}

function SymptomCard({ symptom }: { symptom: BugSymptom }) {
  return (
    <div className="border-border/70 bg-card/40 rounded-lg border">
      <div className="border-border/50 flex items-center gap-2 border-b px-3 py-1.5">
        <span className={LABEL}>{symptom.subject}</span>
        {symptom.tag && (
          <>
            <span className="text-muted-foreground/40 text-[10px]">···</span>
            <span className={LABEL}>{symptom.tag}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-2">
        <div className="border-border/50 border-r px-3 py-2">
          <div className={cn(LABEL, "mb-1")}>Expected</div>
          <div className="font-mono text-[17px] leading-tight text-emerald-400 tabular-nums">
            {symptom.expected}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className={cn(LABEL, "mb-1")}>Actual</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[17px] leading-tight text-red-400 tabular-nums">
              {symptom.actual}
            </span>
            {symptom.delta && (
              <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] text-red-300">
                {symptom.delta}
              </span>
            )}
          </div>
        </div>
      </div>

      {symptom.caveat && (
        <div className="border-border/50 text-muted-foreground border-t px-3 py-1.5 text-[11.5px] leading-snug">
          {symptom.caveat}
        </div>
      )}
    </div>
  )
}

function AcceptanceRow({ text }: { text: string }) {
  const [checked, setChecked] = useState(false)

  return (
    <label className="flex cursor-pointer items-start gap-2 py-1">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => setChecked(value === true)}
        className="mt-0.5 flex-shrink-0"
      />
      <span
        className={cn(
          "text-[12.5px] leading-snug transition-colors",
          checked ? "text-muted-foreground/50 line-through" : "text-muted-foreground"
        )}
      >
        {text}
      </span>
    </label>
  )
}

export function BugfixBrief({
  task,
  symptom,
  acceptance = [],
  report,
  fallbackStatement,
  isFuzzy,
}: BugfixBriefProps) {
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <div className="space-y-4" data-bugfix-tour="incident-report">
      {/* 1. Your task — always visible, boxed, one imperative line. */}
      {task ? (
        <div className="border-accent/25 bg-accent/[0.07] rounded-lg border px-3 py-2.5">
          <div className={cn(LABEL, "mb-1.5")}>Your task</div>
          <p className="text-foreground text-[13.5px] leading-snug font-medium">{task}</p>
        </div>
      ) : (
        // No authored task yet: fall back to the full statement rather than
        // showing the candidate an empty brief.
        fallbackStatement && (
          <div className="space-y-1.5">
            <div className={LABEL}>{isFuzzy ? "Report" : "Task"}</div>
            <MarkdownRenderer
              content={fallbackStatement}
              className="text-foreground text-[13.5px] leading-relaxed"
            />
          </div>
        )
      )}

      {/* 2. The symptom — the shape of the bug, pre-verbally. */}
      {symptom && (
        <div className="space-y-1.5">
          <div className={LABEL}>The symptom</div>
          <SymptomCard symptom={symptom} />
        </div>
      )}

      {/* 3. Done when — the real acceptance criteria. */}
      {acceptance.length > 0 && (
        <div className="space-y-0.5">
          <div className={cn(LABEL, "mb-1")}>Done when</div>
          {acceptance.map((item, index) => (
            <AcceptanceRow key={`${index}-${item.slice(0, 24)}`} text={item} />
          ))}
        </div>
      )}

      {/* 4. Full incident report — the ONLY copy of the narrative, collapsed. */}
      {report && task && (
        <Collapsible open={reportOpen} onOpenChange={setReportOpen}>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 py-1 text-left transition-colors">
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", reportOpen && "rotate-180")}
              aria-hidden="true"
            />
            <span className={LABEL}>Full incident report</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="text-muted-foreground pt-1.5 pl-5 text-[12.5px] leading-relaxed">
              <MarkdownRenderer content={report} className="text-[12.5px] leading-relaxed" />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

export default BugfixBrief
