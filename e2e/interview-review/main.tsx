import { Fragment, useState } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { InterviewSurfaceFrame } from "@/app/interview/_components/InterviewSurfaceFrame"
import { PostInterviewView } from "@/app/interview/_components/PostInterviewView"
import type { ReviewMessage } from "@/app/interview/_components/post-interview/types"
import PracticeFeedback from "@/components/PracticeFeedback"
import { SessionLifecycleFixture } from "./SessionLifecycleFixture"
import { EmailConsentFixture } from "./EmailConsentFixture"
import { UserMetricsFixture } from "./UserMetricsFixture"
import { AdminSessionFixture } from "./AdminSessionFixture"
import { WorkspaceFixture } from "./WorkspaceFixture"
import { ScenarioBrowser } from "@/components/interview/ScenarioBrowser"
import "@/app/globals.css"

const params = new URLSearchParams(window.location.search)
const theme = params.get("theme") === "light" ? "light" : "dark"
const isDigest = params.get("example") === "digest"
const digestSummary =
  "All 4 tests passed, and the response wrapper is clean, but you didn’t explain the scheduling approach or its complexity, leaving key reasoning hard to assess."
localStorage.setItem("theme", theme)
document.documentElement.classList.toggle("dark", theme === "dark")
const longText =
  "You reproduced the overnight discrepancy before making changes. Compare the retained entries after each cleanup pass with the report contract, and explain why the refresh should replace the earlier expiry."
const code = Array.from(
  { length: 80 },
  (_, index) =>
    `# Cache cleanup review line ${index + 1}\nentries.append({"key": "session-${index}", "expires_at": ${index * 10}})`
).join("\n")
const initialMessages: ReviewMessage[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index),
  type: index % 2 ? "user" : "ai",
  message: `${index + 1}. ${longText}`,
}))

function Fixture() {
  const [view, setView] = useState(params.get("view") ?? "review")
  const [showCode, setShowCode] = useState(true)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState(initialMessages)
  const Surface = params.get("surface") === "saved" ? Fragment : InterviewSurfaceFrame
  return (
    <main className="bg-background text-foreground">
      {view === "email-consent" ? (
        <EmailConsentFixture />
      ) : view === "user-metrics" ? (
        <UserMetricsFixture />
      ) : view === "admin-sessions" ? (
        <AdminSessionFixture />
      ) : view === "lifecycle" ? (
        <SessionLifecycleFixture />
      ) : view === "picker" ? (
        <ScenarioBrowser
          onStartInterview={() => setView("workspace")}
          usageLimit={null}
          completedProblems={[]}
        />
      ) : view === "done" ? (
        <h1>Dashboard return</h1>
      ) : (
        <Surface>
          {view === "workspace" ? (
            <WorkspaceFixture onSubmit={() => setView("review")} />
          ) : view === "feedback" ? (
            <PracticeFeedback
              contained={params.get("surface") !== "saved"}
              feedback={isDigest ? digestSummary : longText}
              structuredFeedback={{
                tldr: isDigest ? digestSummary : longText,
                whatWorked: isDigest
                  ? ["All four scheduling tests passed.", "Kept the response wrapper clean."]
                  : [
                      "Reproduced the failure before editing.",
                      "Checked the boundary at the exact expiry timestamp.",
                    ],
                fixNext: isDigest
                  ? ["Explain how digest jobs are scheduled and how the approach scales."]
                  : Array.from({ length: 9 }, (_, index) => `${index + 1}. ${longText}`),
                actionPlan: isDigest
                  ? ["Walk through one digest schedule and explain its time and space complexity."]
                  : ["Re-run the regression cases and explain the retained state."],
              }}
              performanceScore={isDigest ? 50 : 73}
              technicalScore={80}
              scoreBreakdown={{
                understandingScore: 80,
                problemSolvingScore: 70,
                codeQualityScore: 75,
                communicationScore: 65,
              }}
              testsPassed={isDigest ? 4 : 8}
              testsTotal={isDigest ? 4 : 12}
              elapsedTime={isDigest ? 95 : 960}
              problemType={isDigest ? "feature" : "bugfix"}
              problemTitle={
                isDigest
                  ? "Add Notification Digest Scheduling"
                  : "Cache cleanup: reconcile the overnight report"
              }
              difficulty="hard"
              sessionDate={params.get("surface") === "saved" ? "October 1, 2026" : undefined}
              code={code}
              language="python"
              onClose={() => setView("done")}
            />
          ) : (
            <PostInterviewView
              testSummary={{ total: 12, passed: 8, failed: 4, passRate: 67 }}
              efficiencyMetrics={null}
              code={code}
              selectedLanguage="python"
              testResults={Array.from({ length: 12 }, (_, index) => ({
                description: `Regression case ${index + 1}: retained cache entries match the expected report`,
                passed: index < 8,
                input: null,
                expected: null,
                actual: null,
                error: null,
              }))}
              interviewerMessages={messages}
              isLoadingInterviewer={false}
              isGeneratingDiscussion={false}
              interviewerInput={input}
              setInterviewerInput={setInput}
              handleSendMessage={() => {
                setMessages((previous) => [
                  ...previous,
                  { type: "user", message: input },
                  { type: "ai", message: "New reply: verify the state after both cleanup passes." },
                ])
                setInput("")
              }}
              isRecordingInterviewer={false}
              toggleVoiceRecording={() => {}}
              showCodeInDiscussion={showCode}
              setShowCodeInDiscussion={setShowCode}
              setShowPostInterviewDiscussion={() => setView("workspace")}
              proceedToFinalFeedback={() => setView("feedback")}
              isGeneratingFeedback={false}
              onClose={() => setView("done")}
            />
          )}
        </Surface>
      )}
      {view === "review" && (
        <button
          className="sr-only focus:not-sr-only"
          onClick={() =>
            setMessages((previous) => [
              ...previous,
              { type: "ai", message: "Incoming reply while reading earlier messages." },
            ])
          }
        >
          Simulate incoming reply
        </button>
      )}
    </main>
  )
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}>
    <TooltipProvider>
      <Fixture />
      <Toaster />
    </TooltipProvider>
  </ThemeProvider>
)
