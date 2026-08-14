/**
 * The text alternative for an architecture diagram.
 *
 * ## Why a structured list and not an `aria-label`
 *
 * `TopologyDiagram` marked its `<svg>` `aria-hidden="true"`. The situation was better than
 * "no alternative": the frame supplies an accessible name, and each stage's `note` is a
 * required field rendered as real text, so a screen-reader user got a narrated walkthrough
 * of WHY each component arrives. What they never got was the structure — which components
 * exist, what connects to what, and whether a call is synchronous, asynchronous,
 * replication, or a feedback loop. That is the entire content of an architecture diagram.
 *
 * A flat `aria-label` describing a two-dimensional graph reads terribly: one unbroken
 * sentence with a dozen clauses and no way to re-read a single relationship. So this emits
 * a LIST — components grouped by kind, then one sentence per edge — which a screen reader
 * navigates item by item, and which a sighted reader never sees.
 *
 * ## Why this is the argument against adopting a diagram library
 *
 * Every rendering library surveyed (D2, Graphviz, Mermaid, React Flow, reaflow) emits at
 * best a `<title>` per node and exposes no relationships at all; Mermaid's own accessibility
 * tracker concedes the point. We can do better only because the spec is structured data we
 * own, so the alternative text is a pure function of it and cannot drift from the picture.
 * Pure and dependency-free on purpose: the integrity test calls it directly.
 */
import type { TopologySpec } from "./schema"

/** How each node kind reads aloud. The schema's short ids are UI labels, not English. */
const KIND_NOUN: Record<TopologySpec["nodes"][number]["kind"], string> = {
  client: "client",
  lb: "load balancer",
  service: "service",
  db: "database",
  cache: "cache",
  queue: "queue or log",
  cdn: "CDN",
  zone: "zone",
  external: "external system",
}

/**
 * How each edge kind reads aloud, as a verb phrase.
 *
 * The distinction carries real meaning the stroke pattern encodes visually: a dashed line
 * means the caller does not wait, and a sighted reader gets that for free. Saying
 * "synchronously" and "asynchronously" in words is how a screen-reader user gets it too.
 */
const KIND_VERB: Record<TopologySpec["edges"][number]["kind"], string> = {
  sync: "calls synchronously",
  async: "sends asynchronously to",
  replication: "replicates to",
  feedback: "feeds back into",
}

/**
 * A newline-separated adjacency description: the node roster, then one line per edge.
 *
 * One line per edge is a contract the integrity test asserts, so a diagram cannot ship a
 * connection that the text alternative omits.
 */
export function buildTopologyDescription(spec: TopologySpec): string {
  const labelOf = new Map(spec.nodes.map((n) => [n.id, n.label]))
  const lines: string[] = []

  for (const node of spec.nodes) {
    const group = spec.groups?.find((g) => g.nodes.includes(node.id))
    const where = group ? `, in ${group.label}` : ""
    lines.push(`${node.label}: ${KIND_NOUN[node.kind]}${where}.`)
  }

  for (const edge of spec.edges) {
    const from = labelOf.get(edge.from) ?? edge.from
    const to = labelOf.get(edge.to) ?? edge.to
    const detail = edge.label ? ` (${edge.label})` : ""
    lines.push(`${from} ${KIND_VERB[edge.kind]} ${to}${detail}.`)
  }

  return lines.join("\n")
}

/** A one-line accessible name for the SVG itself: what it is and how big it is. */
export function buildTopologySummary(spec: TopologySpec): string {
  const nodeCount = spec.nodes.length
  const edgeCount = spec.edges.length
  const title = spec.title ?? "Architecture"
  return (
    `${title}: an architecture diagram of ${nodeCount} component${nodeCount === 1 ? "" : "s"} ` +
    `and ${edgeCount} connection${edgeCount === 1 ? "" : "s"}. Full description follows.`
  )
}
