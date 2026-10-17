import { ArrowUpRight, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TestResult } from "./CodeConsole"
import { TERMINAL_PRE } from "./TerminalOutput"

interface ConsoleTestResultProps {
  result: TestResult
  sourcePath?: string
  onOpenTestSource?: (path: string) => void
}

function formatValue(value: unknown): string {
  const compact = JSON.stringify(value)
  if (compact === undefined) return String(value)
  return compact.length > 60 ? JSON.stringify(value, null, 2) : compact
}

export function ConsoleTestResult({
  result,
  sourcePath,
  onOpenTestSource,
}: ConsoleTestResultProps) {
  const canOpen = !result.passed && !result.isHidden && sourcePath && onOpenTestSource
  const StatusIcon = result.passed ? CheckCircle : XCircle

  return (
    <div className="py-0.5">
      <div
        className={cn(
          "flex items-start gap-2",
          result.passed ? "text-[var(--console-success)]" : "text-[var(--console-error)]"
        )}
      >
        <StatusIcon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        {canOpen ? (
          <button
            type="button"
            aria-label={`Open test file ${sourcePath}: ${result.description}`}
            onClick={() => onOpenTestSource(sourcePath)}
            className="group focus-visible:ring-ring hover:bg-muted/50 -mt-1 min-h-11 min-w-0 flex-1 rounded px-1 py-1 text-left focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="text-muted-foreground block break-words group-hover:underline">
              {result.description}
            </span>
            <span className="text-foreground mt-0.5 flex items-start gap-1 text-[11px] break-words">
              <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{sourcePath}</span>
            </span>
          </button>
        ) : (
          <span className="text-muted-foreground min-w-0 break-words">{result.description}</span>
        )}
      </div>
      {!result.passed && (
        <div className="mt-1 ml-5 space-y-0.5 text-[11px]">
          {result.isHidden ? (
            <span className="text-muted-foreground italic">
              This test case is hidden. The implementation failed to meet the required behavior.
            </span>
          ) : (
            <>
              {/* Suite tags are not test inputs. Only structured DSA inputs belong here. */}
              {result.input != null && typeof result.input === "object" && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">Input:</span>
                  <pre className={cn(TERMINAL_PRE, "text-[var(--console-info)]")}>
                    {formatValue(result.input)}
                  </pre>
                </div>
              )}
              {result.error ? (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">Error:</span>
                  <pre className={cn(TERMINAL_PRE, "text-[var(--console-error)]")}>
                    {result.error}
                  </pre>
                </div>
              ) : result.expected !== undefined || result.actual !== undefined ? (
                <>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-14 shrink-0">Expected:</span>
                    <pre className={cn(TERMINAL_PRE, "text-[var(--console-success)]")}>
                      {formatValue(result.expected)}
                    </pre>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-14 shrink-0">Got:</span>
                    <pre className={cn(TERMINAL_PRE, "text-[var(--console-error)]")}>
                      {formatValue(result.actual)}
                    </pre>
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground italic">This check did not pass.</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
