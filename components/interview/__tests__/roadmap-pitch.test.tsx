/**
 * @vitest-environment jsdom
 *
 * The signed-out `/interview` landing this pitch replaced was the site's worst dead-click page
 * in PostHog, so the assertions here are about the interactive surface as much as the content:
 * one CTA that navigates, exactly two quiet links behind it, and nothing else to click. The
 * practice link must open the same track picker window the header uses, because that window is
 * the door back into the guest-trial funnel.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RoadmapPitch } from "../RoadmapPitch"

describe("RoadmapPitch", () => {
  it("leads with a single CTA into the roadmap wizard", () => {
    render(<RoadmapPitch />)

    const cta = screen.getByRole("link", { name: "Build your roadmap" })
    expect(cta.getAttribute("href")).toBe("/roadmap/new")
  })

  it("keeps the sample plan reachable as a quiet link", () => {
    render(<RoadmapPitch />)

    const sample = screen.getByRole("link", { name: "See a sample plan" })
    expect(sample.getAttribute("href")).toBe("/roadmap/preview")
  })

  /**
   * The whole clickable surface, counted. The page earned its dead clicks from things that
   * looked interactive and were not; the guard in the other direction is that nothing new
   * quietly joins the CTA and the two quiet links.
   */
  it("offers exactly one CTA, one sample link, and one practice opener", () => {
    render(<RoadmapPitch />)

    expect(screen.getAllByRole("link")).toHaveLength(2)
    expect(screen.getAllByRole("button")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Or jump into a practice round" })).toBeTruthy()
  })

  it("opens the header's track picker window from the practice link", () => {
    render(<RoadmapPitch />)

    expect(screen.queryByRole("dialog")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Or jump into a practice round" }))

    expect(screen.getByRole("dialog")).toBeTruthy()
    const trackLinks = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href) => href?.startsWith("/interview?track="))
    expect(trackLinks).toContain("/interview?track=dsa")
    expect(trackLinks).toContain("/interview?track=debugging")
  })
})
