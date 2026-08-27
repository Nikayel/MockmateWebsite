/**
 * AcceptanceCriteria is a read-only, checkbox-free ordered list (UX-SPEC.md §6).
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AcceptanceCriteria } from "../AcceptanceCriteria"

describe("AcceptanceCriteria", () => {
  it("renders each criterion in order, numbered", () => {
    const html = renderToStaticMarkup(
      <AcceptanceCriteria
        criteria={[
          "A repeat submission cannot create a second extraction.",
          "The failure is visible as a stable error code, not a 500.",
        ]}
      />
    )
    const first = html.indexOf("A repeat submission")
    const second = html.indexOf("The failure is visible")
    expect(first).toBeGreaterThan(-1)
    expect(second).toBeGreaterThan(first)
    expect(html).toContain(">1<")
    expect(html).toContain(">2<")
  })

  it("never renders a checkbox: the gates decide, not the learner", () => {
    const html = renderToStaticMarkup(<AcceptanceCriteria criteria={["One criterion."]} />)
    expect(html).not.toContain('type="checkbox"')
  })

  it("renders an honest empty line when no criteria are published", () => {
    const html = renderToStaticMarkup(<AcceptanceCriteria criteria={[]} />)
    expect(html).toContain("No acceptance criteria published yet.")
  })
})
