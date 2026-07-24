/**
 * Schema + SSR-render guards for the two SD diagram types (Iteration 7): the ladder
 * (staged ordered levels, ascending enforced) and the topology (staged box-and-arrow,
 * 16-node cap, every node justified by exactly one stage, deterministic layout).
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import { preprocessAsciiArt, markdownComponents, lessonRemarkPlugins } from "@/lib/markdown"
import { parseDiagramSpec } from "../schema"
import { layoutTopology } from "../topology-layout"

function render(content: string): string {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      { remarkPlugins: lessonRemarkPlugins as never, components: markdownComponents },
      preprocessAsciiArt(content)
    )
  )
}

const fence = (spec: object) => "```csdiagram\n" + JSON.stringify(spec) + "\n```"

const ladder = {
  type: "ladder",
  title: "The latency ladder",
  scale: "log",
  bands: [
    { label: "L1 cache", value: 1, display: "~1 ns" },
    {
      label: "RAM read",
      value: 100,
      display: "~100 ns",
      note: "still a thousand times faster than an SSD random read",
    },
    { label: "SSD random read", value: 100000, display: "~100 us" },
    { label: "Same-DC round trip", value: 500000, display: "~0.5 ms" },
    {
      label: "Cross-region round trip",
      value: 100000000,
      display: "~100 ms",
      note: "why chatty cross-region calls feel slow",
    },
  ],
}

const topology = {
  type: "topology",
  title: "Feed skeleton",
  layout: "lr",
  nodes: [
    { id: "client", label: "Client", kind: "client" },
    { id: "lb", label: "Load balancer", kind: "lb" },
    { id: "api", label: "API service", kind: "service" },
    { id: "db", label: "Postgres", kind: "db" },
    { id: "cache", label: "Redis", kind: "cache" },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "api" },
    { from: "api", to: "db" },
    { from: "api", to: "cache" },
  ],
  stages: [
    {
      adds: ["client", "lb", "api"],
      note: "The simplest thing that serves the requirement: a stateless API behind a balancer.",
    },
    { adds: ["db"], note: "Posts must survive restarts, so state moves to Postgres." },
    {
      adds: ["cache"],
      note: "The 100:1 read ratio justifies a cache in front of the hot feed reads.",
    },
  ],
}

describe("ladder", () => {
  it("parses and renders through the real pipeline", () => {
    expect(parseDiagramSpec(JSON.stringify(ladder)).ok).toBe(true)
    const html = render(fence(ladder))
    expect(html).toContain("The latency ladder")
    expect(html).toContain("L1 cache")
    expect(html).not.toContain("language-csdiagram")
  })

  it("rejects descending band values", () => {
    const bad = { ...ladder, bands: [...ladder.bands].reverse() }
    const result = parseDiagramSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("ascend")
  })
})

describe("topology", () => {
  it("parses and renders staged with the first stage's justification", () => {
    expect(parseDiagramSpec(JSON.stringify(topology)).ok).toBe(true)
    const html = render(fence(topology))
    expect(html).toContain("Feed skeleton")
    expect(html).toContain("Stage 1 of 3")
    expect(html).toContain("stateless API behind a balancer")
    // Stage-1 nodes render; later-stage nodes do not (staged reveal).
    expect(html).toContain("Load balancer")
    expect(html).not.toContain("Postgres")
    expect(html).not.toContain("language-csdiagram")
  })

  it("rejects a node missing from every stage", () => {
    const bad = { ...topology, stages: topology.stages.slice(0, 2) }
    const result = parseDiagramSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("exactly one stage")
  })

  it("rejects an edge to an unknown node", () => {
    const bad = { ...topology, edges: [...topology.edges, { from: "api", to: "ghost" }] }
    expect(parseDiagramSpec(JSON.stringify(bad)).ok).toBe(false)
  })

  it("rejects more than 16 nodes (the anti-graph cap)", () => {
    const many = Array.from({ length: 17 }, (_, i) => ({
      id: `n${i}`,
      label: `Node ${i}`,
      kind: "service",
    }))
    const bad = {
      ...topology,
      nodes: many,
      edges: [{ from: "n0", to: "n1" }],
      stages: [{ adds: many.map((n) => n.id), note: "all" }],
    }
    expect(parseDiagramSpec(JSON.stringify(bad)).ok).toBe(false)
  })

  it("lays out layers deterministically and cycle-safe", () => {
    const parsed = parseDiagramSpec(JSON.stringify(topology))
    if (!parsed.ok) throw new Error(parsed.error)
    if (parsed.spec.type !== "topology") throw new Error("wrong type")
    const positions = layoutTopology(parsed.spec)
    expect(positions.get("client")).toEqual({ col: 0, row: 0 })
    expect(positions.get("lb")!.col).toBe(1)
    expect(positions.get("api")!.col).toBe(2)
    expect(positions.get("db")!.col).toBe(3)
    expect(positions.get("cache")!.col).toBe(3)
    expect(positions.get("cache")!.row).not.toBe(positions.get("db")!.row)
    // Cycle: settles instead of hanging.
    const cyclic = {
      ...parsed.spec,
      edges: [...parsed.spec.edges, { from: "db", to: "client", kind: "sync" as const }],
    }
    expect(() => layoutTopology(cyclic)).not.toThrow()
  })
})
