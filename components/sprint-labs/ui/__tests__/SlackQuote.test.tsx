/**
 * SlackQuote is fully static (no state), so a plain server-string render pins its content.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SlackQuote } from "../SlackQuote"

describe("SlackQuote", () => {
  it("renders the body quoted", () => {
    const html = renderToStaticMarkup(<SlackQuote body="Why is there a claim in my queue?" />)
    expect(html).toContain("Why is there a claim in my queue?")
  })

  it("omits the meta line when channel/time are not supplied", () => {
    const html = renderToStaticMarkup(<SlackQuote body="A quote with no metadata." />)
    expect(html).not.toContain("·")
  })

  it("renders channel and time together when both are supplied", () => {
    const html = renderToStaticMarkup(
      <SlackQuote body="Escalated." channel="#support-escalations" time="07:41" />
    )
    expect(html).toContain("#support-escalations")
    expect(html).toContain("07:41")
    expect(html).toContain("·")
  })

  it("carries no em dash in its own copy", () => {
    const html = renderToStaticMarkup(<SlackQuote body="body" channel="c" time="t" />)
    expect(html).not.toContain("—")
  })
})
