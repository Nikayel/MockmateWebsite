import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/labs/choose" }))
vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/footer", () => ({ Footer: () => null }))

const mocks = vi.hoisted(() => ({ getFlagAsync: vi.fn() }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))

import LabsChooserPage, { metadata } from "./page"

describe("Labs chooser", () => {
  it("offers both live paths and explains their account requirements", async () => {
    mocks.getFlagAsync.mockResolvedValue(true)
    const html = renderToStaticMarkup(await LabsChooserPage())

    expect(html).toContain("Labs · Beta")
    expect(html).toContain("actively improving them")
    expect(html).toContain('href="/labs"')
    expect(html).toContain('href="/sprint-labs/meridian"')
    expect(html).toContain("Try a lab without an account")
    expect(html).toContain("Sign in to start sprint 1 free")
    expect(metadata.robots).toEqual({ index: false, follow: true })
  })

  it("does not expose the Sprint path when its feature flag is off", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const html = renderToStaticMarkup(await LabsChooserPage())

    expect(html).toContain('href="/labs"')
    expect(html).not.toContain('href="/sprint-labs/meridian"')
    expect(html).toContain("Decomposition Case Labs are live in beta")
  })
})
