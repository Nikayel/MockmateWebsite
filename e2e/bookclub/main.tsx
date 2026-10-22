import { captureLabCheckpoint, captureLabMessage } from "@/lib/bugfix/guided-lab/assessment/capture"
import { applyGuidedLabGating } from "@/lib/bugfix/guided-lab/assessment/execution"
import { buildLabAssessment } from "@/lib/bugfix/guided-lab/assessment/report"
import { labAssessmentSchema } from "@/lib/bugfix/guided-lab/assessment/schema"
import { GuidedLabReview } from "@/components/practice/GuidedLabReview"
import { useState } from "react"
import { createRoot } from "react-dom/client"
import { ScenarioBrowser } from "@/components/interview/ScenarioBrowser"
import { GuidedLabRail } from "@/app/interview/_components/guided-lab/GuidedLabRail"
import { EditorColumn } from "@/app/interview/_components/EditorColumn"
import { TooltipProvider } from "@/components/ui/tooltip"
import { bugfixBookclubReadingStreakWorkspaceScenario as scenario } from "@/lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace"
import { executeWorkspaceScenarioPythonClientSide } from "@/lib/workspace-execution/python-sandbox/workspace-runner"
import { useGuidedLabStore } from "@/lib/stores/guided-lab-store"
import type { WorkspaceContextFile } from "@/app/interview/_types"
import type { TestResult } from "@/lib/stores"
import type { WorkspaceScenario } from "@/lib/workspace-execution"
import "@/app/globals.css"

const params = new URLSearchParams(window.location.search)
document.documentElement.classList.toggle("dark", params.get("theme") !== "light")
const started = params.get("scenario") === scenario.id
const noop = () => {}
function App() {
  const [files, setFiles] = useState<WorkspaceContextFile[]>(() => {
    const edits = JSON.parse(sessionStorage.getItem("bookclub-browser-edits") ?? "{}") as Record<
      string,
      string
    >
    return scenario
      .workspace!.files.filter((file) => !file.hidden)
      .map((file) => ({
        ...file,
        originalContent: file.content,
        content: edits[file.path] ?? file.content,
      }))
  })
  const [path, setPath] = useState("app/services/stats_service.py")
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(params.has("review"))
  const [explanation, setExplanation] = useState("")
  const savedAssessment = labAssessmentSchema.safeParse(
    JSON.parse(sessionStorage.getItem("bookclub-assessment") ?? "null")
  )
  const active = files.find((file) => file.path === path)!
  async function run() {
    captureLabCheckpoint(scenario.id, files)
    const sourceRevision = useGuidedLabStore.getState().sourceRevision
    const phaseId = useGuidedLabStore.getState().progress?.currentMilestoneId
    setRunning(true)
    const output = await executeWorkspaceScenarioPythonClientSide(
      scenario as WorkspaceScenario,
      files.filter((file) => file.role === "editable")
    )
    setError(output.error ?? "")
    setResults(
      output.results.map((row) => ({
        description: row.name,
        input: row.suite,
        expected: "pass",
        actual: row.passed ? "pass" : "fail",
        passed: row.passed,
        error: row.error ?? null,
      }))
    )
    applyGuidedLabGating(
      scenario.id,
      output.results.map((row) => ({
        description: row.name,
        input: row.suite,
        passed: row.passed,
        error: row.error ?? null,
      })),
      sourceRevision,
      phaseId
    )
    setRunning(false)
  }
  const passed = results.filter((result) => result.passed).length
  return (
    <TooltipProvider>
      {submitted && savedAssessment.success ? (
        <GuidedLabReview
          contained
          assessment={savedAssessment.data}
          testsPassed={36}
          testsTotal={36}
          problemTitle={scenario.title}
        />
      ) : !started ? (
        <ScenarioBrowser
          usageLimit={null}
          completedProblems={[]}
          onStartInterview={(selected) => {
            if (selected.id === scenario.id)
              window.location.href = `/interview?track=debugging&scenario=${scenario.id}&practice=true`
          }}
        />
      ) : (
        <main className="bg-background text-foreground min-h-screen p-4">
          <h1 className="mb-4 text-xl font-semibold">{scenario.title}</h1>
          <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside>
              <GuidedLabRail config={scenario.guidedLab!} scenarioId={scenario.id} />
            </aside>
            <section className="min-w-0">
              <label className="block text-sm">
                Explain your diagnosis
                <input
                  aria-label="Explain your diagnosis"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </label>
              <button
                onClick={() => {
                  captureLabMessage(scenario.id, "candidate", "interviewer", explanation)
                  setExplanation("")
                }}
              >
                Record explanation
              </button>
              <label className="mb-2 block text-sm">
                Workspace file
                <select
                  className="bg-background border-border ml-2 max-w-full rounded border p-2"
                  aria-label="Workspace file"
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                >
                  {files.map((file) => (
                    <option key={file.path}>{file.path}</option>
                  ))}
                </select>
              </label>
              <div className="h-[800px] max-h-[90dvh]">
                <EditorColumn
                  activePanel="editor"
                  selectedScenario={scenario}
                  activeWorkspaceFile={active}
                  selectedLanguage="python"
                  editorLanguage={active.language ?? "python"}
                  code={active.content}
                  onCodeChange={(content) => {
                    setFiles((previous) => {
                      const updated = previous.map((file) =>
                        file.path === path ? { ...file, content } : file
                      )
                      sessionStorage.setItem(
                        "bookclub-browser-edits",
                        JSON.stringify(
                          Object.fromEntries(
                            updated
                              .filter((file) => file.role === "editable")
                              .map((file) => [file.path, file.content])
                          )
                        )
                      )
                      return updated
                    })
                  }}
                  isInterviewStarted
                  showScenarioBrowser={false}
                  showFeedback={false}
                  showPostInterviewDiscussion={false}
                  isActiveWorkspaceFileEditable={active.role === "editable"}
                  onStartInterview={noop}
                  editorConsoleOutputs={[]}
                  testResults={results}
                  testSummary={{
                    total: results.length,
                    passed,
                    failed: results.length - passed,
                    passRate: results.length ? (passed / results.length) * 100 : 0,
                  }}
                  packRun={null}
                  isRunningTests={running}
                  onClearConsole={noop}
                  onSubmitSystemDesign={noop}
                  onRunCode={run}
                  onSubmitCode={() => {
                    const report = buildLabAssessment(
                      scenario.guidedLab!,
                      useGuidedLabStore.getState().progress?.evidence
                    )
                    sessionStorage.setItem("bookclub-assessment", JSON.stringify(report))
                    setSubmitted(true)
                  }}
                  onSelectedLanguageChange={noop}
                  workspaceContext={files}
                />
              </div>
              {error && <p role="alert">{error}</p>}
              {submitted && <p role="status">Verified fix submitted in browser fixture</p>}
            </section>
          </div>
        </main>
      )}
    </TooltipProvider>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
