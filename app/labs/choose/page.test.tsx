import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/labs/choose" }))
vi.mock("@/components/header", () => ({ Header: () => null }))

const mocks = vi.hoisted(() => ({ getFlagAsync: vi.fn() }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))

import LabsChooserPage, { metadata } from "./page"

describe("Labs chooser", () => {
  it("offers both live assignments with real case and first-sprint artifacts", async () => {
    mocks.getFlagAsync.mockResolvedValue(true)
    const html = renderToStaticMarkup(await LabsChooserPage())

    expect(html).toContain("CodeSparring Labs")
    expect(html).toContain("Choose your next round")
    expect(html).toContain('href="/labs"')
    expect(html).toContain('href="/sprint-labs/meridian"')
    expect(html).toContain("911 Dispatch Optimization")
    expect(html).toContain("POST /claims returns 500 on Northwind")
    expect(html).toContain("page 340 takes 9s")
    expect(html).toContain("actively improving the experience")
    expect(metadata.robots).toEqual({ index: false, follow: true })
  })

  it("does not expose the Sprint path when its feature flag is off", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const html = renderToStaticMarkup(await LabsChooserPage())

    expect(html).toContain('href="/labs"')
    expect(html).not.toContain('href="/sprint-labs/meridian"')
    expect(html).toContain("Take on one real-world case")
    expect(html).toContain("911 Dispatch Optimization")
  })
})
