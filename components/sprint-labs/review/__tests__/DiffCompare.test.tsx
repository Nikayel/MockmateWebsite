/**
 * @vitest-environment jsdom
 *
 * `CodeMirrorEditor` is mocked, matching the existing house precedent
 * (`components/tutorials/__tests__/workspace-brief-rendering.test.tsx`: "hostile to jsdom").
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/editor", () => ({
  CodeMirrorEditor: ({ value }: { value: string }) => <pre data-testid="codemirror">{value}</pre>,
}))

import { DiffCompare } from "../DiffCompare"

afterEach(cleanup)

const DIFF_A = `diff --git a/src/pool.ts b/src/pool.ts
--- a/src/pool.ts
+++ b/src/pool.ts
@@ -1,1 +1,2 @@
-old
+new
+new2
`

const DIFF_B = `diff --git a/src/pool.ts b/src/pool.ts
--- a/src/pool.ts
+++ b/src/pool.ts
@@ -1,1 +1,1 @@
-old
+reference
`

describe("DiffCompare", () => {
  it("renders the not-available message when no diff is given, single-pane mode", () => {
    render(
      <DiffCompare
        mode="single"
        primaryDiff={null}
        primaryLabel="PR diff"
        primaryNotAvailableMessage="The diff for this ticket is not available yet."
      />
    )
    expect(screen.getByText("The diff for this ticket is not available yet.")).not.toBeNull()
    expect(screen.queryByTestId("codemirror")).toBeNull()
  })

  it("renders only one pane in single mode even when a secondary diff is passed", () => {
    render(
      <DiffCompare
        mode="single"
        primaryDiff={DIFF_A}
        primaryLabel="PR diff"
        secondaryDiff={DIFF_B}
      />
    )
    expect(screen.getAllByTestId("codemirror")).toHaveLength(1)
  })

  it("renders both panes in two-pane mode, sharing one file picker", () => {
    render(
      <DiffCompare
        mode="two-pane"
        primaryDiff={DIFF_A}
        primaryLabel="Your diff"
        secondaryDiff={DIFF_B}
        secondaryLabel="The reference"
      />
    )
    expect(screen.getAllByTestId("codemirror")).toHaveLength(2)
    expect(screen.getByRole("tab", { name: "src/pool.ts" })).not.toBeNull()
    expect(screen.getByText("Your diff")).not.toBeNull()
    expect(screen.getByText("The reference")).not.toBeNull()
  })

  it("shows the per-file changed-line count", () => {
    render(<DiffCompare mode="single" primaryDiff={DIFF_A} primaryLabel="PR diff" />)
    expect(screen.getByText("+2 -1")).not.toBeNull()
  })
})
