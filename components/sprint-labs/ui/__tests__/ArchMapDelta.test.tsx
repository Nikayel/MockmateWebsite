/**
 * ArchMapDelta renders the added/changed/broke/invariants lists, and degrades to an honest
 * inherited-seed line on sprint 1 when nothing is authored (UX-SPEC.md §4 "sprint 1" state).
 */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ArchMapDelta } from "../ArchMapDelta"
import type { ArchMapDelta as ArchMapDeltaValue } from "@/lib/sprint-labs/types"

function delta(overrides: Partial<ArchMapDeltaValue> = {}): ArchMapDeltaValue {
  return { added: [], changed: [], broke: [], invariants: [], ...overrides }
}

describe("ArchMapDelta", () => {
  it("renders added, changed and broke sections in order when authored", () => {
    const html = renderToStaticMarkup(
      <ArchMapDelta
        sprintNumber={3}
        delta={delta({
          added: ["migrations 0010-0012"],
          changed: ["every repository call now runs inside a transaction"],
          broke: ["the claims list is 4.2s for Continental since Tuesday"],
        })}
      />
    )
    const addedIndex = html.indexOf("Added")
    const changedIndex = html.indexOf("Changed")
    const brokeIndex = html.indexOf("Broke")
    expect(addedIndex).toBeGreaterThan(-1)
    expect(changedIndex).toBeGreaterThan(addedIndex)
    expect(brokeIndex).toBeGreaterThan(changedIndex)
    expect(html).toContain("migrations 0010-0012")
    expect(html).toContain("the claims list is 4.2s for Continental since Tuesday")
  })

  it("renders a fourth 'Always true' section for authored invariants", () => {
    const html = renderToStaticMarkup(
      <ArchMapDelta
        sprintNumber={1}
        delta={delta({ invariants: ["Every external payload is parsed before use."] })}
      />
    )
    expect(html).toContain("Always true")
    expect(html).toContain("Every external payload is parsed before use.")
  })

  it("omits a section entirely when its list is empty", () => {
    const html = renderToStaticMarkup(
      <ArchMapDelta sprintNumber={3} delta={delta({ added: ["a new thing"] })} />
    )
    expect(html).not.toContain("Changed")
    expect(html).not.toContain("Broke")
    expect(html).not.toContain("Always true")
  })

  it("describes sprint 1 as inherited when nothing is authored", () => {
    const html = renderToStaticMarkup(<ArchMapDelta sprintNumber={1} delta={delta()} />)
    expect(html).toContain("inherit")
  })

  it("uses a generic no-change line for a later sprint with nothing authored", () => {
    const html = renderToStaticMarkup(<ArchMapDelta sprintNumber={4} delta={delta()} />)
    expect(html).not.toContain("inherit")
    expect(html).toContain("No architecture changes recorded")
  })

  it("carries no em dash in its own copy", () => {
    const html = renderToStaticMarkup(<ArchMapDelta sprintNumber={1} delta={delta()} />)
    expect(html).not.toContain("—")
  })
})
