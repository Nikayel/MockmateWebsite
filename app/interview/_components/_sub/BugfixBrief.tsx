"use client"

import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import type { BugSymptom } from "@/lib/scenarios/types"
import { extractIncidentNarrative, BRIEF_LABEL } from "./bugfix-brief/content"
import { SymptomCard, AcceptanceRow } from "./bugfix-brief/Details"
import { BugfixEvidence } from "./bugfix-brief/BugfixEvidence"

export { extractIncidentNarrative } from "./bugfix-brief/content"

interface BugfixBriefProps {
  title?: string
  task?: string
  symptom?: BugSymptom
  acceptance?: string[]
  report?: string
  reporterNote?: string
  fallbackStatement?: string
  isFuzzy?: boolean
  reproductionSteps?: string[]
  visibleLogs?: string[]
}

// Keep the full incident and its constraints visible. Only repeated presentation
// labels are trimmed; authored scenario content and AI context stay unchanged.
export function BugfixBrief({
  title,
  task,
  symptom,
  acceptance = [],
  report,
  reporterNote,
  fallbackStatement,
  isFuzzy,
  reproductionSteps = [],
  visibleLogs = [],
}: BugfixBriefProps) {
  return (
    <div className="workspace-brief space-y-5" data-bugfix-tour="incident-report">
      {task ? (
        <div className="space-y-2">
          <h3 className={BRIEF_LABEL}>Your task</h3>
          <p className="text-foreground text-sm leading-relaxed font-medium">{task}</p>
        </div>
      ) : fallbackStatement ? (
        <div className="space-y-2">
          <h3 className={BRIEF_LABEL}>{isFuzzy ? "Report" : "Task"}</h3>
          <MarkdownRenderer
            content={fallbackStatement}
            className="text-foreground text-sm leading-relaxed"
          />
        </div>
      ) : null}
      {symptom && (
        <div className="space-y-2">
          <h3 className={BRIEF_LABEL}>Observed behavior</h3>
          <SymptomCard symptom={symptom} />
        </div>
      )}
      <BugfixEvidence reproductionSteps={reproductionSteps} visibleLogs={visibleLogs} />
      {acceptance.length > 0 && (
        <div className="space-y-1">
          <h3 className={BRIEF_LABEL}>Done when</h3>
          {acceptance.map((text, index) => (
            <AcceptanceRow key={`${index}-${text.slice(0, 24)}`} text={text} />
          ))}
        </div>
      )}
      {(report || reporterNote) && task && (
        <details open className="border-border border-t pt-1">
          <summary className="text-foreground marker:text-muted-foreground [display:list-item] flex min-h-11 cursor-pointer items-center text-sm font-medium">
            Incident details
          </summary>
          <div className="space-y-3 pb-2">
            {reporterNote && (
              <blockquote className="border-border text-foreground border-l-2 pl-3 text-sm leading-relaxed italic">
                {reporterNote}
              </blockquote>
            )}
            {report && (
              <MarkdownRenderer
                content={extractIncidentNarrative(report, title)}
                className="text-foreground text-sm leading-relaxed"
              />
            )}
          </div>
        </details>
      )}
    </div>
  )
}

export default BugfixBrief
