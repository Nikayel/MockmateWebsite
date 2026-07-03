"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Eraser, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { ExecutorTopBar } from "@/components/tutorials/ExecutorTopBar"
import { ExecutorSidePanel } from "@/components/tutorials/ExecutorSidePanel"
import { usePersistentState } from "@/components/tutorials/usePersistentState"
import { usePythonExecutor } from "@/components/tutorials/usePythonExecutor"

const STARTER_CODE = `# Free-form Python — write anything and hit Run (⌘↵).
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
 * Layout follows HANDOFF-PythonExecutor: a slim breadcrumb bar (no site nav) over a full-height
 * `[300 | 1fr | 340]` panel row that fills the viewport and scrolls internally — the page itself
 * never scrolls vertically; below 940px the whole tool scrolls sideways as one unit. Run/Clear live
 * in the editor header (⌘↵ runs); Output shows real stdout + a status pill. Editor/problem/scratchpad
 * persist to localStorage so a reload doesn't lose work.
 */
export default function PythonExecutorPage() {
  const [code, setCode] = usePersistentState("cs_pyexec_code", STARTER_CODE)
  const { running, warming, status, elapsedMs, output, result, error, run, clear } =
    usePythonExecutor()

  // ⌘↵ / Ctrl↵ runs from anywhere in the tool. Refs keep the listener stable while reading latest.
  const codeRef = useRef(code)
  const runningRef = useRef(running)
  useEffect(() => {
    codeRef.current = code
  }, [code])
  useEffect(() => {
    runningRef.current = running
  }, [running])

  const runCode = () => {
    if (runningRef.current || !codeRef.current.trim()) return
    void run(codeRef.current)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        runCode()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // runCode reads refs only, so the listener never needs re-binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClear = () => {
    setCode("")
    clear()
  }

  // ⌘ on Mac, Ctrl elsewhere. Resolved post-mount to avoid a hydration mismatch.
  const [runHint, setRunHint] = useState("Ctrl↵")
  useEffect(() => {
    if (/Mac|iPhone|iPad|iPod/.test(navigator.platform)) setRunHint("⌘↵")
  }, [])

  return (
    <div className="h-[100dvh] overflow-x-auto overflow-y-hidden">
      <h1 className="sr-only">Python Executor</h1>
      <div className="flex h-full min-w-[940px] flex-col">
        <ExecutorTopBar />

        <main className="flex min-h-0 flex-1">
          <ExecutorSidePanel />

          {/* Center — editor */}
          <div className="border-border flex min-h-0 min-w-0 flex-1 flex-col border-r">
            <div className="border-border bg-muted/40 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5">
              <span className="text-muted-foreground font-mono text-xs">scratch.py</span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleClear}
                  disabled={running}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-7 gap-1.5"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button
                  onClick={runCode}
                  disabled={running || !code.trim()}
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 h-7 gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  {warming ? "Starting…" : running ? "Running…" : "Run"}
                  <kbd className="border-accent-foreground/30 ml-0.5 hidden rounded border px-1 font-mono text-[10px] opacity-80 sm:inline">
                    {runHint}
                  </kbd>
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <CodeMirrorErrorBoundary>
                <CodeMirrorEditor
                  value={code}
                  onChange={setCode}
                  language="python"
                  height="100%"
                  className="cm-fill h-full"
                />
              </CodeMirrorErrorBoundary>
            </div>
          </div>

          {/* Right — output */}
          <div className="bg-card flex min-h-0 w-[340px] shrink-0 flex-col">
            <div className="border-border bg-muted/40 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
              <span className="text-muted-foreground font-mono text-xs tracking-wide">OUTPUT</span>
              <RunStatus status={status} warming={warming} elapsedMs={elapsedMs} />
            </div>
            <div
              className="flex-1 overflow-auto px-3 py-3 font-mono text-sm"
              aria-live="polite"
              aria-label="Program output"
            >
              {status === "idle" && !running && (
                <p className="text-muted-foreground/70">Run your code to see output here.</p>
              )}
              {warming && (
                <p className="text-muted-foreground/70">
                  Starting Python… the first run downloads the runtime (once).
                </p>
              )}
              {output.map((line, i) => (
                <p
                  key={i}
                  className={
                    line.type === "error"
                      ? "whitespace-pre-wrap text-rose-600 dark:text-rose-400"
                      : "text-foreground/90 whitespace-pre-wrap"
                  }
                >
                  {line.message}
                </p>
              ))}
              {result !== undefined && result !== null && (
                <p className="text-muted-foreground mt-1">
                  <span className="text-accent">{">>> "}</span>
                  {typeof result === "string" ? result : JSON.stringify(result)}
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-2 flex items-start gap-1.5 whitespace-pre-wrap text-rose-600 dark:text-rose-400"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-pre-wrap">{error}</span>
                </p>
              )}
              {status === "success" &&
                output.length === 0 &&
                (result === undefined || result === null) &&
                !error && (
                  <p className="text-muted-foreground/60">(ran successfully — no output)</p>
                )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/** The mono status pill in the Output header: ready / running… / ✓ Nms / error. A polite live
 * region so screen-reader users hear the run result (success + timing), not just sighted users. */
function RunStatus({
  status,
  warming,
  elapsedMs,
}: {
  status: ReturnType<typeof usePythonExecutor>["status"]
  warming: boolean
  elapsedMs: number | null
}) {
  let label = "ready"
  let tone = "text-muted-foreground/60"
  if (status === "running") {
    label = warming ? "starting…" : "running…"
    tone = "text-muted-foreground"
  } else if (status === "success") {
    label = `✓ ${elapsedMs}ms`
    tone = "text-emerald-600 dark:text-emerald-400"
  } else if (status === "error") {
    label = "error"
    tone = "text-rose-600 dark:text-rose-400"
  }
  return (
    <span role="status" aria-live="polite" className={`font-mono text-xs ${tone}`}>
      {label}
    </span>
  )
}
