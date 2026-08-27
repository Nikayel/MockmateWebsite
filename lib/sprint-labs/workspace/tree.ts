/**
 * Sprint Labs workspace — the file tree the learner sees (PLAN.md Task 12, UX-SPEC.md §7).
 *
 * "File tree and locked files. Three groups, always in this order: `docs`, `src`, `tests`." `docs`
 * holds `MERIDIAN.md` and the generated `.meridian/MAP.md`, both read-only. `src` holds the ticket's
 * editable source. `tests` holds the ticket's visible test files, treated as read-only reference —
 * an interpretive call (the spec's own §7 text does not state the tests group's lock state
 * explicitly): the platform's canonical copy is what actually grades at submit
 * (AGENT-CONTEXT.md §4 launch blocker 5, "the grader runs the content repo's canonical
 * `tests/visible`, never the learner's copy"), so a learner-editable local copy would be editable
 * but functionally inert — an editable-looking dead end. Read-only reference material, exactly like
 * `MERIDIAN.md`/`MAP.md`, is the honest framing.
 *
 * Hidden test files are never a parameter anywhere in this module's input shape, which is the
 * structural guarantee that they cannot appear in the tree: `CompiledTicket.hiddenTests` (this
 * task's one caller-supplied ticket value) is METADATA ONLY (`TicketSecretMeta` — id/humanName/
 * tags/kind; see lib/sprint-labs/types.ts) and is never read by this file at all.
 *
 * CONTENT GAP, flagged in task-12-report.md: `CompiledTicket` (lib/sprint-labs/content/types.ts)
 * carries no compiled field for a ticket's editable `src/` seed content today — only `setupDiff` (a
 * unified diff, not reconstructable without a base tree the public bundle doesn't carry) and
 * `visibleTestFiles` (real content) exist. `editableFiles` below is the wired-but-dormant seam a
 * future content-compiler task fills (mirrors Task 14's `layerA(meridianMd)` seam for the same
 * reason); until then it is whatever `useSprintLabRunSync` resolves to, which starts at `{}` for
 * every ticket today, and the `src` group legitimately renders empty rather than fabricated content
 * — "never synthesize" is already this codebase's rule for `seedStats`/`inheritedDefects`
 * (lib/sprint-labs/types.ts), and the same discipline applies here.
 */
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"

export type WorkspaceTreeGroup = "docs" | "src" | "tests"

export interface WorkspaceTreeFile {
  path: string
  content: string
  editable: boolean
  group: WorkspaceTreeGroup
}

export interface BuildWorkspaceTreeInput {
  ticket: CompiledTicket
  /** Learner's current editable-file content (seed + overlay + live edits), keyed by path. See the
   *  content-gap note above: `{}` today for every ticket. */
  editableFiles: Readonly<Record<string, string>>
  /** Wired-but-dormant (see file header): `undefined`/`null` renders no MERIDIAN.md entry at all
   *  rather than a lockable-but-empty file. */
  meridianMd?: string | null
  /** This task's own Layer B computation (`./layer-b.ts`), already formatted via
   *  `lib/sprint-labs/partner/context-layers.ts`'s `layerB()` — the same text is what MAP.md shows
   *  and what the partner reasons over, by construction. */
  mapMd: string
}

export const MERIDIAN_MD_PATH = "MERIDIAN.md"
export const MAP_MD_PATH = ".meridian/MAP.md"

function sortedByPath(files: WorkspaceTreeFile[]): WorkspaceTreeFile[] {
  return [...files].sort((a, b) => a.path.localeCompare(b.path))
}

/** Pure. Composes the three groups in UX-SPEC.md §7's fixed order: docs, src, tests. */
export function buildWorkspaceTree(input: BuildWorkspaceTreeInput): WorkspaceTreeFile[] {
  const docs: WorkspaceTreeFile[] = []
  const meridianMd = input.meridianMd?.trim()
  if (meridianMd) {
    docs.push({
      path: MERIDIAN_MD_PATH,
      content: input.meridianMd ?? "",
      editable: false,
      group: "docs",
    })
  }
  docs.push({ path: MAP_MD_PATH, content: input.mapMd, editable: false, group: "docs" })

  const src = sortedByPath(
    Object.entries(input.editableFiles).map(([path, content]) => ({
      path,
      content,
      editable: true,
      group: "src" as const,
    }))
  )

  const tests = sortedByPath(
    input.ticket.visibleTestFiles.map((f) => ({
      path: f.path,
      content: f.content,
      editable: false,
      group: "tests" as const,
    }))
  )

  return [...docs, ...src, ...tests]
}

/**
 * The default active file: `MERIDIAN.md` when authored content exists, else the generated map.
 * UX-SPEC.md §7: "The workspace opens on MERIDIAN.md, never on a source file" — falling back to the
 * generated map (rather than the first source file) under today's content gap still honors the
 * rule's INTENT (never open on the thing the ticket exists to ask about), not just its literal
 * filename.
 */
export function defaultActiveFile(files: readonly WorkspaceTreeFile[]): string | undefined {
  const meridian = files.find((f) => f.path === MERIDIAN_MD_PATH)
  if (meridian) return meridian.path
  const map = files.find((f) => f.path === MAP_MD_PATH)
  if (map) return map.path
  return files[0]?.path
}
