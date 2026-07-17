/**
 * Renders the real component, because the bug this guards was invisible at the unit level:
 * `formatCell` returning "NULL" for a null is CORRECT. The defect only existed in the
 * markup, where a null and the string 'NULL' came out byte-identical and nothing
 * downstream could tell them apart.
 *
 * This grid backs every query result and every schema/data preview in the SQL course, so
 * it is most of what a learner reads.
 */
import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { SqlResultGrid } from "../SqlResultGrid"
import type { SqlResultSet } from "@/lib/tutorials/types"

function render(result: SqlResultSet | null | undefined, props: Record<string, unknown> = {}) {
  return renderToStaticMarkup(createElement(SqlResultGrid, { result, ...props }))
}

/** The <td> markup, in row-major order. */
function cells(html: string): string[] {
  return [...html.matchAll(/<td[^>]*>.*?<\/td>/g)].map((m) => m[0])
}

describe("SqlResultGrid", () => {
  it("distinguishes a real NULL from the string 'NULL'", () => {
    const html = render({
      columns: ["note"],
      rows: [[null], ["NULL"]],
    })
    const [nullCell, literalCell] = cells(html)

    // Both still SAY "NULL" — that is the right word for a null.
    expect(nullCell).toContain(">NULL<")
    expect(literalCell).toContain(">NULL<")
    // ...so the tone has to carry the difference.
    expect(nullCell).toContain("italic")
    expect(literalCell).not.toContain("italic")
    expect(nullCell).not.toBe(literalCell)
  })

  it("shows an empty string as something rather than nothing", () => {
    const [cell] = cells(render({ columns: ["note"], rows: [[""]] }))
    expect(cell).toContain("&#x27;&#x27;")
    expect(cell).toContain("italic")
  })

  it("right-aligns numbers so a column compares", () => {
    const [cell] = cells(render({ columns: ["amount"], rows: [[1200]] }))
    expect(cell).toContain("text-right")
    expect(cell).toContain("tabular-nums")
  })

  it("leaves a numeric-looking string left-aligned", () => {
    const [cell] = cells(render({ columns: ["zip"], rows: [["01234"]] }))
    expect(cell).not.toContain("text-right")
  })

  it("renders an empty result as a real 0-rows state", () => {
    // Anti-joins and DQ checks return zero rows on PURPOSE — it is an answer, not a failure.
    const html = render({ columns: ["id"], rows: [] })
    expect(html).toContain("0 rows")
    expect(cells(html)).toHaveLength(1)
  })

  it("does not throw on a non-result-set value", () => {
    // A failed query hands the grid an error sentinel; it must degrade, not eject the learner.
    expect(() => render(null)).not.toThrow()
    expect(render(null)).toContain("No result set")
    expect(() => render({ columns: [], rows: [] })).not.toThrow()
  })

  it("keeps a wide table's scrolling inside itself", () => {
    const html = render({ columns: ["a", "b"], rows: [[1, 2]] })
    expect(html).toContain("overflow-x-auto")
  })
})
