/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CodeViewerSidePanel } from "../CodeViewerSidePanel"

vi.mock("@/components/editor", () => ({
  MonacoEditor: ({ value }: { value: string }) => <pre aria-label="File source">{value}</pre>,
}))

afterEach(cleanup)

describe("repository Markdown files", () => {
  it("lets readers render Markdown and return to the unchanged source", async () => {
    const content = "# Setup\n\nRun `python3 main.py`.\n\n- Read the report\n- Check the output"
    render(<CodeViewerSidePanel isOpen onClose={() => {}} fileName="README.md" content={content} />)
    fireEvent.click(screen.getByRole("button", { name: "Make readable" }))
    expect(await screen.findByRole("heading", { name: "Setup" })).toBeTruthy()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    fireEvent.click(screen.getByRole("button", { name: "View source" }))
    expect(screen.getByLabelText("File source").textContent).toBe(content)
  })
})
