import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/labs" }))

import CaseLabsGalleryPage from "../page"

describe("/labs Case Labs catalog", () => {
  it("shows only case labs and their structured data", async () => {
    const html = renderToStaticMarkup(await CaseLabsGalleryPage())

    expect(html).toContain("Decomposition interview practice, on a real codebase")
    expect(html).toContain("Case Labs · Coming soon")
    expect(html).toContain("Pick a case lab")
    expect(html).toContain("Ontology Learning Round")
    expect(html).not.toContain("Sprint labs")
    expect(html).not.toContain("Jump to a catalog")
    expect(html).not.toContain("Meridian")
    expect(html).not.toContain("Fixture Demo")
    expect(html).not.toContain("Prove It")
    expect(html).not.toContain('href="/sprint-labs/meridian"')
  })
})
