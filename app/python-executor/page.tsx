"use client"

import { useState } from "react"
import { AlertCircle, Eraser, Play, Terminal } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { ColdStartNote } from "@/components/tutorials/ColdStartNote"
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
      <div className="pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="mx-auto max-w-4xl px-4">
          <header className="mb-6">
            <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase">
              Python Executor
            </p>
            <h1 className="text-foreground mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
              Run Python, freely
            </h1>
          </header>

          <div className="border-border overflow-hidden rounded-xl border shadow-sm">
            <div className="border-border bg-muted/40 flex items-center justify-between border-b px-3 py-2">
              <span className="text-muted-foreground font-mono text-xs">scratch.py</span>
            </div>
            <CodeMirrorErrorBoundary>
              <CodeMirrorEditor value={code} onChange={setCode} language="python" height={340} />
            </CodeMirrorErrorBoundary>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={handleRun} disabled={running || !code.trim()} className="gap-2">
              <Play className="h-4 w-4" />
              {warming ? "Starting Python…" : running ? "Running…" : "Run"}
            </Button>
            <Button onClick={handleClear} disabled={running} variant="outline" className="gap-2">
              <Eraser className="h-4 w-4" />
              Clear
            </Button>
            <ColdStartNote warming={warming} />
          </div>

          <div className="border-border bg-card mt-6 overflow-hidden rounded-xl border shadow-sm">
            <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-2">
              <Terminal className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-muted-foreground font-mono text-xs">Output</span>
            </div>
            <div className="min-h-[120px] px-3 py-3 font-mono text-sm">
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
