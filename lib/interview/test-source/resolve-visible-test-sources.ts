import { stripComments } from "@/lib/workspace-execution/js-sandbox/comments"

interface TestSourceQuery {
  description: string
  input: unknown
  passed: boolean
  isHidden?: boolean
}

interface TestSourceFile {
  path: string
  content: string
  language?: string
  hidden?: boolean
}

const normalizePath = (path: string) => path.replace(/^\.\//, "")
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function declarationPattern(name: string): RegExp {
  const escaped = name.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r")
  const literals = [
    JSON.stringify(name),
    "'" + escaped.replace(/'/g, "\\'") + "'",
    "`" + escaped.replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`",
  ]
  return new RegExp(
    "\\b(?:record|it|test)(?:\\.(?:only|skip))?\\s*\\(\\s*(?:" +
      literals.map(escapePattern).join("|") +
      ")\\s*,"
  )
}

/** Resolve only failed public tests. Unknown/dynamic or ambiguous titles stay unlinked. */
export function resolveVisibleTestSources<Result extends TestSourceQuery>(
  results: readonly Result[],
  files: readonly TestSourceFile[],
  visibleTestPaths: readonly string[]
): ReadonlyMap<Result, string> {
  const allowed = new Set(visibleTestPaths.map(normalizePath))
  const publicTests = files
    .filter((file) => !file.hidden && allowed.has(normalizePath(file.path)))
    .map((file) => ({
      path: file.path,
      declarations: stripComments(file.content, file.language ?? "javascript"),
    }))
  const sources = new Map<Result, string>()

  for (const result of results) {
    if (result.passed || result.isHidden || typeof result.input !== "string") continue
    const suite = result.input
    // TypeScript runners identify the actual test module in their suite field.
    const direct = publicTests.filter((file) => normalizePath(file.path) === normalizePath(suite))
    if (direct.length === 1) {
      sources.set(result, direct[0].path)
      continue
    }
    // Older JS/Python runners have human-readable suites. Match an exact static
    // declaration in the public test files, never a filename guessed from a title.
    const prefix = suite + ": "
    if (!result.description.startsWith(prefix)) continue
    const name = result.description.slice(prefix.length)
    if (!name) continue
    const pattern = declarationPattern(name)
    const matches = publicTests.filter((file) => pattern.test(file.declarations))
    if (matches.length === 1) sources.set(result, matches[0].path)
  }
  return sources
}
