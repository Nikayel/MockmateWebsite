import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/labs/choose" }))
vi.mock("@/components/header", () => ({ Header: () => null }))

const mocks = vi.hoisted(() => ({ getFlagAsync: vi.fn() }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))

import LabsChooserPage, { metadata } from "./page"

describe("Labs chooser", () => {
  it("shows the available paths as visibly locked while they are coming soon", async () => {
    mocks.getFlagAsync.mockResolvedValue(true)
    const html = renderToStaticMarkup(await LabsChooserPage())

    expect(html).toContain("CodeSparring Labs")
    expect(html).toContain("Choose your next round")
    expect(html).not.toContain('href="/labs/palantir-911-dispatch"')
    expect(html).not.toContain('href="/sprint-labs/meridian"')
    expect(html).toContain('disabled=""')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
    expect(html).toContain("60 minutes")
    expect(html).toContain("10 sprints · about 58 hours")
    expect(html).not.toContain("Browse all Case Labs")
    expect(html).not.toContain('href="/labs"')
    expect(html).toContain("They’ll open here when they’re ready.")
    expect(metadata.robots).toEqual({ index: false, follow: true })
  })

  it("does not expose the Sprint path when its feature flag is off", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const html = renderToStaticMarkup(await LabsChooserPage())

    expect(html).not.toContain('href="/labs/palantir-911-dispatch"')
    expect(html).not.toContain('href="/sprint-labs/meridian"')
    expect(html).toContain("The 911 Dispatch round is being prepared")
    expect(html).toContain("It’ll open here when it’s ready.")
    expect(html).toContain("Solve the 911 Dispatch case")
    expect(html).toContain('disabled=""')
  })
})
