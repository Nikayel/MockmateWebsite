"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Lightbulb } from "lucide-react"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"

/**
 * The revealed-hints panel for the single-file runners. Hints are authored markdown (they carry
 * inline `code` spans of SQL/Python), so they render through `MarkdownRenderer` instead of as raw
 * text: the code formats as code and long snippets wrap instead of showing literal backticks. The
 * panel is collapsible so a learner can tuck the hints away once read, and it re-opens automatically
 * when a new hint is revealed so the fresh one is never hidden behind a collapsed header. Renders
 * nothing until the first hint is revealed.
 */
export function HintList({ hints, total }: { hints: string[]; total: number }) {
  const [open, setOpen] = useState(true)

  // Re-open whenever another hint is revealed so it isn't hidden behind a collapsed panel.
  useEffect(() => {
    if (hints.length > 0) setOpen(true)
  }, [hints.length])

  if (hints.length === 0) return null

  return (
    <section
      className="border-border bg-muted/30 overflow-hidden rounded-xl border"
      aria-label="Hints"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-visible:ring-accent/50 flex w-full items-center gap-2 px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <Lightbulb className="text-accent h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-foreground text-sm font-medium">Hints</span>
        <span className="text-muted-foreground text-xs">
          {hints.length} of {total} shown
        </span>
        <ChevronDown
          className={[
            "text-muted-foreground ml-auto h-4 w-4 shrink-0 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ol className="flex flex-col gap-2 px-3 pt-1 pb-3">
          {hints.map((hint, i) => (
            <li
              key={i}
              className="border-border/60 bg-background/40 flex gap-2.5 rounded-lg border p-2.5"
            >
              <span
                className="bg-accent/15 text-accent-strong mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="prose prose-sm dark:prose-invert prose-p:my-0 max-w-none text-sm leading-relaxed [&_code]:break-words [&_code]:whitespace-pre-wrap">
                <MarkdownRenderer content={hint} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
