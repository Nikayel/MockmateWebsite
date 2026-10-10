import { createRoot } from "react-dom/client"
import { SavedPracticeCard } from "@/components/dashboard/SavedPracticeCard"
import { ScoreDisplay } from "@/components/practice/ScoreDisplay"
import { FeedbackSections } from "@/components/practice/FeedbackSections"
import { TooltipProvider } from "@/components/ui/tooltip"
import { parseFeedback } from "@/lib/feedback/parsers"
import { scenarios } from "@/lib/scenarios"
import "@/app/globals.css"

const params = new URLSearchParams(window.location.search)
document.documentElement.classList.toggle("dark", params.get("theme") !== "light")
const scenario = scenarios.find((candidate) => candidate.id === params.get("scenario"))
const report = "A working map-based solution. Explain the lookup before implementing it."
const sections = {
  ...parseFeedback(report),
  tldr: report,
  whatWorked: ["Used a map to avoid repeated scans.", "Checked duplicate values."],
  fixNext: ["Explain what each map entry represents before implementing the lookup."],
}

createRoot(document.getElementById("root")!).render(
  <main className="bg-background text-foreground min-h-screen px-4 py-8 sm:px-8">
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-muted-foreground text-sm">
        Local verification fixture · simulated account and storage
      </p>
      {window.location.pathname === "/interview" ? (
        <section>
          <h1 className="text-xl font-semibold">{scenario?.title ?? "Scenario not found"}</h1>
          <p>Selected language: {params.get("language")}</p>
          <p>This task is selected. Opening it has not started a session.</p>
        </section>
      ) : window.location.pathname === "/dashboard" ? (
        <SavedPracticeCard />
      ) : (
        <>
          <h1 className="text-xl font-semibold">Interview feedback</h1>
          <TooltipProvider>
            <div className="space-y-4">
              <ScoreDisplay
                sections={sections}
                overallScore={70}
                performanceScore={70}
                technicalScore={75}
                scoreBreakdown={{
                  understandingScore: 70,
                  problemSolvingScore: 75,
                  codeQualityScore: 80,
                  communicationScore: 45,
                }}
                testsPassed={3}
                testsTotal={3}
                elapsedTime={900}
                problemType="dsa"
                problemTitle="Two Sum"
                feedback={report}
              />
              <FeedbackSections
                sections={sections}
                problemType="dsa"
                userId="fixture-owner"
                sessionId="source"
              />
            </div>
          </TooltipProvider>
        </>
      )}
    </div>
  </main>
)
