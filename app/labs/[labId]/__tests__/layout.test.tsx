import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }))

import CaseLabDetailLayout, { generateMetadata } from "../layout"

describe("Case Lab detail layout availability", () => {
  it("404s the Decomposition destination while it is Coming soon", async () => {
    await expect(
      CaseLabDetailLayout({
        children: <div>lab content</div>,
        params: Promise.resolve({ labId: "palantir-911-dispatch" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("keeps locked Decomposition metadata out of search results", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ labId: "palantir-911-dispatch" }),
    })
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it("keeps unrelated Case Labs available", async () => {
    const element = await CaseLabDetailLayout({
      children: <div>available lab content</div>,
      params: Promise.resolve({ labId: "palantir-ontology-learning" }),
    })
    expect(renderToStaticMarkup(element)).toContain("available lab content")
  })
})
