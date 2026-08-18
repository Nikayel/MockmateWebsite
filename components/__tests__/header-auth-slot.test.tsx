/**
 * The header renders on every route, so its server HTML must match the first client render byte
 * for byte. When it did not, React threw a #418 hydration mismatch and discarded the server-rendered
 * subtree — undoing the work of af92f58e, which put the marketing nav into the HTML a crawler reads.
 *
 * The mismatch came from the sign-in slot. On the server `useAuth()` reports `initialized: false`,
 * so the slot rendered a spinner; once Firebase auth answered it swapped in the "Sign in" text.
 * If auth resolved while the page was still hydrating, the client rendered "Sign in" against the
 * server's spinner and the text node did not match.
 *
 * The fix ships the "Sign in" link in the server HTML and only swaps to the product nav after mount.
 * This test pins that: the server render must emit the link, never the spinner. Rendering the real
 * component (not asserting on a constant) is what makes it catch a return to a mount-blind slot.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// Header reads the active route; a static render has no router, so supply a stable path. The value
// only feeds the nav's active-state check and does not affect the sign-in slot under test.
vi.mock("next/navigation", () => ({
  usePathname: () => "/legal",
}))

import { Header } from "../header"

describe("header sign-in slot in server HTML", () => {
  const html = renderToStaticMarkup(<Header />)

  it("ships the Sign in link, not a loading spinner", () => {
    expect(html).toContain(">Sign in<")
    expect(html).toContain('href="/login"')
  })

  it("emits no auth spinner that a later text swap could mismatch", () => {
    expect(html).not.toContain("animate-spin")
  })
})
