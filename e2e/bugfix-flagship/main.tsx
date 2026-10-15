import { useState } from "react"
import { createRoot } from "react-dom/client"
import { ScenarioList } from "@/components/interview/ScenarioList"
import { prioritizeDebuggingScenarios } from "@/components/interview/scenario-discovery"
import { CodeMirrorEditor } from "@/components/editor/CodeMirrorEditor"
import { FileTreeSidebar } from "@/app/interview/_components/FileTreeSidebar"
import { isWorkspaceScenario, toWorkspaceScenarioFiles } from "@/app/interview/_utils/workspace"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { scenarios, type Scenario } from "@/lib/scenarios"
import { genericCacheEvictionMutationScenario as authored } from "@/lib/scenarios/real-world/bugfix/packs/generic-cache-eviction-mutation"
import { executePackOracleClientSide } from "@/lib/workspace-execution/python-sandbox/pack-oracle-runner"
import "@/app/globals.css"

const params = new URLSearchParams(window.location.search)
const flagship = (() => {
  if (!isWorkspaceScenario(authored)) throw new Error("Flagship must have a workspace")
  return authored
})()
document.documentElement.classList.toggle("dark", params.get("theme") !== "light")
const catalog = prioritizeDebuggingScenarios(
  scenarios.filter((scenario) => scenario.type === "bugfix")
)

function Fixture() {
  const [selected, setSelected] = useState<Scenario | null>(null)
  const [started, setStarted] = useState(false)
  const [activePath, setActivePath] = useState(flagship.workspace.primaryFilePath)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState("")
  const files = toWorkspaceScenarioFiles(flagship).map((file) => ({
    ...file,
    content: edits[file.path] ?? file.content,
  }))
  const active = files.find((file) => file.path === activePath)!

  async function run() {
    setRunning(true)
    const result = await executePackOracleClientSide(
      flagship,
      Object.entries(edits).map(([path, content]) => ({ path, content }))
    )
    setOutput(
      result.error ?? `${result.match ? "Report matches" : "Report differs"}\n${result.stdout}`
    )
    setRunning(false)
  }

  return (
    <main className="bg-background text-foreground min-h-screen p-4 sm:p-8">
      <p className="text-muted-foreground mb-6 text-sm">
        Isolated QA fixture: real UI and Python worker; no account or AI calls.
      </p>
      {!started ? (
        <ScenarioList
          scenarios={catalog}
          selectedScenarioId={selected?.id ?? null}
          completedProblems={[]}
          usageLimit={null}
          isStarting={false}
          hasActiveFilters={false}
          onClearFilters={() => {}}
          onSelect={setSelected}
          onStart={(scenario) => {
            setSelected(scenario)
            setStarted(true)
          }}
        />
      ) : (
        <section className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-xl font-semibold">{selected?.title}</h1>
          <div className="grid min-w-0 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <FileTreeSidebar
              files={files}
              activePath={activePath}
              onFileSelect={(file) => setActivePath(file.path)}
            />
            <div className="min-w-0">
              <p className="mb-2 font-mono text-sm" data-testid="active-file">
                {activePath}
              </p>
              <CodeMirrorEditor
                value={active.content}
                language={active.language ?? "python"}
                readOnly={active.role !== "editable"}
                height="400px"
                onChange={(content) =>
                  setEdits((previous) => ({ ...previous, [activePath]: content }))
                }
              />
            </div>
          </div>
          <Button disabled={running} onClick={() => void run()}>
            {running ? "Running Python…" : "Run report"}
          </Button>
          <pre role="status" className="overflow-auto whitespace-pre-wrap">
            {output}
          </pre>
        </section>
      )}
    </main>
  )
}

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <Fixture />
  </TooltipProvider>
)
