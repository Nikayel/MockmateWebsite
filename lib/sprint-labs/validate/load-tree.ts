/**
 * The one filesystem boundary for `lab validate`: reads an authored
 * workbook directory (`workbooks/<id>/`) into the `AuthoredWorkbook`
 * tree-snapshot every rule in `rules/*` consumes as a pure function.
 *
 * Parsing note: the ruling behind this task names "the yaml package" for
 * workbook.yaml/sprint.yaml. That package is not an installed dependency
 * here (`node -e "require.resolve('yaml')"` fails) and adding one was ruled
 * out ("no new deps without reporting"). `gray-matter` (already a
 * dependency) is used instead for both ticket.md frontmatter (its native
 * job) and pure YAML files, via `matter.engines.yaml.parse` — its
 * documented, publicly-exported YAML engine. This is not an invented
 * workaround: scripts/compile-workbooks.mjs (Task 2, read-only reference)
 * independently uses the exact same `matter.engines.yaml.parse` call for
 * the same files, so this stays consistent with the sibling implementation.
 * Flagged in task-3-report.md.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs"
import { basename, join, relative, sep } from "node:path"
import matter from "gray-matter"
import type {
  AuthoredHiddenTest,
  AuthoredObjective,
  AuthoredSprint,
  AuthoredTicket,
  AuthoredWorkbook,
  RawRecord,
} from "./tree"

/**
 * gray-matter@4.0.3's own gray-matter.d.ts declares `engines` only as an
 * INPUT option shape (`GrayMatterOption.engines`), not as the runtime
 * `matter.engines.yaml.parse` value the package actually exports (verified
 * empirically: `node -e "require('gray-matter').engines.yaml.parse(...)"`
 * works). scripts/compile-workbooks.mjs relies on the identical call but
 * never hits this gap because `scripts/` is outside tsconfig's typechecked
 * set. This is a real gap in the published package's types, not an
 * unknown-safety issue, so it's narrowly typed and asserted once at this
 * boundary rather than reached for `any`.
 */
interface GrayMatterYamlEngine {
  engines: { yaml: { parse(input: string): unknown } }
}
const matterWithEngines = matter as unknown as typeof matter & GrayMatterYamlEngine

function readYamlFile(path: string): RawRecord {
  const raw = readFileSync(path, "utf8")
  const parsed: unknown = matterWithEngines.engines.yaml.parse(raw)
  return (parsed && typeof parsed === "object" ? parsed : {}) as RawRecord
}

function readOptionalYamlFile(path: string): RawRecord | null {
  return existsSync(path) ? readYamlFile(path) : null
}

function readFileIfExists(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null
}

function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile()) {
        out.push(full)
      }
    }
  }
  walk(dir)
  return out
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function loadHiddenTests(ticketDir: string): AuthoredHiddenTest[] {
  const hiddenDir = join(ticketDir, "tests", "hidden")
  if (!existsSync(hiddenDir)) return []
  return readdirSync(hiddenDir)
    .filter((name) => name.endsWith(".yaml") || name.endsWith(".yml"))
    .sort()
    .map((name) => {
      const path = join(hiddenDir, name)
      const raw = readYamlFile(path)
      return {
        fileName: basename(name).replace(/\.ya?ml$/, ""),
        path,
        raw,
        humanName: toOptionalString(raw.humanName),
        kind: toOptionalString(raw.kind),
        tags: toStringArray(raw.tags),
      }
    })
}

