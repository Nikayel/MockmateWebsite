/**
 * The workbook layout is the flag + unknown-id gate for every `/sprint-labs/**` route
 * (UX-SPEC.md §1.2(b), mirroring `/labs/[labId]`'s `dynamicParams = false` + `notFound()` precedent).
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getFlagAsync: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }))

import SprintLabWorkbookLayout, { generateMetadata, generateStaticParams } from "../layout"

describe("Sprint Labs workbook layout", () => {
  it("404s when the flag is off, before the id is even looked up", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    await expect(
      SprintLabWorkbookLayout({
        children: <div />,
        params: Promise.resolve({ workbookId: "fixture-demo" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("404s an unknown workbook id even when the flag is on", async () => {
    mocks.getFlagAsync.mockResolvedValue(true)
    await expect(
      SprintLabWorkbookLayout({
        children: <div />,
        params: Promise.resolve({ workbookId: "not-a-real-workbook" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("lists every registry workbook id as a static param", () => {
    expect(generateStaticParams()).toEqual(expect.arrayContaining([{ workbookId: "fixture-demo" }]))
  })

  it("renders BreadcrumbJsonLd, CourseJsonLd and the children for a known id with the flag on", async () => {
    mocks.getFlagAsync.mockResolvedValue(true)
    const element = await SprintLabWorkbookLayout({
      children: <div data-testid="child">child content</div>,
      params: Promise.resolve({ workbookId: "fixture-demo" }),
    })
    const html = renderToStaticMarkup(element)
    expect(html).toContain("child content")
    expect(html).toContain("BreadcrumbList")
    expect(html).toContain('"@type":"Course"')
  })

  it("gives an unknown id a non-indexable metadata fallback instead of a second copy of the catalog head", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ workbookId: "not-a-real-workbook" }),
    })
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it("derives real metadata from the workbook summary for a known id", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ workbookId: "fixture-demo" }),
    })
    expect(metadata.title).toContain("Fixture Demo")
  })
})
