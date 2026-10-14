import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Keep the retired feature out of entry points, including lazy-loaded components
// that a loading-state render would not exercise.
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

describe("referral enrollment retirement", () => {
  it("removes the dashboard widget and its unused component", () => {
    expect(source("app/dashboard/page.tsx")).not.toContain("ReferralWidget")
    expect(existsSync(resolve(process.cwd(), "components/dashboard/ReferralWidget.tsx"))).toBe(
      false
    )
  })

  it("removes global enrollment capture without removing acquisition analytics", () => {
    const layout = source("app/layout.tsx")
    expect(layout).not.toContain("ReferralCapture")
    expect(layout).toContain("<AttributionCapture />")
    expect(existsSync(resolve(process.cwd(), "components/ReferralCapture.tsx"))).toBe(false)
  })

  it("does not enroll new signups from old links or stored referral codes", () => {
    const login = source("app/login/page.tsx")
    expect(login).not.toContain("pending_referral_code")
    expect(login).not.toContain("/api/referral")
    expect(login).not.toContain('searchParams.get("ref")')
  })
})
