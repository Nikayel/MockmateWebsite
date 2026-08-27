/**
 * The `/labs` chooser must stay byte-identical to its Case-Labs-only shape when
 * `SPRINT_LABS_ENABLED` is off (UX-SPEC.md §1.2/§12.7) — with one deliberate exception, per fix
 * round 1: `CaseLabGallery`'s own section always carries `id="case-labs"` (the jump strip's scroll
 * target), flag or no flag, since it costs nothing when unused and needs no prop threading. Flag on
 * must add exactly the jump strip, the Sprint Labs section and the workbook JSON-LD entries, with NO
 * second "Case labs" wrapper heading (fix round 1, C1: that wrapper double-boxed and
 * double-headlined the gallery and is gone for good).
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// Header reads the active route; a static render has no router, matching header-auth-slot.test.tsx.
vi.mock("next/navigation", () => ({ usePathname: () => "/labs" }))

const mocks = vi.hoisted(() => ({ getFlagAsync: vi.fn() }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))

import CaseLabsGalleryPage from "../page"

describe("/labs Sprint Labs flag gating", () => {
  it("renders no Sprint Labs section, jump strip or workbook JSON-LD when the flag is off", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const html = renderToStaticMarkup(await CaseLabsGalleryPage())

    expect(html).not.toContain("Sprint labs")
    expect(html).not.toContain('id="sprint-labs"')
    expect(html).not.toContain("Jump to a catalog")
    // No workbook ever reaches the JSON-LD course list while the flag is off (UX-SPEC.md §1.2(c)).
    expect(html).not.toContain("Fixture Demo")
    expect(html).not.toContain("Prove It")
    // The page underneath is untouched: the hero and the gallery still render.
    expect(html).toContain("Decomposition interview practice, on a real codebase")
    expect(html).toContain("Pick a case lab")
    // `CaseLabGallery`'s own scroll-target id is unconditional (fix round 1, C1) and is the one
    // deliberate exception to "byte-identical when off" — present here too, unused.
    expect(html).toContain('id="case-labs"')
  })

  it("renders the jump strip and the Sprint Labs section, with no second Case Labs wrapper heading, when the flag is on", async () => {
    mocks.getFlagAsync.mockResolvedValue(true)
    const html = renderToStaticMarkup(await CaseLabsGalleryPage())

    expect(html).toContain("Jump to a catalog")
    expect(html).toContain('id="case-labs"')
    expect(html).toContain('id="sprint-labs"')
    expect(html).toContain("Sprint labs")
    expect(html).toContain("Pick a case lab")
    // The jump strip's own "Case labs" anchor text is expected and stays (asserted below); what
    // must be gone for good is the retired wrapper's SECOND heading boxing the gallery (C1) — no
    // heading tag anywhere says "Case labs", only "Pick a case lab" (CaseLabGallery's own <h2>).
    expect(html).toMatch(/<a[^>]*>Case labs<\/a>/)
    expect(html).not.toMatch(/<h[1-6][^>]*>\s*Case labs\s*<\/h[1-6]>/)
    // Every compiled workbook plus the sbx placeholder, never a hardcoded compiled id.
    expect(html).toContain("Prove It")
    expect(html).toContain("Fixture Demo")
  })
})
