"use client"

import dynamic from "next/dynamic"
import { CheckCircle, XCircle } from "lucide-react"
import type { ReviewTestResult } from "./types"

const CodeEditor = dynamic(
  () => import("@/components/editor/CodeMirrorEditor").then((module) => module.CodeMirrorEditor),
  { ssr: false }
)

export function ReviewCode({
  code,
  language,
  results,
}: {
  code: string
  language: string
  results: ReviewTestResult[]
}) {
  return (
    <section
      aria-label="Submitted code"
      className="border-border flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border"
    >
      <header className="border-border/60 flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h2 className="text-sm font-medium">Submitted code</h2>
        <span className="text-muted-foreground text-xs">{language} · Read only</span>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <CodeEditor height="100%" language={language} value={code} readOnly />
      </div>
      {results.length > 0 && (
        <details className="border-border/60 shrink-0 border-t">
          <summary className="focus-visible:ring-ring min-h-11 cursor-pointer px-4 py-3 text-sm focus-visible:ring-2">
            Test results · {results.filter((result) => result.passed).length}/{results.length}
          </summary>
          <ul className="max-h-32 space-y-2 overflow-y-auto px-4 pb-3">
            {results.map((result, index) => (
              <li key={index} className="flex items-start gap-2 text-xs">
                {result.passed ? (
                  <CheckCircle
                    className="text-neural-strong mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-label="Passed"
                  />
                ) : (
                  <XCircle
                    className="text-destructive mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-label="Failed"
                  />
                )}
                <span className="break-words">{result.description}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
