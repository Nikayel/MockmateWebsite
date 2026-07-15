/**
 * Compile a client-safe `BugfixPack` into a `BugFixScenario` so the existing
 * registry, metadata, editor, and workspace execution keep working (PLAN.md Sprint 1
 * item 1). The produced scenario carries a `pack` runtime marker; its presence routes
 * the session through the pack state machine + stdout-oracle runner instead of the
 * assert-test path.
 *
 * Sealing note: this module only ever touches the CLIENT-SAFE half of a pack. The
 * solution + phase-2 payload live in `lib/scenarios/sealed/<pack-id>.server.ts` and
 * are never imported here.
 */

import type {
  BugFixScenario,
  Company,
  DifficultyLevel,
  RoleTag,
  WorkspaceScenarioFile,
} from "@/lib/scenarios/types"
import type { BugfixPack, PackCompanyTag, PackDifficulty } from "./types"

const DIFFICULTY_BY_LEVEL: Record<PackDifficulty, DifficultyLevel> = {
  1: "easy",
  2: "medium",
  3: "hard",
}

const ROLES_BY_TAG: Record<PackCompanyTag, RoleTag[]> = {
  "palantir-fdse": ["fdse", "new-grad"],
  "stripe-bug-squash": ["swe", "new-grad"],
  "datadog-debugging": ["swe", "new-grad"],
  "generic-fdse": ["fdse", "swe"],
}

/** Candidate-visible expected-output oracle lives in the workspace as a visible file. */
const ORACLE_VISIBLE_PATH = "tests/expected_output.txt"
/** Machine-readable oracle config (PUBLIC data) — satisfies the hidden-test slot. */
const ORACLE_CONFIG_PATH = "tests/oracle.json"

function rolesForTag(tag: PackCompanyTag): RoleTag[] {
  return ROLES_BY_TAG[tag] ?? ["swe"]
}

function packWorkspaceFiles(pack: BugfixPack): WorkspaceScenarioFile[] {
  const files: WorkspaceScenarioFile[] = [
    {
      path: "task.md",
      content: pack.taskMd,
      role: "docs",
      language: "markdown",
      description: "Incident spec, run command, and the public expected-output oracle.",
    },
  ]

  for (const src of pack.srcFiles) {
    files.push({
      path: src.path,
      content: src.content,
      role: "editable",
      language: "python",
    })
  }

  for (const fixture of pack.fixtures) {
    files.push({
      path: fixture.path,
      content: fixture.content,
      role: "readonly",
      language: "text",
    })
  }

  // The oracle is PUBLIC content (PACK_REALISM_GUIDE.md §6). Both files carry only the
  // candidate-visible expected output / run command — no sealed data. They exist so a
  // pack is a structurally valid workspace scenario in the shared engine.
  files.push({
    path: ORACLE_VISIBLE_PATH,
    content: pack.expectedOutput,
    role: "test",
    language: "text",
    description: "The exact correct stdout. Diff your run against this.",
  })
  files.push({
    path: ORACLE_CONFIG_PATH,
    content: `${JSON.stringify({ runCmd: pack.runCmd, expectedOutput: pack.expectedOutput }, null, 2)}\n`,
    role: "test",
    language: "json",
    hidden: true,
    description: "Oracle run configuration.",
  })

  return files
}

export function packToScenario(pack: BugfixPack): BugFixScenario {
  const primaryFilePath = pack.srcFiles[0]?.path ?? "src/main.py"
  const editableFilePaths = pack.srcFiles.map((file) => file.path)

  return {
    id: pack.id,
    title: pack.title,
    type: "bugfix",
    difficulty: DIFFICULTY_BY_LEVEL[pack.difficulty],
    companies: pack.companies,
    roles: rolesForTag(pack.company.tag),
    description: pack.summary,
    tags: [pack.domain, pack.company.tag],
    estimatedTime: pack.estMinutes,
    executionMode: "workspace",
    problemStatement: pack.taskMd,
    // Present only on packs — routes the session through the pack runtime.
    pack: {
      packId: pack.id,
      runCmd: pack.runCmd,
      expectedOutput: pack.expectedOutput,
      primaryFilePath,
      language: pack.language,
    },
    userReport: pack.summary,
    observedSymptoms: [pack.summary],
    reproductionSteps: [
      "Read task.md for the incident and the run command.",
      `Run ${pack.runCmd} and diff the output against the oracle in task.md.`,
      "Reproduce the wrong section before opening the source.",
    ],
    successCriteria: [
      `Running ${pack.runCmd} reproduces the exact expected output shown in task.md.`,
    ],
    debuggingSkills: [
      "reproduction",
      "scoping via correct output",
      "hand-trace",
      "minimal fix",
      "re-verification",
    ],
    expectedTouchedFiles: [primaryFilePath],
    rootCauseRubric: [
      "Reproduces and localizes the wrong section before editing.",
      "States the single root cause in one sentence.",
      "Ships a minimal fix and re-verifies against the oracle.",
    ],
    bugfixKind: "real-codebase",
    // Sealed real bug lives server-side; this stays symptom-level and non-revealing.
    bugDescription: pack.summary,
    expectedBehavior: `Running ${pack.runCmd} prints the expected output byte-for-byte.`,
    groundTruth: undefined,
    hints: [
      "Reproduce with the run command and diff against the oracle before opening code.",
      "Which section of the output is wrong, and which section is already correct?",
      "Follow the one wrong value backwards from the print statement to what filled it.",
    ],
    buggyCode: {
      [pack.language]: pack.srcFiles.map((file) => file.content).join("\n\n"),
    },
    codebaseFiles: {
      [pack.language]: pack.srcFiles.map((file) => ({
        fileName: file.path,
        content: file.content,
        description: "Working-looking source under investigation.",
      })),
    },
    testCases: [
      {
        input: { runCmd: pack.runCmd, fixtures: pack.fixtures.map((f) => f.path) },
        expected: { stdout: pack.expectedOutput },
        description: "stdout matches the public oracle byte-for-byte",
      },
    ],
    workspace: {
      language: pack.language,
      primaryFilePath,
      editableFilePaths,
      visibleTestPaths: [ORACLE_VISIBLE_PATH],
      hiddenTestPaths: [ORACLE_CONFIG_PATH],
      testRunnerPath: ORACLE_CONFIG_PATH,
      files: packWorkspaceFiles(pack),
    },
  }
}

