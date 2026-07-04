/**
 * Regression guard for the `asChild` + Radix `Slot` contract. The Button renders a loading spinner
 * as a sibling of `children`; when `asChild` is set, that made the Slot receive TWO children
 * (`[false|spinner, child]`), so `Slot`/`SlotClone` threw "React.Children.only expected to receive a
 * single React element child" and crashed the whole subtree (e.g. the SQL lesson's post-Practice
 * "Next lesson" button). Rendering must never throw and must slot the caller's element through.
 */
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { Button } from "../button"

describe("Button asChild", () => {
  it("slots a child that has multiple descendants without throwing (React.Children.only regression)", () => {
    // A plain <a> with several descendants mirrors the real crash site (`<Button asChild><Link>text
    // <Icon/></Link>`); an external href keeps the Next "use <Link>" lint rule out of a unit test.
    const html = renderToStaticMarkup(
      <Button asChild className="gap-2">
        <a href="https://example.com/next">
          Next lesson: CTEs
          <svg aria-hidden="true" />
        </a>
      </Button>
    )
    expect(html).toContain('href="https://example.com/next"')
    expect(html).toContain("Next lesson: CTEs")
  })

  it("does not throw when asChild is combined with loading", () => {
    expect(() =>
      renderToStaticMarkup(
        <Button asChild loading>
          <a href="/x">Go</a>
        </Button>
      )
    ).not.toThrow()
  })

  it("still renders children (and stays interactive) as a regular button", () => {
    const html = renderToStaticMarkup(<Button loading>Save</Button>)
    expect(html).toContain("Save")
    expect(html).toContain("<button")
  })
})
