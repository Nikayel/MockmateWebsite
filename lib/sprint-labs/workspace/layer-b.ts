/**
 * Sprint Labs workspace — Layer B (the generated map), computed CLIENT-SIDE (PLAN.md Task 12,
 * AGENT-CONTEXT.md §3).
 *
 * "Layer B — `.meridian/MAP.md`, generated, never hand-authored... Contains per-file exported
 * symbols with signatures ... the route table, the migration list, the test inventory, and
 * `git diff --stat`." This module is the ONE producer of that shape (`LayerBInput`, defined in
 * `lib/sprint-labs/partner/context-layers.ts` — Task 14 owns the type and the renderer `layerB()`;
 * this task owns computing its INPUT from the live workspace tree). The rendered MAP.md file shown
 * in the workspace's file tree and the `LayerBInput` posted to the chat route are the SAME
 * computation: `layer-b.ts` builds the input, `context-layers.ts`'s `layerB()` formats it, so the
 * map on screen and the map the partner reasons over can never silently disagree.
 *
 * A light regex pass, not a real parser: AGENT-CONTEXT.md §8 build-order item 7 names real
 * tsserver-backed `find_references`/`go_to_definition` as a LATER item, not v0. This is deliberately
 * "good enough to anchor the agent, not a compiler" — false negatives here degrade to "the map is
 * missing an export", not a spoiler-boundary failure, so a light heuristic is an acceptable v0 cost.
 *
 * Unassisted tickets: this module still runs (per the brief, "this is the ONLY producer of Layer
 * B... on unassisted tickets PartnerChat's own gating drops it... do not special-case") — the
 * capability gate lives in `PartnerChat`/the chat route (`modes.ts`/`route.ts`, both server- and
 * client-enforced per Task 14's C1 fix), never here.
 */
import type { LayerBFileSymbols, LayerBInput } from "@/lib/sprint-labs/partner/context-layers"

export interface LayerBSourceFile {
  path: string
  content: string
}

export interface ComputeLayerBInputOptions {
  /** ISO 8601 timestamp for the mandatory "generated at ..." header line. */
  generatedAt: string
  /** Already-computed `git diff --stat`-shaped summary (see `./diff-stat.ts`); "" when nothing changed. */
  diffStat: string
}

const EXPORT_DECL_RE =
  /export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g
const EXPORT_LIST_RE = /export(?:\s+type)?\s*\{([^}]*)\}/g
const EXPORT_DEFAULT_ANON_RE = /export\s+default\s+(?!function\b|class\b)/
const ROUTE_RE =
  /\b(?:app|server|fastify|router)\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/gi

function isTestFile(path: string): boolean {
  return /\.test\.[jt]sx?$/i.test(path) || /(^|\/)tests?\//i.test(path)
}

function isMigrationFile(path: string): boolean {
  return /(^|\/)migrations\//i.test(path) || /\.sql$/i.test(path)
}

function isSourceFile(path: string): boolean {
  return /\.[jt]sx?$/i.test(path) && !isTestFile(path)
}

/**
 * Exported symbol names for one file's content: named declarations (`export const foo = ...`),
 * re-export lists (`export { a, b as c }`, `type`-only entries normalized the same way), and a
 * single `"default"` entry for an anonymous default export. Order is insertion order, deduplicated.
 */
export function extractExportedSymbols(content: string): string[] {
  const names = new Set<string>()

  for (const match of content.matchAll(EXPORT_DECL_RE)) {
    names.add(match[1])
  }

  for (const match of content.matchAll(EXPORT_LIST_RE)) {
    for (const rawEntry of match[1].split(",")) {
      const entry = rawEntry.trim().replace(/^type\s+/, "")
      if (!entry) continue
      const asMatch = entry.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/)
      if (asMatch) {
        names.add(asMatch[2])
        continue
      }
      const simple = entry.match(/^([A-Za-z_$][\w$]*)$/)
      if (simple) names.add(simple[1])
    }
  }

  if (EXPORT_DEFAULT_ANON_RE.test(content)) {
    names.add("default")
  }

  return Array.from(names).sort()
}

/**
 * Cheap, deterministic, synchronous content hash — NOT cryptographic. `LayerBInput.sha`'s own
 * contract only requires an opaque revision marker ("a real git sha for a future server-backed
 * workspace, or a synthetic content hash today — either is opaque to this builder"), so a fast
 * djb2-family hash over every path+content pair is sufficient and keeps this module free of any
 * async Web Crypto call.
 */
export function hashWorkspaceContent(files: readonly LayerBSourceFile[]): string {
  const input = [...files]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => `${f.path}:${f.content}`)
    .join("\n")

  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

/**
 * Builds the client-computed `LayerBInput` from the live workspace tree. `files` should be every
 * non-locked-doc file the learner's mount carries (editable src plus the ticket's visible test
 * files) — never hidden-test paths, which are not in the mount at all (AGENT-CONTEXT.md §4) and so
 * cannot appear here regardless of what a caller passes, since hidden tests are never client-side
 * data in the first place.
 */
export function computeLayerBInput(
  files: readonly LayerBSourceFile[],
  options: ComputeLayerBInputOptions
): LayerBInput {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))

  const fileSymbols: LayerBFileSymbols[] = sorted
    .filter((f) => isSourceFile(f.path))
    .map((f) => ({ path: f.path, exports: extractExportedSymbols(f.content) }))

  const routes = new Set<string>()
  const migrations: string[] = []
  const tests: string[] = []

  for (const f of sorted) {
    if (isMigrationFile(f.path)) {
      migrations.push(f.path)
      continue
    }
    if (isTestFile(f.path)) {
      tests.push(f.path)
      continue
    }
    if (isSourceFile(f.path)) {
      for (const match of f.content.matchAll(ROUTE_RE)) {
        routes.add(`${match[1].toUpperCase()} ${match[2]}`)
      }
    }
  }

  return {
    sha: hashWorkspaceContent(sorted),
    generatedAt: options.generatedAt,
    files: fileSymbols,
    routes: Array.from(routes).sort(),
    migrations,
    tests,
    diffStat: options.diffStat,
  }
}
