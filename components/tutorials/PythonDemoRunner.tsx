"use client"

import { useState } from "react"
import { FileCode2, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import {
  isPythonRuntimeWarm,
  markPythonRuntimeWarm,
  runPythonInWorker,
} from "@/lib/workspace-execution"
import { ColdStartNote } from "./ColdStartNote"
import { useLessonTelemetry } from "./LessonTelemetryProvider"

/**
 * The worked example in the Read phase, made runnable and editable.
 *
 * WHY: Python teach demos rendered through `ReadOnlyCodeBlock` — 54 code samples the
 * learner could read and not touch, in a browser that was already running a Python
 * interpreter for the graded exercises. SQL lessons at least auto-ran their example.
 * The cheapest real gain in the whole Read phase was letting the learner change a
 * value and see what happens, which is the difference between being told that
 * `0.1 + 0.2 != 0.3` and watching it print.
 *
 * Deliberately NOT a grader: no tests, no pass state, no progress effect. It is a
 * scratchpad scoped to this lesson's example, so experimenting carries no cost. The
 * learner can always get back to the authored version with Reset.
 */
export function PythonDemoRunner({
  code,
  lessonId,
  label = "Live example",
}: {
  code: string
  lessonId: string
  label?: string
}) {
  const { record } = useLessonTelemetry()
  const [draft, setDraft] = useState(code)
  const [output, setOutput] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [running, setRunning] = useState(false)
  const [warming, setWarming] = useState(false)

  const edited = draft !== code

  const handleRun = async () => {
    setRunning(true)
    setWarming(!isPythonRuntimeWarm())
    const startedAt = Date.now()
    try {
      const result = await runPythonInWorker(draft)
      const text = result.logs
        .map((entry) => entry.message)
        .join("\n")
        .trim()

      if (result.success) {
        setFailed(false)
        // A script whose only statements are assignments genuinely prints nothing.
        // Say so rather than leaving an empty box that reads as a broken runner.
        setOutput(text || "Ran with no output. Add a print() to see a value.")
      } else {
        setFailed(true)
        setOutput([text, result.error].filter(Boolean).join("\n\n") || "Couldn't run this example.")
      }

      record({
        kind: "demo_run",
        section: "teach",
        itemId: `${lessonId}#demo`,
        edited,
        passed: result.success,
        latencyMs: Date.now() - startedAt,
      })
    } catch (error) {
      setFailed(true)
      setOutput(error instanceof Error ? error.message : "Couldn't run this example.")
    } finally {
      markPythonRuntimeWarm()
      setWarming(false)
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="border-border overflow-hidden rounded-lg border">
        <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-1.5">
          <FileCode2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground font-mono text-xs">{label}</span>
          <span className="text-muted-foreground/80 ml-auto text-xs">
            Editable. Nothing here is graded.
          </span>
        </div>
        <CodeMirrorErrorBoundary>
          <CodeMirrorEditor
            value={draft}
            onChange={setDraft}
            language="python"
            autoHeight
            minHeight={80}
            maxHeight={360}
          />
        </CodeMirrorErrorBoundary>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleRun} disabled={running} size="sm" className="gap-2">
          <Play className="h-3.5 w-3.5" />
          {warming ? "Starting Python…" : running ? "Running…" : "Run it"}
        </Button>
        <ColdStartNote warming={warming} />
        {edited && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(code)
              setOutput(null)
              setFailed(false)
            }}
            className="gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset example
          </Button>
        )}
      </div>

      {output !== null && (
        <div
          role="status"
          aria-live="polite"
          className={
            failed
              ? "rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2"
              : "border-border bg-muted/30 rounded-md border px-3 py-2"
          }
        >
          <pre className="text-foreground/90 font-mono text-xs whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  )
}
