import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/labs/choose" }))
vi.mock("@/components/header", () => ({ Header: () => null }))

const mocks = vi.hoisted(() => ({ getFlagAsync: vi.fn() }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))

import LabsChooserPage, { metadata } from "./page"

describe("Labs chooser", () => {
  it("offers direct links to the decomposition case and Meridian", async () => {
    mocks.getFlagAsync.mockResolvedValue(true)
    const html = renderToStaticMarkup(await LabsChooserPage())

    expect(html).toContain("CodeSparring Labs")
    expect(html).toContain("Choose your next round")
    expect(html).toContain('href="/labs/palantir-911-dispatch"')
    expect(html).toContain('href="/sprint-labs/meridian"')
    expect(html).toContain("60 minutes")
    expect(html).toContain("10 sprints · about 58 hours")
    expect(html).toContain("Browse all Case Labs")
    expect(html).toContain("Try the available labs now. More are coming soon.")
    expect(metadata.robots).toEqual({ index: false, follow: true })
  })

  it("does not expose the Sprint path when its feature flag is off", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const html = renderToStaticMarkup(await LabsChooserPage())

    expect(html).toContain('href="/labs/palantir-911-dispatch"')
    expect(html).not.toContain('href="/sprint-labs/meridian"')
    expect(html).toContain("Take on one real-world case")
    expect(html).toContain("Solve the 911 Dispatch case")
  })
})
