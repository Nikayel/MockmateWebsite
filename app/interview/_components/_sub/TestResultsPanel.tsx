"use client"

import { CheckCircle, PlayCircle, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { Scenario } from "@/lib/scenarios"
import type { EditorLanguage } from "../../_types"
import { isLanguageSupported } from "../../_utils/language"

interface TestResultsPanelProps {
  selectedScenario: Scenario | null
  selectedLanguage: EditorLanguage
  isRunningTests: boolean
  showFeedback: boolean
  showPostInterviewDiscussion: boolean
  onSubmitSystemDesign: () => void
  onRunCode: () => void
  onSubmitCode: () => void
  onSelectedLanguageChange: (language: EditorLanguage) => void
  /** Guided labs block Submit until every milestone is done (so the user can't
   * finish before discovering the later bug). */
  guidedLabBlocksSubmit?: boolean
}

export function TestResultsPanel({
  selectedScenario,
  selectedLanguage,
  isRunningTests,
  showFeedback,
  showPostInterviewDiscussion,
  onSubmitSystemDesign,
  onRunCode,
  onSubmitCode,
  onSelectedLanguageChange,
  guidedLabBlocksSubmit = false,
}: TestResultsPanelProps) {
  const runWithLanguageGuard = (action: () => void, actionName: "run tests" | "submit") => {
    if (!isLanguageSupported(selectedLanguage)) {
      toast.error(`${selectedLanguage.toUpperCase()} execution not supported yet`, {
        description:
          actionName === "run tests"
            ? "Switch to JavaScript or Python to run tests."
            : "Switch to JavaScript or Python to submit.",
        duration: 6000,
        action: {
          label: "Use JavaScript",
          onClick: () => onSelectedLanguageChange("javascript"),
        },
      })
      return
    }
    action()
  }

  return selectedScenario?.type === "system-design" ? (
    <div className="flex flex-shrink-0 flex-col gap-2">
      <div className="text-muted-foreground text-right text-xs">
        Document your design decisions above, then submit when ready
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={onSubmitSystemDesign}
          disabled={showFeedback || showPostInterviewDiscussion}
          loading={isRunningTests}
          className="bg-accent hover:bg-accent/80 text-accent-foreground h-9 text-sm font-semibold"
          aria-label={isRunningTests ? "Submitting design..." : "Submit Design"}
        >
          {!isRunningTests && <CheckCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
          {isRunningTests ? "Submitting..." : "Submit Design"}
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex flex-shrink-0 items-center justify-end gap-2">
      {!isLanguageSupported(selectedLanguage) && (
        <span className="mr-1 text-xs text-amber-300">Use JS/Python to run tests</span>
      )}
      {guidedLabBlocksSubmit && (
        <span className="mr-1 text-xs text-amber-300">Finish all lab milestones to submit</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => runWithLanguageGuard(onRunCode, "run tests")}
        disabled={showFeedback || isRunningTests}
        className={`${
          isLanguageSupported(selectedLanguage)
            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
            : "border-border bg-muted text-muted-foreground hover:bg-muted"
        }`}
        aria-label={isRunningTests ? "Running tests" : "Run tests"}
        data-bugfix-tour={selectedScenario?.type === "bugfix" ? "run-tests" : undefined}
      >
        {!isRunningTests && <PlayCircle className="mr-1 h-4 w-4" aria-hidden="true" />}
        {isRunningTests ? "Running..." : "Run Tests"}
      </Button>
      <Button
        onClick={() => runWithLanguageGuard(onSubmitCode, "submit")}
        disabled={showFeedback || isRunningTests || guidedLabBlocksSubmit}
        title={guidedLabBlocksSubmit ? "Finish all lab milestones before submitting" : undefined}
        className="bg-accent hover:bg-accent/80 text-accent-foreground h-9 text-sm font-semibold"
        aria-label={selectedScenario?.type === "bugfix" ? "Submit fix" : "Submit solution"}
      >
        <Send className="mr-1 h-4 w-4" aria-hidden="true" />
        {selectedScenario?.type === "bugfix" ? "Submit Fix" : "Submit"}
      </Button>
    </div>
  )
}
