import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: vi.fn().mockResolvedValue(true) }))

import sitemap from "../sitemap"
import { SITE_ORIGIN } from "@/lib/seo/site"

const overview = readFileSync(new URL("../../public/llms.txt", import.meta.url), "utf8")
const links = [...overview.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1])

describe("LLM-facing public overview", () => {
  it("has one project heading, a summary, and a concise set of resource links", () => {
    expect(overview.match(/^# .+$/gm)).toEqual(["# CodeSparring"])
    expect(overview).toMatch(/^# CodeSparring\n\n> /)
    expect(links.length).toBeGreaterThan(0)
    expect(new Set(links).size).toBe(links.length)
    expect(Buffer.byteLength(overview)).toBeLessThan(8_000)
  })

  it("links to canonical public pages rather than private workspaces or retired routes", async () => {
    const publicUrls = new Set((await sitemap()).map(({ url }) => url))
    publicUrls.add(`${SITE_ORIGIN}/robots.txt`)
    publicUrls.add(`${SITE_ORIGIN}/sitemap.xml`)

    for (const link of links) {
      expect(publicUrls.has(link), link).toBe(true)
    }
  })
})
