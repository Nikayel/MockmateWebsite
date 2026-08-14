/**
 * The verifier for the topology diagram, landed before the conversion sweep that will
 * multiply it.
 *
 * `content-integrity.test.ts` already asserts that every authored fence parses, renders,
 * and renders the same twice. What it never asserted is whether the picture that comes
 * out is *correct*, and three separate defects lived under that gap on all 22 shipped
 * topology diagrams:
 *
 *  1. **Only stage 1 of N reached the server HTML.** `useStepPlayer` initialises to
 *     `useState(0)` and the renderer filtered both nodes and edges to the visible set, so
 *     `renderToStaticMarkup` emitted the first stage and nothing else. `/learn` pages are
 *     the site's main organic-traffic surface, so Googlebot indexed a fraction of each
 *     architecture, and any reader before hydration saw a truncated system.
 *  2. **The layered layout exploded on a cycle.** Longest-path relaxation with no
 *     acyclicity check pushed every cycle member one column right per pass: a six-node
 *     feedback loop produced 32 columns and a roughly 6,264px diagram with an arrow
 *     pointing backwards. The only guard was `not.toThrow()`, which watches for a hang
 *     rather than for a broken picture, so it would have shipped.
 *  3. **The SVG was `aria-hidden`.** Stage notes are real text, so a screen-reader user
 *     got a narrated walkthrough; what they never got was the structure, which is the
 *     entire content of an architecture diagram.
 *
 * Feedback loops are everywhere in the lessons queued for conversion (ML training loops,
 * streaming replay, retry paths, CDC), so per CLAUDE.md the check that catches a bad edit
 * lands before the sweep, not after.
 *
 * Every assertion below was confirmed to FAIL against the renderer as it stood on
 * 2026-08-13 before the repair landed.
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { TopologyDiagram } from "@/components/tutorials/diagrams/TopologyDiagram"
import { SYSTEM_DESIGN_LEVELS } from "@/lib/tutorials/system-design/curriculum"
import { extractCsDiagramSources } from "../extract"
import { parseDiagramSpec, type TopologySpec } from "../schema"
import { layoutTopology, returnEdgeIndexes, LAYERING_KINDS } from "../topology-layout"
import { buildTopologyDescription } from "../topology-description"

/** Every authored topology spec in the shipped curriculum, paired with its lesson id. */
function collectTopologies(): Array<{ lessonId: string; spec: TopologySpec }> {
  const out: Array<{ lessonId: string; spec: TopologySpec }> = []
  for (const level of SYSTEM_DESIGN_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        for (const source of extractCsDiagramSources(lesson.teach.markdown)) {
          const parsed = parseDiagramSpec(source)
          if (parsed.ok && parsed.spec.type === "topology") {
            out.push({ lessonId: lesson.id, spec: parsed.spec })
          }
        }
      }
    }
  }
  return out
}

const TOPOLOGIES = collectTopologies()

/**
 * The exact shape from the ML blueprint lesson's own ASCII drawing: raw logs to ETL to
 * training to registry to serving to a feedback log that closes the loop back to ETL.
 * This is the spec that produced 32 columns before the repair.
 */
const FEEDBACK_LOOP: TopologySpec = parseTopology({
  type: "topology",
  title: "Training feedback loop",
  layout: "lr",
  nodes: [
    { id: "logs", label: "Raw event logs", kind: "queue" },
    { id: "etl", label: "Feature ETL", kind: "service" },
    { id: "train", label: "Training job", kind: "service" },
    { id: "registry", label: "Model registry", kind: "db" },
    { id: "serve", label: "Serving tier", kind: "service" },
    { id: "feedback", label: "Feedback log", kind: "queue" },
  ],
  edges: [
    { from: "logs", to: "etl", kind: "sync" },
    { from: "etl", to: "train", kind: "sync" },
    { from: "train", to: "registry", kind: "sync" },
    { from: "registry", to: "serve", kind: "sync" },
    { from: "serve", to: "feedback", kind: "async" },
    { from: "feedback", to: "etl", kind: "feedback", label: "retrain signal" },
  ],
  stages: [
    { adds: ["logs", "etl"], note: "Events land in a log and a job turns them into features." },
    {
      adds: ["train", "registry"],
      note: "Training reads features and publishes a versioned model.",
    },
    { adds: ["serve"], note: "Serving loads the model that the registry marks current." },
    { adds: ["feedback"], note: "Outcomes flow back as labels, which is what closes the loop." },
  ],
})

function parseTopology(json: unknown): TopologySpec {
  const parsed = parseDiagramSpec(JSON.stringify(json))
  if (!parsed.ok) throw new Error(parsed.error)
  if (parsed.spec.type !== "topology") throw new Error("expected a topology spec")
  return parsed.spec
}

