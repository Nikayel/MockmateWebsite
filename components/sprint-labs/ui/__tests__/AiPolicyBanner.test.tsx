/**
 * AiPolicyBanner is the non-dismissible ai_policy banner (UX-SPEC.md §1.8). "No close control, ever"
 * is asserted directly: no button anywhere in its output.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AiPolicyBanner } from "../AiPolicyBanner"

describe("AiPolicyBanner", () => {
  it("renders nothing for an assisted ticket", () => {
    expect(renderToStaticMarkup(<AiPolicyBanner policy="assisted" />)).toBe("")
  })

  it("renders the unassisted headline and the ai_policy_reason in fiction, quoted", () => {
    const html = renderToStaticMarkup(
      <AiPolicyBanner
        policy="unassisted"
        reason="we are not shipping a race fix nobody on the team can defend at 2am"
      />
    )
    expect(html).toContain("No agent on this ticket.")
    expect(html).toContain("we are not shipping a race fix nobody on the team can defend at 2am")
  })

  it("renders the review-only framing without a reason", () => {
    const html = renderToStaticMarkup(<AiPolicyBanner policy="review-only" />)
    expect(html).toContain("decide what ships")
  })

  it("never renders a close control, on any policy", () => {
    for (const policy of ["unassisted", "review-only"] as const) {
      const html = renderToStaticMarkup(<AiPolicyBanner policy={policy} reason="a reason" />)
      expect(html).not.toContain("<button")
    }
  })

  it("carries no em dash in its own copy", () => {
    const html = renderToStaticMarkup(<AiPolicyBanner policy="unassisted" reason="r" />)
    expect(html).not.toContain("—")
  })
})
