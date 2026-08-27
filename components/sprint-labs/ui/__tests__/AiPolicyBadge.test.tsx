/**
 * AiPolicyBadge is fully static: one small pill per ai_policy value.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AiPolicyBadge } from "../AiPolicyBadge"

describe("AiPolicyBadge", () => {
  it("labels assisted, unassisted and review-only distinctly", () => {
    expect(renderToStaticMarkup(<AiPolicyBadge policy="assisted" />)).toContain("Assisted")
    expect(renderToStaticMarkup(<AiPolicyBadge policy="unassisted" />)).toContain("No agent")
    expect(renderToStaticMarkup(<AiPolicyBadge policy="review-only" />)).toContain("Review only")
  })
})
