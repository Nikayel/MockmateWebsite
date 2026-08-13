/**
 * Per-type render smoke tests for every diagram component through the CsDiagram
 * dispatcher (server render). Locks that each type renders its distinctive structure,
 * never throws, and — for a spec that passes schema but hits a render edge — is caught
 * by the ErrorBoundary into the inline error box rather than propagating.
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CsDiagram } from "../CsDiagram"

function render(spec: object): string {
  return renderToStaticMarkup(createElement(CsDiagram, { source: JSON.stringify(spec) }))
}

describe("diagram components render via CsDiagram", () => {
  it("pipeline shows the SQL stages", () => {
    const html = render({ type: "pipeline", preset: "sql-select" })
    expect(html).toContain("FROM / JOIN")
    expect(html).toContain("ORDER BY")
  })

  it("pipeline keeps the SQL wording only when no title is given", () => {
    const html = render({ type: "pipeline", preset: "sql-select" })
    expect(html).toContain("SQL logical execution order")
    expect(html).toContain("Order of evaluation")
  })

  it("pipeline takes its heading and accessible name from an explicit title", () => {
    // The type was built for one SQL lesson and hardcoded that identity into both the frame heading
    // and the list's aria-label, so every non-SQL caller inherited it. Three System Design lessons
    // render a pipeline, one of them a RAG query path, and a screen reader announced "SQL logical
    // execution order" on all three.
    const html = render({
      type: "pipeline",
      stages: [{ label: "retrieve" }, { label: "rerank" }, { label: "generate" }],
      title: "RAG query path",
    })
    expect(html).toContain("RAG query path")
    expect(html).not.toContain("SQL logical execution order")
    expect(html).not.toContain("Order of evaluation")
  })

  it("join shows both tables, the kind, and the result grid", () => {
    const html = render({
      type: "join",
      kind: "inner",
      left: { name: "orders", columns: ["id", "cid"], rows: [[1, 7]] },
      right: { name: "customers", columns: ["cid", "name"], rows: [[7, "Ada"]] },
      on: ["cid", "cid"],
    })
    expect(html).toContain("INNER JOIN")
    expect(html).toContain("orders")
    expect(html).toContain("customers")
    expect(html).toContain("Result")
  })

  it("window-frame shows the frame clause and a value column", () => {
    const html = render({
      type: "window-frame",
      fn: "SUM",
      frame: "running",
      rows: [
        { label: "Jan", value: 100 },
        { label: "Feb", value: 200 },
      ],
    })
    expect(html).toContain("UNBOUNDED PRECEDING")
    expect(html).toContain("sum")
  })

  it("group-by shows the aggregate and grouping key", () => {
    const html = render({
      type: "group-by",
      agg: "AVG",
      by: "dept",
      rows: [
        { group: "Eng", value: 100 },
        { group: "Eng", value: 50 },
      ],
    })
    expect(html).toContain("GROUP BY dept")
  })

  it("er shows table names and a relation cardinality", () => {
    const html = render({
      type: "er",
      tables: [
        {
          name: "orders",
          columns: [
            { name: "id", key: "pk" },
            { name: "cid", key: "fk" },
          ],
        },
        { name: "customers", columns: [{ name: "cid", key: "pk" }] },
      ],
      relations: [{ from: "orders", to: "customers", kind: "n-1" }],
    })
    expect(html).toContain("orders")
    expect(html).toContain("n-1")
  })

  it("python-memory shows names, objects, and code", () => {
    const html = render({
      type: "python-memory",
      steps: [
        { code: "a = [1]", names: { a: "L1" }, objects: { L1: { kind: "list", value: "[1]" } } },
      ],
    })
    expect(html).toContain("a = [1]")
    expect(html).toContain("L1")
  })

  it("call-stack shows the frames", () => {
    const html = render({
      type: "call-stack",
      title: "f(2)",
      steps: [{ stack: ["f(2)", "f(1)"] }],
    })
    expect(html).toContain("Call stack")
    expect(html).toContain("f(1)")
  })

  it("comprehension shows both forms", () => {
    const html = render({
      type: "comprehension",
      loop: ["out = []", "for n in nums:", "    out.append(n)"],
      comp: "[n for n in nums]",
    })
    expect(html).toContain("Explicit loop")
    expect(html).toContain("Comprehension")
  })

  it("table shows columns and formats NULL", () => {
    const html = render({
      type: "table",
      columns: ["a", "b"],
      rows: [[1, null]],
      highlightCols: ["b"],
    })
    expect(html).toContain("NULL")
  })

  it("renders the inline error box for a malformed spec (no throw)", () => {
    const html = renderToStaticMarkup(createElement(CsDiagram, { source: "{ bad json" }))
    expect(html).toContain("could not render")
  })
})
