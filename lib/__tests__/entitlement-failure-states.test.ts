import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * A structural guard for a bug that shipped on two surfaces independently.
 *
 * Both /knowledge and /practice collapsed three outcomes into `isPro = false`:
 * genuinely not subscribed, the profile fetch failed, and no signed-in user. So a
 * 500 or a network blip rendered the Upgrade wall to a PAYING subscriber, with no
 * error and no retry — and the no-user branch left `isPro` null forever, so the
 * loading gate never cleared and the page became a permanent spinner.
 *
 * Fail closed on ACCESS; never on the explanation. Asserted over source because the
 * defect is a missing DISTINCTION, not a wrong value: any test that only checked
 * "non-subscriber sees the paywall" passed happily on the broken version.
 */
const PRO_GATED_PAGES = ["app/knowledge/page.tsx", "app/practice/page.tsx"]

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8")

describe("pro-gated pages distinguish 'not entitled' from 'could not check'", () => {
  it("scans the pages it claims to", () => {
    for (const path of PRO_GATED_PAGES) {
      expect(() => read(path), path).not.toThrow()
    }
  })

  for (const path of PRO_GATED_PAGES) {
    it(`${path} tracks the failure separately from the verdict`, () => {
      expect(read(path)).toContain("entitlementFailed")
    })

    it(`${path} renders a distinct screen for it, not the upsell`, () => {
      const source = read(path)
      const failBranch = source.indexOf("if (entitlementFailed)")
      const payBranch = source.indexOf("if (!isPro)")
      expect(failBranch, `${path}: no entitlementFailed branch`).toBeGreaterThan(-1)
      // Order matters: the paywall must not shadow the failure screen.
      expect(failBranch, `${path}: paywall branch precedes the failure branch`).toBeLessThan(
        payBranch
      )
    })

    it(`${path} offers a retry rather than dead-ending`, () => {
      const source = read(path)
      const branch = source.slice(source.indexOf("if (entitlementFailed)"))
      expect(branch.slice(0, 1200)).toContain("checkSubscription()")
    })

    it(`${path} still fails closed — a failed check never grants access`, () => {
      // Every path that sets entitlementFailed must also deny entitlement.
      const source = read(path)
      const setters = [...source.matchAll(/setEntitlementFailed\(true\)/g)]
      expect(setters.length, `${path}: expected failure paths`).toBeGreaterThan(0)
      for (const m of setters) {
        const after = source.slice(m.index ?? 0, (m.index ?? 0) + 120)
        expect(after, `${path}: failure path does not deny access`).toContain("setIsPro(false)")
      }
    })
  }
})
