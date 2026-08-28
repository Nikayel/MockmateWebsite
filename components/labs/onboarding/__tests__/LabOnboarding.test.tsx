/**
 * Smoke test for the onboarding overlay. Renders to static markup (no DOM env,
 * no effects) the way the header test does, so this exercises the beat/chapter/
 * control structure without pulling three.js in: the system-map beat is not the
 * active beat at index 0, and the map is lazy + ssr:false, so no WebGL loads.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { LabOnboarding } from "@/components/labs/onboarding/LabOnboarding"
import type { OnboardingConfig } from "@/lib/labs/onboarding/config"

const config: OnboardingConfig = {
  id: "test-co",
  company: "Test Co",
  beats: [
    { kind: "offer", chapter: "Offer", lines: ["Test Co — Platform", "You're hired."] },
    {
      kind: "system-map",
      chapter: "System",
      heading: "The codebase",
      modules: [{ id: "http", label: "front door", role: "receives requests", path: "src/http" }],
    },
    {
      kind: "handoff",
      chapter: "Start",
      heading: "First ticket",
      body: "Begin here.",
      ctaLabel: "Start here",
    },
  ],
}

describe("LabOnboarding overlay", () => {
  const html = renderToStaticMarkup(<LabOnboarding config={config} onDone={() => {}} />)

  it("opens on the offer beat", () => {
    expect(html).toContain("You&#x27;re hired.")
    expect(html).toContain("Test Co — Platform")
  })

  it("renders a chapter per beat", () => {
    expect(html).toContain(">Offer<")
    expect(html).toContain(">System<")
    expect(html).toContain(">Start<")
  })

  it("always offers a way out and a way forward", () => {
    expect(html).toContain(">Skip the tour<")
    expect(html).toContain(">Next<")
  })

  it("labels the overlay as a modal welcome for the company", () => {
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="Welcome to Test Co"')
  })
})
