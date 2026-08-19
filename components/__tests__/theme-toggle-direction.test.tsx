/**
 * @vitest-environment jsdom
 *
 * The theme switch must always move the visitor AWAY from what is currently on
 * screen, and every click must land.
 *
 * Both failures here are invisible in review. The icon is rendered from React
 * state, so it always looks right; only the direction of the click was wrong,
 * and only during the window before the mount effect runs. That window is not
 * just first load: LearnPathTopBar, InterviewTopBar and the lab topbar each
 * replace the global header, so ThemeToggle is remounted on those navigations
 * and `useTheme()` reports `undefined` again. `theme ?? "dark"` then guessed
 * dark, so a light-theme visitor clicking the moon was sent to light and saw
 * nothing happen at all.
 *
 * The second failure is the crossfade: the View Transitions API abandons an
 * in-flight transition when a new one starts and covers the page with the
 * outgoing snapshot while it runs, so quick successive clicks were swallowed.
 * A control that ignores your second and third click is how a working button
 * collects a rage click.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const setTheme = vi.fn()

/** Simulates the pre-mount / remount window: next-themes knows nothing yet. */
let themeState: { theme: string | undefined; resolvedTheme: string | undefined } = {
  theme: undefined,
  resolvedTheme: undefined,
}

vi.mock("next-themes", () => ({
  useTheme: () => ({ ...themeState, setTheme }),
}))

function setDocumentTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark)
}

beforeEach(() => {
  vi.clearAllMocks()
  themeState = { theme: undefined, resolvedTheme: undefined }
  setDocumentTheme(false)
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
})

afterEach(() => {
  // @ts-expect-error - jsdom has no startViewTransition; tests add it ad hoc.
  delete document.startViewTransition
})

async function renderToggle() {
  const { ThemeToggle } = await import("@/components/ThemeToggle")
  render(<ThemeToggle />)
  return screen.getByRole("button")
}

describe("ThemeToggle direction", () => {
  it("sends a LIGHT page to dark even before next-themes has reported a theme", async () => {
    setDocumentTheme(false)

    fireEvent.click(await renderToggle())

    // The bug this pins: `theme ?? "dark"` guessed dark here, so the click
    // asked for light on a page that was already light. Nothing happened.
    expect(setTheme).toHaveBeenCalledWith("dark")
  })

  it("sends a DARK page to light even before next-themes has reported a theme", async () => {
    setDocumentTheme(true)

    fireEvent.click(await renderToggle())

    expect(setTheme).toHaveBeenCalledWith("light")
  })

  it("follows the DOM when React state disagrees with what is on screen", async () => {
    // React thinks light, the document is dark. The visitor sees dark.
    themeState = { theme: "light", resolvedTheme: "light" }
    setDocumentTheme(true)

    fireEvent.click(await renderToggle())

    expect(setTheme).toHaveBeenCalledWith("light")
  })

  it("applies every click, even while a crossfade is still running", async () => {
    // A transition that never finishes, i.e. the worst case for a fast clicker.
    const startViewTransition = vi.fn((cb: () => void) => {
      cb()
      return { finished: new Promise<void>(() => {}) }
    })
    // @ts-expect-error - assigning the API jsdom does not implement.
    document.startViewTransition = startViewTransition

    const button = await renderToggle()

    fireEvent.click(button) // light -> dark, via the crossfade
    fireEvent.click(button) // dark -> light, must NOT be swallowed
    fireEvent.click(button) // light -> dark again

    expect(setTheme).toHaveBeenNthCalledWith(1, "dark")
    expect(setTheme).toHaveBeenNthCalledWith(2, "light")
    expect(setTheme).toHaveBeenNthCalledWith(3, "dark")

    // Only the first click opened a transition; the rest swapped instantly
    // rather than starting transitions that abort each other.
    expect(startViewTransition).toHaveBeenCalledTimes(1)
  })

  it("keeps the document class in step when the crossfade path is skipped", async () => {
    setDocumentTheme(false)

    fireEvent.click(await renderToggle())

    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})
