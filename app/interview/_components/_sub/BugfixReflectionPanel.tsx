"use client"

import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { BugfixReflectionField } from "../ProblemColumn"

interface BugfixReflectionPanelProps {
  bugfixReflection: {
    hypothesis: string
    rootCause: string
    prevention: string
  }
  onBugfixReflectionChange?: (field: BugfixReflectionField, value: string) => void
  onBugfixReflectionCommit?: (field: BugfixReflectionField) => void
}

export function BugfixReflectionPanel({
  bugfixReflection,
  onBugfixReflectionChange,
  onBugfixReflectionCommit,
}: BugfixReflectionPanelProps) {
  return (
    <div className="border-border/70 bg-background/35 rounded-lg border p-3">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-cyan-200 uppercase">
        <span className="h-4 w-1 rounded-full bg-cyan-300"></span>
        Investigation Notes
      </h3>
      <div className="space-y-3">
        <div>
          <div
            className="mb-1 flex items-center justify-between gap-2"
            data-bugfix-tour="hypothesis"
          >
            <label
              htmlFor="bugfix-hypothesis"
              className="text-muted-foreground block text-xs font-semibold tracking-wide uppercase"
            >
              Hypothesis
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!bugfixReflection.hypothesis.trim()}
              onClick={() => onBugfixReflectionCommit?.("hypothesis")}
              className="border-border text-foreground hover:bg-muted/40 h-8 px-2 text-xs"
            >
              <Save className="mr-1 h-3 w-3" />
              Save hypothesis
            </Button>
          </div>
          <Textarea
            id="bugfix-hypothesis"
            value={bugfixReflection.hypothesis}
            onChange={(event) => onBugfixReflectionChange?.("hypothesis", event.target.value)}
            onBlur={() => onBugfixReflectionCommit?.("hypothesis")}
            className="border-border bg-background/60 text-foreground min-h-[72px] text-sm"
            placeholder="What do you think is causing the incident?"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label
              htmlFor="bugfix-root-cause"
              className="text-muted-foreground block text-xs font-semibold tracking-wide uppercase"
            >
              Root Cause
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!bugfixReflection.rootCause.trim()}
              onClick={() => onBugfixReflectionCommit?.("rootCause")}
              className="border-border text-foreground hover:bg-muted/40 h-8 px-2 text-xs"
            >
              <Save className="mr-1 h-3 w-3" />
              Save root cause
            </Button>
          </div>
          <Textarea
            id="bugfix-root-cause"
            value={bugfixReflection.rootCause}
            onChange={(event) => onBugfixReflectionChange?.("rootCause", event.target.value)}
            onBlur={() => onBugfixReflectionCommit?.("rootCause")}
            className="border-border bg-background/60 text-foreground min-h-[72px] text-sm"
            placeholder="What failed, and why?"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label
              htmlFor="bugfix-prevention"
              className="text-muted-foreground block text-xs font-semibold tracking-wide uppercase"
            >
              Prevention
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!bugfixReflection.prevention.trim()}
              onClick={() => onBugfixReflectionCommit?.("prevention")}
              className="border-border text-foreground hover:bg-muted/40 h-8 px-2 text-xs"
            >
              <Save className="mr-1 h-3 w-3" />
              Save prevention
            </Button>
          </div>
          <Textarea
            id="bugfix-prevention"
            value={bugfixReflection.prevention}
            onChange={(event) => onBugfixReflectionChange?.("prevention", event.target.value)}
            onBlur={() => onBugfixReflectionCommit?.("prevention")}
            className="border-border bg-background/60 text-foreground min-h-[72px] text-sm"
            placeholder="What test, guardrail, or monitoring would catch this next time?"
          />
        </div>
      </div>
    </div>
  )
}
