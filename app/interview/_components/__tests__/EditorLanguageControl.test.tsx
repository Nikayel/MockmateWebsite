/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EditorLanguageControl } from "../EditorLanguageControl"

describe("editor language control", () => {
  it("identifies a fixed workspace language without presenting an unusable picker", () => {
    render(<EditorLanguageControl value="python" onChange={() => {}} isWorkspace />)
    expect(screen.queryByRole("combobox", { name: "Editor language" })).toBeNull()
    expect(screen.getByText(/fixed for this workspace/i)).toBeTruthy()
    expect(screen.getByText("Python")).toBeTruthy()
  })

  it("offers an enabled picker with the current language for switchable problems", () => {
    render(<EditorLanguageControl value="typescript" onChange={() => {}} isWorkspace={false} />)
    const picker = screen.getByRole("combobox", { name: "Editor language" })
    expect(picker.hasAttribute("disabled")).toBe(false)
    expect(picker.textContent).toContain("TypeScript")
  })
})
