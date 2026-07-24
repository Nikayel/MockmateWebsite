/**
 * Pure, seeded consistent-hashing math behind the hash-ring widget. Everything
 * derives from FNV-1a over stable names (node letters, key labels, vnode replica
 * suffixes), so the same spec always renders the same ring — the determinism rule
 * the content-integrity gate enforces. No Math.random anywhere.
 *
 * Two assignment modes teach the lesson's core contrast:
 *  - "modulo": owner = nodes[hash(key) % N]. Changing N reshuffles almost every key
 *    (the shatter the widget makes visible).
 *  - "ring": nodes (x vnodeFactor replicas when enabled) sit at hashed positions on
 *    the unit circle; a key belongs to the first node point clockwise. Changing N
 *    remaps only ~1/N of keys, and vnodes smooth the load skew.
 */

/** FNV-1a 32-bit — tiny, stable, good-enough dispersion for a teaching widget. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Position on the unit ring [0, 1). */
export function ringPosition(name: string): number {
  return fnv1a(name) / 0x100000000
}

/** Node letters A.. for a given count (stable names keep remap semantics honest). */
export function nodeNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i))
}

/** Seeded key labels key-1..key-N. */
export function keyNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `key-${i + 1}`)
}

export interface RingPoint {
  node: string
  position: number
}

/** Every ring point for the node set (vnodes = 1 means one point per node). */
export function ringPoints(nodes: string[], vnodes: number): RingPoint[] {
  const points: RingPoint[] = []
  for (const node of nodes)
    for (let replica = 0; replica < vnodes; replica++)
      points.push({ node, position: ringPosition(`${node}#${replica}`) })
  return points.sort((a, b) => a.position - b.position)
}

export interface Assignment {
  /** key -> owning node */
  owner: Record<string, string>
  /** node -> fraction of keys owned (0..1) */
  shares: Record<string, number>
}

export function assignKeys(opts: {
  nodes: string[]
  keys: string[]
  mode: "modulo" | "ring"
  vnodes: number
}): Assignment {
  const { nodes, keys, mode, vnodes } = opts
  const owner: Record<string, string> = {}
  if (mode === "modulo") {
    for (const key of keys) owner[key] = nodes[fnv1a(key) % nodes.length]
  } else {
    const points = ringPoints(nodes, vnodes)
    for (const key of keys) {
      const position = ringPosition(key)
      const point = points.find((p) => p.position >= position) ?? points[0]
      owner[key] = point.node
    }
  }
  const shares: Record<string, number> = {}
  for (const node of nodes) shares[node] = 0
  for (const key of keys) shares[owner[key]] += 1 / keys.length
  return { owner, shares }
}

export interface RemapStats {
  moved: number
  total: number
  fraction: number
}

/** How many keys changed owner between two assignments. */
export function remapStats(
  before: Record<string, string>,
  after: Record<string, string>
): RemapStats {
  const keys = Object.keys(after)
  let moved = 0
  for (const key of keys) if (before[key] !== undefined && before[key] !== after[key]) moved++
  return { moved, total: keys.length, fraction: keys.length ? moved / keys.length : 0 }
}

/** The largest single node's share (the load-skew read-out). */
export function maxShare(assignment: Assignment): number {
  return Math.max(0, ...Object.values(assignment.shares))
}
