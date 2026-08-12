"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
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
 * That de-duplication over-corrected. Collapsing the report by default hid 82.5% of
 * every scenario's authored prose (measured across all 10 legacy scenarios: 7,315
 * chars of incident behind the disclosure vs 1,554 visible), so what a candidate
 * actually read was one abstract imperative and a number. The hidden text is not a
 * fourth retelling — it is the only place the brief says what system this is, who
 * noticed, and what may not change ("Preserve the public API because other console
 * components call it directly"). A real ticket leads with that. The incident is now
 * visible by default; the disclosure only hides the closing restatement of the task.
 *
 * Order answers the candidate's questions in the order they ask them: what do I do
 * (task) -> why am I here (incident) -> what exactly is wrong (symptom) -> how do I
 * know I'm done (acceptance).
 *
 * Nothing here may name the bug's cause or location. `bugDescription` and
 * `groundTruth` state the root cause outright and are deliberately not accepted as
 * props — locating the fault is the assessment.
 */

const LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"

/**
 * Sections of `problemStatement` whose HEADING AND BODY the brief states in its own
 * right, and which would otherwise be a second copy inside the report.
 *
 * Presentation-only: `problemStatement` itself stays whole, because it feeds RAG
 * vectorization (lib/rag/vectorization/text-builders/bugfix-text.ts) and the AI
 * context. This trims what the CANDIDATE reads, not what the model reads.
 *
 * Deliberately narrow. It matches `**Bold**` headings only, so it no-ops on the 14
 * packs and 8 of the 10 legacy scenarios, whose text uses `##` headings or none.
 * That is correct and must stay: broadening it to `##` would strip a pack's
 * "The program" and "Data contract" sections, which are the load-bearing content.
 */
const REDUNDANT_SECTIONS = /^\*\*(Your Task|Artifacts)\*\*\s*$/i

/**
 * Headings whose BODY is the content we want but whose LABEL the panel already
 * prints above the prose. Dropping just the label avoids rendering "Incident
 * Report" inline as a bold lead-in to its own first sentence, which is what
 * markdown does with a single newline after a `**Bold**` line.
 */
const REDUNDANT_LABELS = /^\*\*(Incident Report)\*\*\s*$/i

/**
 * Trim the narrative down to what the brief does not already say: drop any
 * "**Your Task**" / "**Artifacts**" section outright (the task box and file tree
 * cover those), and drop the "**Incident Report**" label while keeping its body.
 * A section runs until the next `**Heading**` line or the end.
 */
export function extractIncidentNarrative(statement: string): string {
  const lines = statement.split("\n")
  const kept: string[] = []
  let skipping = false

  for (const line of lines) {
    if (/^\*\*[^*]+\*\*\s*$/.test(line)) {
      skipping = REDUNDANT_SECTIONS.test(line)
      if (!skipping && REDUNDANT_LABELS.test(line)) continue
    }
    if (!skipping) kept.push(line)
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

interface BugfixBriefProps {
  /** One imperative sentence. */
  task?: string
  /** Expected vs actual, symptom-level only. */
  symptom?: BugSymptom
  /** Acceptance rows. Real criteria, not decoration. */
  acceptance?: string[]
  /** The incident narrative. The ONLY copy, and collapsed by default. */
  report?: string
  /**
   * The reporter's own words: who noticed, and what they saw. Rendered as a quote above the
   * narrative, because that is the order a real ticket arrives in.
   *
   * Every scenario authors one and `bugfix-quality.ts` lints it for tone and root-cause leaks, but
   * until now nothing rendered it: the field was declared on the panel's type and never read, so
   * eleven carefully written incident reports reached no candidate.
   *
   * The CALLER decides whether a genuine report exists. `withBugfixIncidentDefaults` falls back to
   * the scenario description, and printing that here would restore exactly the say-it-three-times
   * duplication this brief was built to remove.
   */
  reporterNote?: string
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
          <div className="font-mono text-[17px] leading-tight text-emerald-700 tabular-nums dark:text-emerald-400">
            {symptom.expected}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className={cn(LABEL, "mb-1")}>Actual</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[17px] leading-tight text-red-700 tabular-nums dark:text-red-400">
              {symptom.actual}
            </span>
            {symptom.delta && (
              <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] text-red-700 dark:text-red-300">
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
  reporterNote,
  fallbackStatement,
  isFuzzy,
}: BugfixBriefProps) {
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

      {/* 2. The incident — what system this is, who noticed, and what may not
             change. Visible: this is the ticket, not an appendix to it.
             The reporter's words lead, because that is how the ticket arrived. */}
      {(report || reporterNote) && task && (
        <div className="space-y-1.5">
          <div className={LABEL}>The incident</div>
          <div className="border-border/70 bg-card/40 rounded-lg border px-3 py-2.5">
            {reporterNote && (
              <blockquote className="border-muted-foreground/30 text-foreground/80 mb-2.5 border-l-2 pl-2.5 text-[12.5px] leading-relaxed italic">
                {reporterNote}
              </blockquote>
            )}
            {report && (
              <MarkdownRenderer
                content={extractIncidentNarrative(report)}
                className="text-muted-foreground text-[12.5px] leading-relaxed"
              />
            )}
          </div>
        </div>
      )}

      {/* 3. The symptom — the shape of the bug, pre-verbally. */}
      {symptom && (
        <div className="space-y-1.5">
          <div className={LABEL}>The symptom</div>
          <SymptomCard symptom={symptom} />
        </div>
      )}

      {/* 4. Done when — the real acceptance criteria. */}
      {acceptance.length > 0 && (
        <div className="space-y-0.5">
          <div className={cn(LABEL, "mb-1")}>Done when</div>
          {acceptance.map((item, index) => (
            <AcceptanceRow key={`${index}-${item.slice(0, 24)}`} text={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default BugfixBrief
