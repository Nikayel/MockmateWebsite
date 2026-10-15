// @vitest-environment jsdom
import { StrictMode } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PricingPageClient } from "../PricingPageClient"

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }))
vi.mock("@/lib/analytics", () => ({ trackEvent }))
vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/footer", () => ({ Footer: () => null }))
vi.mock("@/components/comparison-section", () => ({ ComparisonSection: () => null }))
vi.mock("@/components/pricing/FeatureMatrix", () => ({ FeatureMatrix: () => null }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("public pricing analytics", () => {
  it("reports one view even under StrictMode and billing-period rerenders", () => {
    render(
      <StrictMode>
        <div onClickCapture={(event) => event.preventDefault()}>
          <PricingPageClient faqs={[]} courses={{ python: 1, dataEngineering: 1, systemDesign: 1 }}>
            <span>Preview</span>
          </PricingPageClient>
        </div>
      </StrictMode>
    )
    fireEvent.click(screen.getByRole("radio", { name: "Monthly" }))
    expect(trackEvent.mock.calls.filter(([event]) => event === "pricing_viewed")).toEqual([
      ["pricing_viewed", { billing_period: "yearly" }],
    ])
    fireEvent.click(screen.getByRole("link", { name: "Subscribe" }))
    expect(trackEvent).toHaveBeenCalledWith("cta_click", {
      location: "pricing_pro_subscribe",
      destination: "/upgrade",
      billing_period: "monthly",
    })
  })
})
