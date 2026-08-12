// @vitest-environment jsdom
/**
 * The workspace brief renders as markdown, not as raw source.
 *
 * Every workspace file used to go through `CodeMirrorEditor`, so `README.md` — the one file a
 * learner MUST read to know what the exercise wants — was shown as literal markdown: `#` and `**`
 * as characters, GFM tables as pipe soup, in a monospace pane that CodeMirror could not even
 * syntax-highlight (it has no markdown language loader). Several briefs already author tables that
 * were rendering as raw pipes.
 *
 * These tests pin the two halves of the fix so a later refactor cannot silently undo it:
 * the docs file renders to real elements, and every OTHER file still gets the editor.
 */
import { describe, it, expect, afterEach, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { WorkspaceScenarioConfig } from "@/lib/scenarios/types"
import type { PythonExercise } from "@/lib/tutorials/types"

// The runner pulls in Pyodide/CodeMirror through the run hook; neither is needed to assert which
// pane a tab renders, and both are hostile to jsdom.
vi.mock("../useExerciseRun", () => ({
  useExerciseRun: () => ({
    running: false,
    warming: false,
    results: [],
    runError: null,
    attempts: 0,
    passed: false,
    lastRunPassed: null,
    lastScore: null,
    run: vi.fn(),
  }),
}))

vi.mock("@/components/editor", () => ({
  CodeMirrorEditor: ({ value, readOnly }: { value: string; readOnly?: boolean }) => (
    <div data-testid="codemirror" data-readonly={String(!!readOnly)}>
      {value}
    </div>
  ),
  CodeMirrorErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { WorkspaceExerciseRunner } from "../WorkspaceExerciseRunner"

afterEach(cleanup)

const README = `# Ticket OPS-318

Implement **quote_parcel** so the carrier is chosen by the registry.

| Situation | Message |
| --- | --- |
| unknown code | falls back |
`

const workspace: WorkspaceScenarioConfig = {
  language: "python",
  primaryFilePath: "dispatch/quotes.py",
  editableFilePaths: ["dispatch/quotes.py"],
  visibleTestPaths: [],
  hiddenTestPaths: [],
  testRunnerPath: "tests/run_workspace_tests.py",
  files: [
    { path: "README.md", role: "docs", language: "markdown", content: README },
    {
      path: "dispatch/quotes.py",
      role: "editable",
      language: "python",
      content: "def quote_parcel():\n    pass\n",
    },
  ],
}

const exercise = {
  id: "test-exercise",
  prompt: "Implement it.",
  executionMode: "workspace",
  starterCode: "",
  hints: [],
  workspace,
} as unknown as PythonExercise

function renderRunner() {
  return render(<WorkspaceExerciseRunner exercise={exercise} workspace={workspace} />)
}

describe("workspace brief rendering", () => {
  it("renders README.md as markdown rather than raw source", async () => {
    renderRunner()

    // The primary file opens first, so switch to the brief the way a learner would.
    act(() => {
      fireEvent.click(screen.getByRole("tab", { name: /README\.md/ }))
    })

    // A real heading element, not the literal "# Ticket OPS-318".
    const heading = await screen.findByRole("heading", { name: /Ticket OPS-318/ })
    expect(heading).toBeTruthy()
    expect(heading.textContent).not.toContain("#")

    // The GFM table became a table, not a row of pipes.
    expect(screen.getByRole("table")).toBeTruthy()

    // No stray markdown punctuation survived into the visible text.
    const brief = heading.closest("div")
    expect(brief?.textContent ?? "").not.toContain("**")
  })

  it("still uses the code editor for a non-docs file", () => {
    renderRunner()

    // The Python file is the default tab, so the editor is what mounted.
    const editor = screen.getByTestId("codemirror")
    expect(editor.textContent).toContain("def quote_parcel")
    expect(editor.dataset.readonly).toBe("false")
  })
})
