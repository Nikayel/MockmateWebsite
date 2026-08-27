/**
 * Static, non-interactive component: rendered via `renderToStaticMarkup` in the Node environment,
 * per UX-SPEC.md §16.1(a)'s house pattern (no jsdom needed, no @testing-library/jest-dom anywhere
 * in this repo).
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { TurnStateStrip } from "../TurnStateStrip"

describe("TurnStateStrip", () => {
  it("never-run: reads the exact refresh line, not a restored count", () => {
    const html = renderToStaticMarkup(
      <TurnStateStrip status="never-run" failingCount={3} filesChanged={2} turnIndex={7} />
    )
    expect(html).toContain("Run the visible tests to refresh this")
    // A restored count must never leak through even if the caller passes stale numbers alongside
    // status="never-run" -- the component ignores them entirely.
    expect(html).not.toContain("3 visible")
    expect(html).not.toContain("turn 7")
  })

  it("fresh, all green: renders 'All visible tests green' rather than '0 visible tests red'", () => {
    const html = renderToStaticMarkup(
      <TurnStateStrip status="fresh" failingCount={0} filesChanged={2} turnIndex={4} />
    )
    expect(html).toContain("All visible tests green")
    expect(html).toContain("2 files changed")
    expect(html).toContain("turn 4")
  })

  it("fresh, failing: singular/plural test and file words are correct", () => {
    const oneEach = renderToStaticMarkup(
      <TurnStateStrip status="fresh" failingCount={1} filesChanged={1} />
    )
    expect(oneEach).toContain("1 visible test red")
    expect(oneEach).toContain("1 file changed")

    const many = renderToStaticMarkup(
      <TurnStateStrip status="fresh" failingCount={3} filesChanged={2} />
    )
    expect(many).toContain("3 visible tests red")
    expect(many).toContain("2 files changed")
  })

  it("omits the turn segment entirely when turnIndex is not supplied", () => {
    const html = renderToStaticMarkup(
      <TurnStateStrip status="fresh" failingCount={0} filesChanged={0} />
    )
    expect(html).not.toContain("turn ")
  })

  it("stale: shows the last-known numbers plus a stale marker", () => {
    const html = renderToStaticMarkup(
      <TurnStateStrip status="stale" failingCount={2} filesChanged={3} turnIndex={5} />
    )
    expect(html).toContain("2 visible tests red")
    expect(html).toContain("(stale)")
  })

  it("running: shows the last-known numbers plus a running marker", () => {
    const html = renderToStaticMarkup(
      <TurnStateStrip status="running" failingCount={2} filesChanged={3} />
    )
    expect(html).toContain("(running…)")
  })

  it("carries no em dash in any authored string", () => {
    const statuses = ["never-run", "fresh", "stale", "running"] as const
    for (const status of statuses) {
      const html = renderToStaticMarkup(
        <TurnStateStrip status={status} failingCount={1} filesChanged={1} turnIndex={1} />
      )
      expect(html).not.toContain("—")
    }
  })
})
