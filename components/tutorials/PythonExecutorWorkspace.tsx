"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Eraser, Loader2, Play, Terminal } from "lucide-react"
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
 * Layout (HANDOFF-PythonExecutor + -UX): a slim breadcrumb bar over a 2-column body
 * `[ left region | center ]`. The center is a vertical stack — editor (flex:1) with the Output panel
 * beneath it — so code and its result share one axis and the editor gets the full center width. The
 * tool is exactly one viewport tall and never scrolls internally; every panel scrolls inside itself;
 * below 940px the tool scrolls sideways as one unit. Run/Clear live in the editor header (⌘↵ runs);
 * editor + notes persist to localStorage.
 *
 * This used to be `app/python-executor/page.tsx` in full, and it owned the route's `<main>`. It no
 * longer does: the page is a Server Component that renders this tool and then, below the fold, the
 * server-rendered description of what the tool is. That copy is the page's only crawlable content,
 * since everything above it is a client-side editor, and `<main>` has to enclose both for a crawler
 * to read it as one page. The tool's own geometry is unchanged: it is still one viewport tall, and
 * a reader has to scroll past it deliberately to reach the prose.
 */
export function PythonExecutorWorkspace() {
  const [code, setCode] = usePersistentState("cs_pyexec_code", STARTER_CODE)
  const { running, warming, status, elapsedMs, output, result, error, run, clear } =
    usePythonExecutor()
  const [cleared, setCleared] = useState(false)

  // Draggable console height (HANDOFF-UX §1 nicety). The persisted px value is the *desired* size;
  // the rendered height is always clamped against the live center height so the editor can never be
  // squeezed to zero (measured via ResizeObserver, so window/layout changes re-clamp — not just drags).
  const centerRef = useRef<HTMLDivElement>(null)
  const [outputHeightRaw, setOutputHeightRaw] = usePersistentState("cs_pyexec_output_h", "220")
  const [maxOutput, setMaxOutput] = useState<number | null>(null)

  useEffect(() => {
    const el = centerRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const measure = () => setMaxOutput(Math.max(130, el.clientHeight - 160))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const desiredOutput = Math.max(130, Number(outputHeightRaw) || 220)
  const outputHeight = maxOutput ? Math.min(desiredOutput, maxOutput) : desiredOutput

  const clampHeight = (px: number) => {
    const ceil =
      maxOutput ?? Math.max(130, (centerRef.current?.clientHeight ?? window.innerHeight) - 160)
    return Math.min(ceil, Math.max(130, px))
  }
  // Track an in-flight drag's teardown so we can also clean up on pointercancel / unmount.
  const dragCleanup = useRef<(() => void) | null>(null)
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = outputHeight
    const onMove = (ev: PointerEvent) =>
      setOutputHeightRaw(String(clampHeight(startH + (startY - ev.clientY))))
    const end = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", end)
      window.removeEventListener("pointercancel", end)
      document.body.style.userSelect = ""
      dragCleanup.current = null
    }
    dragCleanup.current = end
    document.body.style.userSelect = "none"
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", end)
    window.addEventListener("pointercancel", end)
  }
  useEffect(() => () => dragCleanup.current?.(), [])
  const nudgeResize = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") setOutputHeightRaw(String(clampHeight(outputHeight + 24)))
    else if (e.key === "ArrowDown") setOutputHeightRaw(String(clampHeight(outputHeight - 24)))
  }

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
    setCleared(false)
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
    setCleared(true)
  }

  // ⌘ on Mac, Ctrl elsewhere. Resolved post-mount to avoid a hydration mismatch.
  const [runHint, setRunHint] = useState("Ctrl↵")
  useEffect(() => {
    if (/Mac|iPhone|iPad|iPod/.test(navigator.platform)) setRunHint("⌘↵")
  }, [])

  const hasOutput = output.length > 0 || (result !== undefined && result !== null) || Boolean(error)

  return (
    <div className="h-[100dvh] overflow-x-auto overflow-y-hidden">
      <h1 className="sr-only">Python Executor</h1>
      <div className="flex h-full min-w-[940px] flex-col">
        <ExecutorTopBar />

        {/* 2-column body: left region | center (editor stacked over output). */}
        <div className="flex min-h-0 flex-1">
          <ExecutorSidePanel />

          <div ref={centerRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Editor header — filename + the two actions (Run is the single clay primary). */}
            <div className="border-border bg-muted/40 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5">
              <span className="text-muted-foreground font-mono text-xs">scratch.py</span>
              <div className="flex items-center gap-1.5">
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
                  {running ? (
                    <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {warming ? "Starting…" : running ? "Running…" : "Run"}
                  <kbd className="border-accent-foreground/30 ml-0.5 hidden rounded border px-1 font-mono text-[10px] opacity-80 sm:inline">
                    {runHint}
                  </kbd>
                </Button>
              </div>
            </div>

            {/* Editor fills the rest of the center above the console. */}
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

            {/* Drag handle to size the console — the WAI-ARIA window-splitter pattern
                (focusable separator; ↑/↓ nudge). jsx-a11y doesn't model separator as interactive. */}
            {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize output panel"
              aria-valuenow={outputHeight}
              aria-valuemin={130}
              aria-valuemax={maxOutput ?? outputHeight}
              tabIndex={0}
              onPointerDown={startResize}
              onKeyDown={nudgeResize}
              className="border-border hover:bg-accent/30 focus-visible:bg-accent/40 h-1.5 shrink-0 cursor-row-resize border-t transition-colors focus-visible:outline-none"
            />
            {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}

            {/* Output — stacked directly under the editor, sized + internally scrolling. */}
            <div
              className="bg-card flex min-h-[130px] shrink-0 flex-col"
              style={{ height: outputHeight }}
            >
              <div className="border-border bg-muted/40 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs tracking-wide">
                  <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                  OUTPUT
                </span>
                <RunStatus status={status} warming={warming} elapsedMs={elapsedMs} />
              </div>
              <div
                className="flex-1 overflow-auto px-3 py-3 font-mono text-sm"
                aria-live="polite"
                aria-label="Program output"
              >
                {running && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="text-accent h-3.5 w-3.5 motion-safe:animate-spin" />
                    {warming
                      ? "Starting Python… the first run downloads the runtime (once)."
                      : "executing…"}
                  </p>
                )}

                {!running && !hasOutput && status !== "success" && (
                  <p className="text-muted-foreground">
                    {cleared ? "Cleared." : "Run to see output."}
                  </p>
                )}

                {output.map((line, i) => (
                  <p
                    key={i}
                    className={
                      line.type === "error"
                        ? "whitespace-pre-wrap text-rose-600 dark:text-rose-400"
                        : "text-foreground whitespace-pre-wrap"
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

                {!running && status === "success" && !hasOutput && (
                  <p className="text-muted-foreground">(ran successfully — no output)</p>
                )}
              </div>
            </div>
          </div>
        </div>
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
  let tone = "text-muted-foreground"
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
