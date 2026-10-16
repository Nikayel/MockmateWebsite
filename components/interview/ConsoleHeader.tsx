"use client"

import { ChevronDown, ChevronRight, Terminal, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PackRunView } from "@/lib/workspace-execution"
import type { TestSummary } from "./CodeConsole"

interface ConsoleHeaderProps {
  isRunning: boolean
  hasCodeError: boolean
  hasContent: boolean
  testCount: number
  testSummary: TestSummary
  packRun?: PackRunView | null
  onClear?: () => void
  expanded: boolean
  onExpandedChange?: (expanded: boolean) => void
  contentId: string
}

export function ConsoleHeader({
  isRunning,
  hasCodeError,
  hasContent,
  testCount,
  testSummary,
  packRun,
  onClear,
  expanded,
  onExpandedChange,
  contentId,
}: ConsoleHeaderProps) {
  const label = (
    <>
      {onExpandedChange &&
        (expanded ? (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        ))}
      <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Console</span>
      {!hasContent && !isRunning && <span className="font-normal">· No output</span>}
    </>
  )
  const verdict = isRunning
    ? "Running…"
    : packRun
      ? !packRun.ran
        ? "crashed"
        : packRun.match
          ? "oracle match"
          : "oracle mismatch"
      : hasCodeError
        ? "Error"
        : testCount > 0
          ? `${testSummary.passed}/${testSummary.total} tests`
          : null
  const failed =
    !isRunning &&
    (packRun ? !packRun.ran || !packRun.match : hasCodeError || testSummary.failed > 0)

  return (
    <div
      className={cn(
        "border-border bg-muted/40 flex shrink-0 items-center justify-between gap-2",
        expanded && "border-b"
      )}
    >
      {onExpandedChange ? (
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          aria-label={expanded ? "Collapse console" : "Expand console"}
          aria-expanded={expanded}
          aria-controls={contentId}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          {label}
        </button>
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-xs font-medium">
          {label}
        </div>
      )}
      {verdict && (
        <Badge
          className={cn(
            "shrink-0 border-transparent bg-transparent px-1.5 text-xs",
            isRunning
              ? "text-muted-foreground"
              : failed
                ? "text-[var(--console-error)]"
                : "text-[var(--console-success)]"
          )}
        >
          {verdict}
        </Badge>
      )}
      {onClear && hasContent && (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="text-muted-foreground hover:text-foreground h-11 w-11 shrink-0"
          onClick={onClear}
          aria-label="Clear console"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
