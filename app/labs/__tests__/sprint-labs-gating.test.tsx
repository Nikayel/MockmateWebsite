/**
 * The `/labs` chooser must stay byte-identical to its Case-Labs-only shape when
 * `SPRINT_LABS_ENABLED` is off (UX-SPEC.md §1.2/§12.7), and must add exactly the jump strip, the
 * Case Labs wrapper header and the Sprint Labs section when it's on.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// Header reads the active route; a static render has no router, matching header-auth-slot.test.tsx.
vi.mock("next/navigation", () => ({ usePathname: () => "/labs" }))

const mocks = vi.hoisted(() => ({ getFlagAsync: vi.fn() }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))

import CaseLabsGalleryPage from "../page"

describe("/labs Sprint Labs flag gating", () => {
  it("renders no Sprint Labs section, jump strip or Case Labs wrapper header when the flag is off", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const html = renderToStaticMarkup(await CaseLabsGalleryPage())

    expect(html).not.toContain("Sprint labs")
    expect(html).not.toContain('id="sprint-labs"')
    expect(html).not.toContain('id="case-labs"')
    expect(html).not.toContain("Jump to a catalog")
    // The page underneath is untouched: the hero and the gallery still render.
    expect(html).toContain("Decomposition interview practice, on a real codebase")
    expect(html).toContain("Pick a case lab")
  })

  it("renders the jump strip, the Case Labs wrapper header and the Sprint Labs section when the flag is on", async () => {
    mocks.getFlagAsync.mockResolvedValue(true)
    const html = renderToStaticMarkup(await CaseLabsGalleryPage())

    expect(html).toContain("Jump to a catalog")
    expect(html).toContain('id="case-labs"')
    expect(html).toContain('id="sprint-labs"')
    expect(html).toContain("Sprint labs")
    // Every compiled workbook plus the sbx placeholder, never a hardcoded compiled id.
    expect(html).toContain("Prove It")
    expect(html).toContain("Fixture Demo")
  })
})