export interface PackQualityIssue {
  field: string
  message: string
}

const PACK_GIVEAWAY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(bug|fixme|herring|intentional|subtle|hack)\b/i, label: "bug/herring marker" },
  { pattern: /todo[:\s].*fix/i, label: "todo-fix marker" },
  { pattern: /\bthe bug is\b/i, label: "direct bug diagnosis" },
  { pattern: /\broot cause is\b/i, label: "direct root-cause diagnosis" },
]

/**
 * Validate the CLIENT-SAFE half of a pack. Unlike `validateBugfixScenarioQuality`
 * (legacy assert scenarios), this does NOT require a client-side reference solution —
 * packs seal their fix. It enforces the oracle + giveaway + newline discipline that
 * the stdout-oracle model depends on (PACK_REALISM_GUIDE.md §6–§7).
 *
 * `sealedBugSummary` (optional) is the one-sentence bug statement from the sealed
 * module; when provided, its verbatim presence in any candidate-visible file is a leak.
 */
export function validatePackQuality(
  pack: BugfixPack,
  sealedBugSummary?: string
): PackQualityIssue[] {
  const issues: PackQualityIssue[] = []

  if (pack.srcFiles.length === 0) {
    issues.push({ field: "srcFiles", message: "A pack must ship at least one source file." })
  }
  if (pack.fixtures.length === 0) {
    issues.push({ field: "fixtures", message: "A pack must ship at least one fixture." })
  }

  const expected = pack.expectedOutput
  if (!expected.trim()) {
    issues.push({ field: "expectedOutput", message: "Expected-output oracle must not be empty." })
  }
  if (expected && !expected.endsWith("\n")) {
    issues.push({
      field: "expectedOutput",
      message: "Oracle must end with exactly one trailing LF newline.",
    })
  }
  if (/\r/.test(expected)) {
    issues.push({ field: "expectedOutput", message: "Oracle must use LF newlines only (no CR)." })
  }
  if (/[ \t]+\n/.test(expected)) {
    issues.push({
      field: "expectedOutput",
      message: "Oracle lines must not have trailing whitespace (invisible diffs).",
    })
  }
  if (expected.trim() && !pack.taskMd.includes(expected.trimEnd())) {
    issues.push({
      field: "taskMd",
      message:
        "task.md must embed the exact expected-output oracle (it is the candidate's diff tool).",
    })
  }

  const srcLineCount = pack.srcFiles.reduce(
    (total, file) => total + file.content.split("\n").length,
    0
  )
  if (pack.srcFiles.length > 0 && (srcLineCount < 40 || srcLineCount > 200)) {
    issues.push({
      field: "srcFiles",
      message: `Source is ${srcLineCount} lines; target is 60–120 (hard bounds 40–200).`,
    })
  }

  const candidateVisible: Array<{ field: string; text: string }> = [
    { field: "title", text: pack.title },
    { field: "summary", text: pack.summary },
    { field: "taskMd", text: pack.taskMd },
    ...pack.srcFiles.map((file) => ({ field: file.path, text: file.content })),
    ...pack.fixtures.map((file) => ({ field: file.path, text: file.content })),
  ]

  const sealed = sealedBugSummary?.trim().toLowerCase()
  for (const { field, text } of candidateVisible) {
    for (const giveaway of PACK_GIVEAWAY_PATTERNS) {
      if (giveaway.pattern.test(text)) {
        issues.push({ field, message: `Candidate-visible content includes ${giveaway.label}.` })
      }
    }
    if (sealed && text.toLowerCase().includes(sealed)) {
      issues.push({ field, message: "Candidate-visible content reveals the sealed bug summary." })
    }
  }

  return issues
}
