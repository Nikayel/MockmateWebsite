"use client"

import { useState } from "react"
import { AlertCircle, Eraser, Play, Terminal } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { ColdStartNote } from "@/components/tutorials/ColdStartNote"
import { ExecutorSidePanel } from "@/components/tutorials/ExecutorSidePanel"
import { usePythonExecutor } from "@/components/tutorials/usePythonExecutor"

const STARTER_CODE = `# Free-form Python — write anything and hit Run.
print("Hello from CodeSparring!")

for n in range(5):
    print(n, n * n)
`

/**
 * A standalone, open Python scratchpad — no lessons, no grading, no auth gate (unlike
 * `/learn/python`, this route is intentionally NOT in `proxy.ts` PROTECTED_ROUTES). Runs entirely
 * client-side via the same Pyodide worker the tutorials use (`runPythonInWorker`), so it's free to
 * offer with no quota. Reachable from the Learn Python Path as "Python Executor".
 *
 * Full-height 3-pane layout (side panel | editor | output) so the code panel still gets most of the
 * width — the side panel is a "Problem" (paste-and-read reference) / "Scratchpad"
 * (Understand → Plan → Implement) tab pair, not a 4th column.
 */
export default function PythonExecutorPage() {
  const [code, setCode] = useState(STARTER_CODE)
  const { running, warming, output, result, error, run, clear } = usePythonExecutor()

  const handleRun = () => {
    void run(code)
  }

  const handleClear = () => {
    setCode("")
    clear()
  }

  return (
    <>
      <Header />
      {/* sr-only heading: no visible title chrome, but the page still has a labeled landmark. */}
      <h1 className="sr-only">Python Executor</h1>
      <div className="flex h-[calc(100dvh-80px)] flex-col pt-20">
        <div className="border-border flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <span className="text-muted-foreground font-mono text-xs">Python Executor</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={handleRun}
              disabled={running || !code.trim()}
              size="sm"
              className="gap-2"
            >
              <Play className="h-3.5 w-3.5" />
              {warming ? "Starting Python…" : running ? "Running…" : "Run"}
            </Button>
            <Button
              onClick={handleClear}
              disabled={running}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Eraser className="h-3.5 w-3.5" />
              Clear
            </Button>
            <ColdStartNote warming={warming} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <ExecutorSidePanel />

          <div className="lg:border-border flex min-h-0 flex-1 flex-col border-t lg:border-t-0 lg:border-r">
            <div className="border-border bg-muted/40 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
              <span className="text-muted-foreground font-mono text-xs">scratch.py</span>
            </div>
            <div className="min-h-0 flex-1">
              <CodeMirrorErrorBoundary>
                <CodeMirrorEditor
                  value={code}
                  onChange={setCode}
                  language="python"
                  height="100%"
                  className="h-full"
                />
              </CodeMirrorErrorBoundary>
            </div>
          </div>

          <div className="border-border bg-card flex min-h-0 flex-1 flex-col border-t lg:w-[420px] lg:flex-none lg:border-t-0">
            <div className="border-border bg-muted/40 flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
              <Terminal className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-muted-foreground font-mono text-xs">Output</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 font-mono text-sm">
              {output.length === 0 && result === undefined && !error && !running && (
                <p className="text-muted-foreground/70">Run your code to see output here.</p>
              )}
              {output.map((line, i) => (
                <p
                  key={i}
                  className={
                    line.type === "error"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-foreground/90 whitespace-pre-wrap"
                  }
                >
                  {line.message}
                </p>
              ))}
              {result !== undefined && (
                <p className="text-muted-foreground mt-1">
                  <span className="text-accent">{">>> "}</span>
                  {typeof result === "string" ? result : JSON.stringify(result)}
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-2 flex items-start gap-1.5 text-rose-600 dark:text-rose-400"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-pre-wrap">{error}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
