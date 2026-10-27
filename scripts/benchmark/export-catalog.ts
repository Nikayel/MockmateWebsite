import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod"
import { scenarios } from "../../lib/scenarios"
import { bugfixPacks } from "../../lib/scenarios/real-world/bugfix/packs"
import { HINT_SYSTEM_PROMPT } from "../../lib/agents/hints/prompts"

const root = process.cwd()
const directory = join(root, "benchmarks/codesparring")
const selection = z
  .object({
    version: z.string(),
    sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
    tasks: z.array(
      z.object({
        id: z.string(),
        track: z.enum(["dsa", "bugfix"]),
        source: z.string(),
        group: z.string(),
        reason: z.string(),
      })
    ),
  })
  .parse(JSON.parse(readFileSync(join(directory, "selection.json"), "utf8")))

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")
const selectedIds = new Set(selection.tasks.map((task) => task.id))
if (
  selectedIds.size !== 20 ||
  ["dsa", "bugfix"].some(
    (track) => selection.tasks.filter((task) => task.track === track).length !== 10
  )
)
  throw new Error("The benchmark must select exactly 10 DSA and 10 bugfix tasks.")

const tasks = selection.tasks.map((task) => {
  const scenario = scenarios.find((scenario) => scenario.id === task.id)
  if (!scenario || scenario.type !== task.track) throw new Error(`Missing scenario: ${task.id}`)
  const common = { ...task, title: scenario.title, difficulty: scenario.difficulty }
  if (scenario.type === "dsa") {
    if (!scenario.starterCode.python) throw new Error(`Python starter missing: ${task.id}`)
    return {
      ...common,
      statement: scenario.problemStatement,
      constraints: scenario.constraints,
      examples: scenario.examples,
      starter: scenario.starterCode.python,
      shippedCases: scenario.testCases,
      complexity: scenario.optimalComplexity,
      sourceHashes: { [task.source]: sha256(readFileSync(join(root, task.source), "utf8")) },
    }
  }
  const pack = bugfixPacks.find((pack) => pack.id === task.id)
  if (!pack || pack.srcFiles.length !== 1 || pack.fixtures.length !== 1) {
    throw new Error(`Expected one source and one fixture: ${task.id}`)
  }
  const readPack = (path: string) => readFileSync(join(root, task.source, path), "utf8")
  const manifest = z
    .object({ expected_output: z.string(), bug_class: z.string() })
    .parse(JSON.parse(readPack("manifest.json")))
  if (
    readPack(pack.srcFiles[0].path) !== pack.srcFiles[0].content ||
    readPack(pack.fixtures[0].path) !== pack.fixtures[0].content ||
    readPack("task.md") !== pack.taskMd ||
    manifest.expected_output !== pack.expectedOutput ||
    manifest.bug_class !== task.group
  ) {
    throw new Error(`Compiled pack and authored pack disagree: ${task.id}`)
  }
  const paths = [
    "manifest.json",
    "task.md",
    "sealed.json",
    "solution.md",
    pack.srcFiles[0].path,
    pack.fixtures[0].path,
  ]
  return {
    ...common,
    statement: pack.taskMd,
    starter: pack.srcFiles[0].content,
    sourcePath: pack.srcFiles[0].path,
    fixture: pack.fixtures[0].content,
    expectedStdout: pack.expectedOutput,
    sourceHashes: Object.fromEntries(
      paths.map((path) => {
        const relative = `${task.source}/${path}`
        return [relative, sha256(readFileSync(join(root, relative), "utf8"))]
      })
    ),
  }
})

const inventory = scenarios
  .filter((scenario) => ["dsa", "bugfix"].includes(scenario.type))
  .map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    track: scenario.type,
    difficulty: scenario.difficulty,
    selected: selectedIds.has(scenario.id),
    python:
      scenario.type === "dsa"
        ? Boolean(scenario.starterCode.python)
        : scenario.workspace?.language === "python",
    shippedCaseCount:
      scenario.type === "dsa" || scenario.type === "bugfix" ? scenario.testCases.length : 0,
    editableSourceLines:
      scenario.workspace?.files
        .filter((file) => file.role === "editable")
        .reduce((count, file) => count + file.content.split("\n").length, 0) ?? null,
  }))

for (const [file, value] of Object.entries({
  "catalog.json": {
    version: selection.version,
    sourceCommit: selection.sourceCommit,
    hintSystemPrompt: HINT_SYSTEM_PROMPT,
    hintPolicyHash: sha256(readFileSync(join(root, "lib/agents/hints/prompts.ts"), "utf8")),
    tasks,
  },
  "catalog-inventory.json": inventory,
})) {
  const content = `${JSON.stringify(value, null, 2)}\n`
  const path = join(directory, file)
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== content) throw new Error(`Catalog drift: ${file}`)
  } else writeFileSync(path, content)
}
process.stdout.write(
  `Catalog ${process.argv.includes("--check") ? "verified" : "exported"}: ` +
    `${inventory.length} audited, ${tasks.length} selected.\n`
)