function loadTicket(ticketDir: string, key: string, sprintNumber: number): AuthoredTicket {
  const ticketMdPath = join(ticketDir, "ticket.md")
  if (!existsSync(ticketMdPath)) {
    throw new Error(`ticket.md missing for ${key} at ${ticketMdPath}`)
  }
  const { data, content } = matter(readFileSync(ticketMdPath, "utf8"))
  const frontmatterRaw = (data ?? {}) as RawRecord

  return {
    key,
    dirPath: ticketDir,
    sprintNumber,
    frontmatterRaw,
    bodyMd: content.trim(),
    title: toOptionalString(frontmatterRaw.title),
    points: toOptionalNumber(frontmatterRaw.points),
    labels: toStringArray(frontmatterRaw.labels),
    aiPolicy: toOptionalString(frontmatterRaw.ai_policy),
    aiPolicyReason: toOptionalString(frontmatterRaw.ai_policy_reason),
    objectives: toStringArray(frontmatterRaw.objectives),
    acceptanceCriteria: toStringArray(frontmatterRaw.acceptanceCriteria),
    payoffFor: toOptionalString(frontmatterRaw.payoffFor),
    payoffSignoff: toOptionalBoolean(frontmatterRaw.payoffSignoff),
    pathEnumerationSignoff: toOptionalBoolean(frontmatterRaw.pathEnumerationSignoff),
    setupDiff: readFileIfExists(join(ticketDir, "setup.diff")),
    referenceDiff: readFileIfExists(join(ticketDir, "reference.diff")),
    authorBriefRaw: readOptionalYamlFile(join(ticketDir, "author_brief.yaml")),
    hiddenTests: loadHiddenTests(ticketDir),
  }
}

function loadSprint(sprintDir: string, dirName: string): AuthoredSprint {
  const sprintYamlPath = join(sprintDir, "sprint.yaml")
  if (!existsSync(sprintYamlPath)) {
    throw new Error(`sprint.yaml missing at ${sprintYamlPath}`)
  }
  const raw = readYamlFile(sprintYamlPath)
  const number = toOptionalNumber(raw.number)
  if (number === undefined) {
    throw new Error(`sprint.yaml at ${sprintYamlPath} has no numeric "number" field`)
  }

  const ticketsDir = join(sprintDir, "tickets")
  const tickets = listSubdirs(ticketsDir)
    .map((key) => loadTicket(join(ticketsDir, key), key, number))
    .sort((a, b) => a.key.localeCompare(b.key))

  return {
    dirName,
    dirPath: sprintDir,
    number,
    raw,
    goal: toOptionalString(raw.goal),
    standupQuote: toOptionalString(raw.standupQuote),
    objectives: toStringArray(raw.objectives),
    filesTouched: toStringArray(raw.filesTouched),
    newSourceFiles: toStringArray(raw.newSourceFiles),
    rewrittenFiles: toStringArray(raw.rewrittenFiles),
    tickets,
  }
}

function loadObjectivesVocabulary(raw: RawRecord): AuthoredObjective[] {
  if (!Array.isArray(raw.objectives)) return []
  return raw.objectives
    .filter((entry): entry is RawRecord => typeof entry === "object" && entry !== null)
    .filter((entry): entry is RawRecord & { id: string } => typeof entry.id === "string")
    .map((entry) => ({
      id: entry.id,
      label: toOptionalString(entry.label),
      canDo: toOptionalString(entry.canDo),
    }))
}

function loadSeedFiles(repoDir: string): Set<string> {
  return new Set(
    listFilesRecursive(repoDir).map((absPath) => relative(repoDir, absPath).split(sep).join("/"))
  )
}

export function loadWorkbookTree(workbookDir: string): AuthoredWorkbook {
  const workbookYamlPath = join(workbookDir, "workbook.yaml")
  if (!existsSync(workbookYamlPath)) {
    throw new Error(`workbook.yaml missing at ${workbookYamlPath}`)
  }
  const raw = readYamlFile(workbookYamlPath)
  const id = toOptionalString(raw.id) ?? basename(workbookDir)

  const sprintsDir = join(workbookDir, "sprints")
  const sprints = listSubdirs(sprintsDir)
    .map((dirName) => loadSprint(join(sprintsDir, dirName), dirName))
    .sort((a, b) => a.number - b.number)

  return {
    id,
    dir: workbookDir,
    raw,
    objectivesVocabulary: loadObjectivesVocabulary(raw),
    seedFiles: loadSeedFiles(join(workbookDir, "repo")),
    meridianMd: readFileIfExists(join(workbookDir, "MERIDIAN.md")),
    sprints,
  }
}
