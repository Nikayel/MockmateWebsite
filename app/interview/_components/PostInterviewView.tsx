"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReviewFrame } from "@/components/practice/ReviewFrame"
import { ReviewCode } from "./post-interview/ReviewCode"
import { ReviewDiscussion } from "./post-interview/ReviewDiscussion"
import type { PostInterviewViewProps } from "./post-interview/types"

export type { PostInterviewViewProps } from "./post-interview/types"

export function PostInterviewView(props: PostInterviewViewProps) {
  const [mobilePanel, setMobilePanel] = useState<"discussion" | "code">("discussion")
  const { testSummary, showCodeInDiscussion, setShowCodeInDiscussion } = props
  return (
    <ReviewFrame
      title="Review your submission"
      summary={
        testSummary.total > 0
          ? `${testSummary.passed}/${testSummary.total} tests passed`
          : "Submission complete"
      }
      scrollContent={false}
      actions={
        <>
          <Button
            variant="ghost"
            className="text-muted-foreground hidden min-h-11 md:inline-flex"
            aria-pressed={showCodeInDiscussion}
            onClick={() => setShowCodeInDiscussion(!showCodeInDiscussion)}
          >
            {showCodeInDiscussion ? "Hide code" : "Show code"}
          </Button>
          {testSummary.total > 0 && testSummary.passRate < 100 && (
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => props.setShowPostInterviewDiscussion(false)}
            >
              <span className="hidden sm:inline">Continue editing</span>
              <span className="sm:hidden">Edit code</span>
            </Button>
          )}
          {props.onClose && (
            <Button
              variant="outline"
              className="h-11 w-11 p-0 sm:w-auto sm:px-4"
              onClick={props.onClose}
              aria-label="Close review"
            >
              <X className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">Close</span>
            </Button>
          )}
          <Button
            className="min-h-11"
            onClick={props.proceedToFinalFeedback}
            loading={props.isGeneratingFeedback}
            disabled={props.isGeneratingFeedback}
          >
            View feedback
          </Button>
        </>
      }
    >
      <div className="flex shrink-0 items-center justify-between px-3 pt-3 sm:px-6 md:hidden">
        <div
          role="group"
          aria-label="Review panel"
          className="bg-muted flex rounded-lg p-1 md:hidden"
        >
          {(["discussion", "code"] as const).map((panel) => (
            <Button
              key={panel}
              variant="ghost"
              aria-pressed={mobilePanel === panel}
              onClick={() => setMobilePanel(panel)}
              className={`hover:text-foreground dark:hover:bg-background/60 min-h-11 transition-none ${mobilePanel === panel ? "bg-background text-foreground hover:bg-background shadow-sm" : "text-muted-foreground hover:bg-background/60"}`}
            >
              {panel === "discussion" ? "Discussion" : "Submitted code"}
            </Button>
          ))}
        </div>
      </div>
      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 sm:px-6 sm:pb-6 ${showCodeInDiscussion ? "md:grid-cols-2" : ""}`}
      >
        <div
          className={`${mobilePanel === "code" ? "flex" : "hidden"} min-h-0 min-w-0 ${showCodeInDiscussion ? "md:flex" : "md:hidden"}`}
        >
          <ReviewCode
            code={props.code}
            language={props.selectedLanguage}
            results={props.testResults}
          />
        </div>
        <div
          className={`${mobilePanel === "discussion" ? "flex" : "hidden"} min-h-0 min-w-0 md:flex`}
        >
          <ReviewDiscussion {...props} />
        </div>
      </div>
    </ReviewFrame>
  )
}