describe("topology layout stays bounded and forward-flowing", () => {
  it("walks the real corpus, so the assertions below cannot pass vacuously", () => {
    // A floor, not a count: the conversion sweep adds topologies continuously, so an
    // exact number here would be a merge conflict rather than a guard.
    expect(TOPOLOGIES.length).toBeGreaterThan(10)
  })

  it("never spends more columns than it has nodes", () => {
    // A layered layout puts at most one node per column in the worst case (a straight
    // chain). Anything above that means the layering pass ran away, which is the cycle
    // explosion: six nodes produced thirty-two columns.
    const offenders: string[] = []
    for (const { lessonId, spec } of [
      ...TOPOLOGIES.map((t) => ({ lessonId: t.lessonId, spec: t.spec })),
      { lessonId: "synthetic-feedback-loop", spec: FEEDBACK_LOOP },
    ]) {
      const positions = layoutTopology(spec)
      const columns = 1 + Math.max(...[...positions.values()].map((p) => p.col))
      if (columns > spec.nodes.length) {
        offenders.push(`${lessonId}: ${columns} columns for ${spec.nodes.length} nodes`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("keeps the six-node feedback loop inside six columns", () => {
    const positions = layoutTopology(FEEDBACK_LOOP)
    const columns = 1 + Math.max(...[...positions.values()].map((p) => p.col))
    expect(columns).toBeLessThanOrEqual(6)
  })

  it("draws every layering edge forward unless it was identified as a return edge", () => {
    // A backward arrow is legitimate in exactly one case: the edge closes a cycle, so the
    // layout removed it before layering and the renderer draws it as a return arc. Two
    // authored specs rely on this today (`sd-l2-btree-vs-lsm`'s compaction rewriting its
    // own SSTables, `sd-l10-web-crawler`'s dedup feeding the frontier), and in both the
    // loop IS the lesson. Any OTHER backward edge is the layering bug coming back.
    const offenders: string[] = []
    for (const { lessonId, spec } of [
      ...TOPOLOGIES,
      { lessonId: "synthetic-feedback-loop", spec: FEEDBACK_LOOP },
    ]) {
      const positions = layoutTopology(spec)
      const returns = returnEdgeIndexes(spec)
      spec.edges.forEach((edge, i) => {
        if (!LAYERING_KINDS.has(edge.kind) || returns.has(i)) return
        const from = positions.get(edge.from)
        const to = positions.get(edge.to)
        if (!from || !to) return
        if (to.col < from.col) {
          offenders.push(
            `${lessonId}: ${edge.kind} edge ${edge.from}(col ${from.col}) -> ${edge.to}(col ${to.col}) points backward`
          )
        }
      })
    }
    expect(offenders).toEqual([])
  })

  it("marks a cycle-closing edge as a return edge rather than layering it", () => {
    // The positive half of the rule above: the feedback edge must actually be caught.
    const returns = returnEdgeIndexes(FEEDBACK_LOOP)
    const feedbackIndex = FEEDBACK_LOOP.edges.findIndex((e) => e.kind === "feedback")
    expect(returns.has(feedbackIndex)).toBe(true)
  })
})

describe("topology server-renders its whole architecture", () => {
  it("puts every node label in the server HTML, not just the first stage", () => {
    // The SEO half of the bug: `/learn` lesson pages are statically generated, so what
    // `renderToStaticMarkup` emits here is literally what Googlebot indexes.
    const offenders: string[] = []
    for (const { lessonId, spec } of TOPOLOGIES) {
      const html = renderToStaticMarkup(createElement(TopologyDiagram, { spec }))
      for (const node of spec.nodes) {
        if (!html.includes(escapeHtml(node.label))) {
          offenders.push(`${lessonId}: "${node.label}" missing from server HTML`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("never truncates a node label with an ellipsis", () => {
    // Truncation evicted the qualifier the ASCII carried beside the component ("Redis
    // (atomic Lua)"), which is a split-attention cost the drawing it replaced did not
    // have. Wrapping is the fix; this asserts the slice never comes back.
    const offenders: string[] = []
    for (const { lessonId, spec } of TOPOLOGIES) {
      const html = renderToStaticMarkup(createElement(TopologyDiagram, { spec }))
      if (html.includes("…")) offenders.push(`${lessonId}: rendered an ellipsis in a label`)
    }
    expect(offenders).toEqual([])
  })
})

describe("topology structure reaches assistive technology", () => {
  it("names every node and every edge in the generated description", () => {
    const offenders: string[] = []
    for (const { lessonId, spec } of TOPOLOGIES) {
      const description = buildTopologyDescription(spec)
      for (const node of spec.nodes) {
        if (!description.includes(node.label)) {
          offenders.push(`${lessonId}: "${node.label}" absent from the text alternative`)
        }
      }
      // One sentence per edge, so a screen-reader user can enumerate the graph rather
      // than only hear the stage notes.
      if (description.split("\n").filter(Boolean).length < spec.edges.length) {
        offenders.push(`${lessonId}: fewer description lines than edges`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("renders that description into the server HTML", () => {
    const offenders: string[] = []
    for (const { lessonId, spec } of TOPOLOGIES) {
      const html = renderToStaticMarkup(createElement(TopologyDiagram, { spec }))
      const first = spec.edges[0]
      const fromLabel = spec.nodes.find((n) => n.id === first.from)?.label
      if (fromLabel && !html.includes(escapeHtml(fromLabel))) {
        offenders.push(`${lessonId}: adjacency text not in server HTML`)
      }
    }
    expect(offenders).toEqual([])
  })
})

/** React escapes text nodes, so compare against the escaped form rather than the raw label. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}
