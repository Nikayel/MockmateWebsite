"use client"

import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import type { TeachSection } from "@/lib/tutorials/types"

/**
 * The "Read" phase: self-contained teaching markdown plus an optional, read-only live example
 * (shown highlighted rather than executed — a demo has no test cases, so running it has nothing
 * to grade). Ends with the hand-off to the "Apply" phase.
 */
export interface TeachPanelProps {
  teach: TeachSection
  onContinue: () => void
  continueLabel?: string
  /** Syntax-highlighting language for the demo block. Defaults to "python" (Python call sites unchanged). */
  demoLanguage?: string
}

export function TeachPanel({
  teach,
  onContinue,
  continueLabel = "I've got it — let me try",
  demoLanguage = "python",
}: TeachPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownRenderer content={teach.markdown} />
      </div>

      {teach.demoCode && (
        <div className="border-border overflow-hidden rounded-lg border">
          <div className="border-border bg-muted/40 text-muted-foreground border-b px-3 py-1.5 text-xs font-medium">
            Live example
          </div>
          <CodeMirrorErrorBoundary>
            <CodeMirrorEditor
              value={teach.demoCode}
              language={demoLanguage}
              height={140}
              readOnly
            />
          </CodeMirrorErrorBoundary>
        </div>
      )}

      <div>
        <Button onClick={onContinue} className="gap-2">
          {continueLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
