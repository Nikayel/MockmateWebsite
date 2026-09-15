import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// The orb is decorative and client-only. The hero's content must render without it.
vi.mock("@/components/three/DynamicThreeOrb", () => ({ DynamicThreeOrb: () => null }))

import { HeroSection } from "./hero-section"

describe("HeroSection", () => {
  const html = renderToStaticMarkup(<HeroSection />)

  it("keeps the headline and links the age-of-AI explanation to the Labs chooser", () => {
    expect(html).toContain("Practice the interview rounds LeetCode skips.")
    expect(html).toContain("Practice technical interviews for the")
    expect(html).toContain('href="/labs/choose"')
    expect(html).toContain(">age of AI</a>: scope ambiguous work")
  })

  it("has one primary action leading straight to debugging", () => {
    expect(html).toContain('href="/interview?track=debugging"')
    expect(html).toContain("Start free")
    expect(html).toContain("No credit card required.")
    expect(html).not.toContain("Explore Case Labs")
    expect(html).not.toContain("See the two rounds")
    expect(html).not.toContain("courses included")
    expect(html.match(/<a /g)).toHaveLength(2)
  })
})
