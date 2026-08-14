// @vitest-environment jsdom
/**
 * The in-context route into the editor.
 *
 * Two properties are load-bearing and neither is visual:
 *
 *  1. A signed-out visitor is sent to `/login?redirect=<workspace>`, never straight at the workspace.
 *     The workspace carries starter code, hints and the reference solution, so a direct link handed to
 *     a crawler or a signed-out reader is a gating hole, not a convenience.
 *  2. Signed-out and auth-initializing render the SAME markup. The article around this is statically
 *     generated and CDN-cached byte-identically, so anything that renders differently before auth
 *     resolves produces a hydration mismatch or a layout shift under the reader's cursor.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ExerciseWorkspaceCue } from "../ExerciseWorkspaceCue"

const mockAuth = vi.hoisted(() => ({ value: { user: null as unknown, initialized: true } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))

afterEach(cleanup)

function renderCue() {
  return render(
    <ExerciseWorkspaceCue
      courseId="data-engineering"
      levelSlug="streaming-cdc"
      lessonId="de-l9-tumbling-hopping-windows"
      phaseLabel="Apply"
    />
  )
}

const WORKSPACE = "/learn/data-engineering/streaming-cdc/de-l9-tumbling-hopping-windows/workspace"

describe("exercise workspace cue", () => {
  it("sends a signed-out reader through login, not straight into the workspace", () => {
    mockAuth.value = { user: null, initialized: true }
    renderCue()
    const link = screen.getByRole("link")
    expect(link.getAttribute("href")).toBe(`/login?redirect=${encodeURIComponent(WORKSPACE)}`)
  })

  it("sends a signed-in learner straight to the editor", () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    renderCue()
    expect(screen.getByRole("link").getAttribute("href")).toBe(WORKSPACE)
  })

  it("treats auth-initializing as signed out rather than rendering a spinner", () => {
    // The article is CDN-cached byte-identically, so a third visual state would shift the page
    // under a reader who is already looking at it.
    mockAuth.value = { user: null, initialized: false }
    renderCue()
    expect(screen.getByRole("link").getAttribute("href")).toContain("/login?redirect=")
  })

  it("keeps the label to one line in both states, so nothing reflows on hydration", () => {
    mockAuth.value = { user: null, initialized: true }
    const { container: signedOut } = renderCue()
    const outText = signedOut.textContent ?? ""
    cleanup()
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    const { container: signedIn } = renderCue()
    const inText = signedIn.textContent ?? ""
    // Not identical text (the label swaps on purpose), but the same shape: one link plus one
    // trailing sentence, within a few characters of each other.
    expect(Math.abs(outText.length - inText.length)).toBeLessThan(16)
  })

  it("names the phase in the accessible label, so the link is not a bare 'solve it here'", () => {
    // Two of these render per page, one under Apply and one under Practice. A screen-reader user
    // tabbing the page would otherwise hear the same link text twice with nothing to tell them apart.
    mockAuth.value = { user: null, initialized: true }
    renderCue()
    expect(screen.getByRole("link").getAttribute("aria-label")).toContain("Apply")
  })

  it("does not promise anything the product does not do", () => {
    // The claim is "nothing to install", which is true because execution is in-browser (Pyodide and
    // sql.js). A stronger claim like "no sign-up" would be false and is the kind of line a reader
    // checks once and never trusts again.
    mockAuth.value = { user: null, initialized: true }
    const { container } = renderCue()
    const text = (container.textContent ?? "").toLowerCase()
    expect(text).toContain("nothing to install")
    expect(text).not.toContain("free forever")
    expect(text).not.toContain("no account")
  })
})
