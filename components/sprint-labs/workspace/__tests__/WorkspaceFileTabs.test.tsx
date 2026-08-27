/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { WorkspaceFileTabs } from "../WorkspaceFileTabs"
import type { WorkspaceTreeFile } from "@/lib/sprint-labs/workspace/tree"

afterEach(cleanup)

const files: WorkspaceTreeFile[] = [
  { path: "MERIDIAN.md", content: "docs", editable: false, group: "docs" },
  { path: ".meridian/MAP.md", content: "map", editable: false, group: "docs" },
  { path: "src/http/claims.ts", content: "code", editable: true, group: "src" },
  { path: "claims-parser.test.ts", content: "test", editable: false, group: "tests" },
]

describe("WorkspaceFileTabs", () => {
  it("renders groups in docs/src/tests order with a tablist per group", () => {
    render(<WorkspaceFileTabs files={files} activePath="MERIDIAN.md" onSelect={vi.fn()} />)
    const tablists = screen.getAllByRole("tablist")
    expect(tablists).toHaveLength(3)
    expect(screen.getByText("docs")).not.toBeNull()
    expect(screen.getByText("src")).not.toBeNull()
    expect(screen.getByText("tests")).not.toBeNull()
  })

  it("renders a lock icon only on non-editable (locked) entries", () => {
    render(<WorkspaceFileTabs files={files} activePath="MERIDIAN.md" onSelect={vi.fn()} />)
    const claimsTab = screen.getByRole("tab", { name: "claims.ts" })
    const meridianTab = screen.getByRole("tab", { name: "MERIDIAN.md" })
    const testTab = screen.getByRole("tab", { name: "claims-parser.test.ts" })

    expect(claimsTab.querySelector("svg")).toBeNull()
    expect(meridianTab.querySelector("svg")).not.toBeNull()
    expect(testTab.querySelector("svg")).not.toBeNull()
  })

  it("marks the active file's tab aria-selected and no other", () => {
    render(<WorkspaceFileTabs files={files} activePath="src/http/claims.ts" onSelect={vi.fn()} />)
    expect(screen.getByRole("tab", { name: "claims.ts" }).getAttribute("aria-selected")).toBe(
      "true"
    )
    expect(screen.getByRole("tab", { name: "MERIDIAN.md" }).getAttribute("aria-selected")).toBe(
      "false"
    )
  })

  it("calls onSelect with the file's path when a tab is clicked", () => {
    const onSelect = vi.fn()
    render(<WorkspaceFileTabs files={files} activePath="MERIDIAN.md" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole("tab", { name: "claims.ts" }))
    expect(onSelect).toHaveBeenCalledWith("src/http/claims.ts")
  })

  it("never renders a hidden test file, by construction (no such entry can appear in `files`)", () => {
    render(<WorkspaceFileTabs files={files} activePath="MERIDIAN.md" onSelect={vi.fn()} />)
    expect(screen.queryByText(/hidden/i)).toBeNull()
    expect(document.body.textContent).not.toMatch(/Escaped:/)
  })

  it("renders the empty-tree line when no files are given", () => {
    render(<WorkspaceFileTabs files={[]} activePath="" onSelect={vi.fn()} />)
    expect(screen.getByText("No files are mounted for this ticket yet.")).not.toBeNull()
    expect(screen.queryAllByRole("tablist")).toHaveLength(0)
  })

  it("omits a group's heading entirely when that group has no files", () => {
    const noTests = files.filter((f) => f.group !== "tests")
    render(<WorkspaceFileTabs files={noTests} activePath="MERIDIAN.md" onSelect={vi.fn()} />)
    expect(screen.queryByText("tests")).toBeNull()
  })
})
