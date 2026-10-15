import { describe, expect, it } from "vitest"
import { checkoutReturnPaths, normalizeUpgradeSource, upgradePath } from "../upgrade-entry"

describe("bounded upgrade attribution", () => {
  it.each(["roadmap", "practice-plan"] as const)("retains known entry %s", (source) => {
    expect(normalizeUpgradeSource(source)).toBe(source)
  })
  it.each([
    undefined,
    null,
    {},
    "https://evil.example",
    "private assessment answer",
    "roadmap&next=https://evil.example",
  ])("never treats untrusted source as tracking content or a redirect: %s", (value) => {
    expect(normalizeUpgradeSource(value)).toBe("direct")
  })
  it.each(["monthly", "yearly"] as const)(
    "preserves %s through checkout and sign-in",
    (billing) => {
      const paths = checkoutReturnPaths("roadmap", billing)
      expect(upgradePath("roadmap", billing)).toBe(`/upgrade?source=roadmap&billing=${billing}`)
      expect(paths.success).toContain("session_id={CHECKOUT_SESSION_ID}")
      for (const path of Object.values(paths)) {
        const url = new URL(path, "https://www.codesparring.dev")
        expect(url.origin).toBe("https://www.codesparring.dev")
        expect(url.searchParams.get("source")).toBe("roadmap")
        expect(url.searchParams.get("billing")).toBe(billing)
      }
    }
  )
})
