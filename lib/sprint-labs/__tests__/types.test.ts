/**
 * Schema tests for Sprint Labs' shared domain types.
 *
 * Every schema gets: one valid fixture that parses, and the invalid variants
 * that matter most for that shape (enum misuse, missing required field,
 * out-of-range score, oversize content, or — for the grading-output
 * projections — an extra field that must be rejected rather than silently
 * stripped). See lib/sprint-labs/types.ts's file header for why the strict
 * subset exists.
 */

import { describe, expect, it } from "vitest"
import {
  MAX_WORKSPACE_FILE_CONTENT_CHARS,
  aiPolicySchema,
  archMapDeltaSchema,
  directiveEntrySchema,
  gateResultCaseSchema,
  gateResultSchema,
  provenanceSchema,
  sprintLabObjectiveSchema,
  sprintLabRunSchema,
  sprintLabRunStatusSchema,
  sprintLabTranscriptMessageSchema,
  sprintLabTranscriptSchema,
  sprintPublicSchema,
  ticketAttemptSchema,
  ticketAttemptScoresSchema,
  ticketBoardStatusSchema,
  ticketPublicSchema,
  ticketSecretMetaSchema,
  workbookSummarySchema,
  workspaceFileDocSchema,
} from "../types"
import {
  SERVER_EXECUTION_ETA,
  SERVER_EXECUTION_MESSAGE,
  SUPPORTED_WORKBOOK_LANGUAGES,
  workbookIsRunnable,
} from "../platform-capabilities"

const validObjective = {
  id: "idempotency-keys",
  label: "Idempotency keys",
  canDo: "I can design an idempotent write path.",
}

describe("aiPolicySchema", () => {
  it("accepts the three ai_policy modes", () => {
    for (const value of ["assisted", "unassisted", "review-only"]) {
      expect(aiPolicySchema.safeParse(value).success).toBe(true)
    }
  })

  it("rejects a value outside the enum", () => {
    expect(aiPolicySchema.safeParse("auto").success).toBe(false)
  })
})

describe("sprintLabObjectiveSchema", () => {
  it("parses a valid objective", () => {
    expect(sprintLabObjectiveSchema.safeParse(validObjective).success).toBe(true)
  })

  it("rejects a missing canDo sentence", () => {
    const { canDo: _canDo, ...rest } = validObjective
    expect(sprintLabObjectiveSchema.safeParse(rest).success).toBe(false)
  })

  it("rejects an empty label", () => {
    expect(sprintLabObjectiveSchema.safeParse({ ...validObjective, label: "" }).success).toBe(false)
  })
})

describe("archMapDeltaSchema", () => {
  it("parses the three labelled lists", () => {
    const value = { added: ["POST /claims"], changed: [], broke: [] }
    expect(archMapDeltaSchema.safeParse(value).success).toBe(true)
  })

  it("rejects a missing list", () => {
    expect(archMapDeltaSchema.safeParse({ added: [], changed: [] }).success).toBe(false)
  })
})

describe("workbookSummarySchema", () => {
  const valid = {
    id: "meridian",
    title: "Meridian",
    pitch: "Join a claims platform at sprint 1 and ship for ten sprints.",
    track: "Systems / Backend",
    language: "typescript",
    level: "Mid / Senior",
    topics: ["TypeScript as a type system"],
    sprintCount: 10,
    ticketCount: 50,
    estimatedHours: 40,
    requiresServerExecution: false,
    objectives: [validObjective],
  }

  it("parses a valid catalog card", () => {
    expect(workbookSummarySchema.safeParse(valid).success).toBe(true)
  })

  it("rejects a language outside the supported set", () => {
    const result = workbookSummarySchema.safeParse({ ...valid, language: "go" })
    expect(result.success).toBe(false)
  })

  it("rejects a non-positive sprintCount", () => {
    expect(workbookSummarySchema.safeParse({ ...valid, sprintCount: 0 }).success).toBe(false)
  })

  it("tolerates an unknown extra field (content schema, not a leak boundary)", () => {
    const result = workbookSummarySchema.safeParse({ ...valid, futureField: "ignored" })
    expect(result.success).toBe(true)
  })
})

describe("sprintPublicSchema", () => {
  const valid = {
    number: 1,
    title: "Contracts",
    goal: "Stop the 500s and the null-amount rows.",
    standupQuote: "Northwind got a 500 posting a claim their engineer swears is valid.",
    archMapDelta: { added: ["POST /claims"], changed: [], broke: [] },
    objectives: [validObjective],
  }

  it("parses a valid sprint with sizingNotes omitted", () => {
    expect(sprintPublicSchema.safeParse(valid).success).toBe(true)
  })

  it("parses with optional sizingNotes present", () => {
    const result = sprintPublicSchema.safeParse({
      ...valid,
      sizingNotes: "Split across two tickets.",
    })
    expect(result.success).toBe(true)
  })

  it("rejects sprint number zero", () => {
    expect(sprintPublicSchema.safeParse({ ...valid, number: 0 }).success).toBe(false)
  })

  it("rejects a malformed archMapDelta", () => {
    expect(
      sprintPublicSchema.safeParse({ ...valid, archMapDelta: { added: "not-an-array" } }).success
    ).toBe(false)
  })
})

describe("ticketPublicSchema", () => {
  const valid = {
    key: "MER-401",
    title: "Reject unparseable claim amounts",
    points: 3,
    labels: ["bug", "P1"],
    aiPolicy: "assisted" as const,
    objectives: [validObjective],
    bodyMd: "Northwind's engineer swears the payload is valid...",
    acceptanceCriteria: ["A null amount is rejected with a 400, not stored."],
    adversaryPresent: false,
  }

  it("parses a valid assisted ticket with no aiPolicyReason", () => {
    expect(ticketPublicSchema.safeParse(valid).success).toBe(true)
  })

  it("parses an unassisted ticket carrying aiPolicyReason and payoffFor", () => {
    const result = ticketPublicSchema.safeParse({
      ...valid,
      aiPolicy: "unassisted",
      aiPolicyReason: "The on-call engineer is out; you own this one solo.",
      payoffFor: "MER-1005",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an aiPolicy outside the enum", () => {
    expect(ticketPublicSchema.safeParse({ ...valid, aiPolicy: "auto" }).success).toBe(false)
  })

  it("rejects non-positive points", () => {
    expect(ticketPublicSchema.safeParse({ ...valid, points: 0 }).success).toBe(false)
  })

  it("rejects a missing bodyMd", () => {
    const { bodyMd: _bodyMd, ...rest } = valid
    expect(ticketPublicSchema.safeParse(rest).success).toBe(false)
  })
})

describe("ticketSecretMetaSchema", () => {
  const valid = {
    id: "hidden-001",
    humanName: "Escaped: duplicate delivery inside the retry window.",
    tags: ["idempotency"],
    kind: "io-case" as const,
  }

  it("parses valid hidden-test metadata", () => {
    expect(ticketSecretMetaSchema.safeParse(valid).success).toBe(true)
  })

  it("rejects a kind outside io-case/probe", () => {
    expect(ticketSecretMetaSchema.safeParse({ ...valid, kind: "snapshot" }).success).toBe(false)
  })

  it("rejects an extra field (metadata sits at the secret boundary)", () => {
    const result = ticketSecretMetaSchema.safeParse({ ...valid, expected: "42" })
    expect(result.success).toBe(false)
  })
})

describe("sprintLabRunStatusSchema / ticketBoardStatusSchema", () => {
  it("accepts every run status", () => {
    for (const value of ["in_progress", "completed", "abandoned"]) {
      expect(sprintLabRunStatusSchema.safeParse(value).success).toBe(true)
    }
  })

  it("accepts every board column", () => {
    for (const value of ["todo", "doing", "review", "done"]) {
      expect(ticketBoardStatusSchema.safeParse(value).success).toBe(true)
    }
  })

  it("rejects a legacy case-lab status value", () => {
    expect(sprintLabRunStatusSchema.safeParse("active").success).toBe(false)
  })
})

describe("sprintLabRunSchema", () => {
  const valid = {
    userId: "user-1",
    workbookId: "meridian",
    contentVersion: "2026.08.26-1",
    currentSprint: 1,
    board: { "MER-401": "doing" },
    status: "in_progress" as const,
    startedAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z",
  }

  it("parses a valid in-progress run with no currentTicketKey", () => {
    expect(sprintLabRunSchema.safeParse(valid).success).toBe(true)
  })

  it("parses a completed run carrying completedAt and currentTicketKey", () => {
    const result = sprintLabRunSchema.safeParse({
      ...valid,
      status: "completed",
      currentTicketKey: "MER-401",
      completedAt: "2026-08-27T00:00:00.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an illegal board column value", () => {
    const result = sprintLabRunSchema.safeParse({ ...valid, board: { "MER-401": "blocked" } })
    expect(result.success).toBe(false)
  })

  it("rejects a non-positive currentSprint", () => {
    expect(sprintLabRunSchema.safeParse({ ...valid, currentSprint: 0 }).success).toBe(false)
  })
})

describe("workspaceFileDocSchema", () => {
  const valid = {
    path: "src/http/server.ts",
    content: "export const server = {}\n",
    updatedAt: "2026-08-26T00:00:00.000Z",
    revision: 0,
  }

  it("parses a valid file doc", () => {
    expect(workspaceFileDocSchema.safeParse(valid).success).toBe(true)
  })

  it(`accepts content at exactly the ${MAX_WORKSPACE_FILE_CONTENT_CHARS}-char cap`, () => {
    const atCap = "a".repeat(MAX_WORKSPACE_FILE_CONTENT_CHARS)
    expect(workspaceFileDocSchema.safeParse({ ...valid, content: atCap }).success).toBe(true)
  })

  it("rejects content one char over the cap", () => {
    const overCap = "a".repeat(MAX_WORKSPACE_FILE_CONTENT_CHARS + 1)
    expect(workspaceFileDocSchema.safeParse({ ...valid, content: overCap }).success).toBe(false)
  })

  it("rejects a negative revision", () => {
    expect(workspaceFileDocSchema.safeParse({ ...valid, revision: -1 }).success).toBe(false)
  })
})

describe("gateResultCaseSchema / gateResultSchema", () => {
  const validCase = { testId: "t-1", humanName: "Escaped: duplicate delivery.", passed: false }

  it("parses a valid hidden-tier case", () => {
    expect(gateResultCaseSchema.safeParse(validCase).success).toBe(true)
  })

  it("rejects a case carrying raw runner output (the exact leak this strictness prevents)", () => {
    const result = gateResultCaseSchema.safeParse({ ...validCase, message: "stack trace: ..." })
    expect(result.success).toBe(false)
  })

  it("parses a valid gate result", () => {
    const result = gateResultSchema.safeParse({ gate: "hidden", cases: [validCase] })
    expect(result.success).toBe(true)
  })

  it("rejects an unknown gate kind", () => {
    expect(gateResultSchema.safeParse({ gate: "smoke", cases: [validCase] }).success).toBe(false)
  })

  it("rejects an extra field on the gate result itself", () => {
    const result = gateResultSchema.safeParse({ gate: "hidden", cases: [validCase], stdout: "..." })
    expect(result.success).toBe(false)
  })
})

describe("ticketAttemptScoresSchema", () => {
  const valid = {
    understanding: 80,
    problemSolving: 75,
    codeQuality: 90,
    communication: null,
    verification: 60,
    overall: 76,
  }

  it("parses valid scores with communication null (no prose collected)", () => {
    expect(ticketAttemptScoresSchema.safeParse(valid).success).toBe(true)
  })

  it("parses valid scores with communication as a number", () => {
    expect(ticketAttemptScoresSchema.safeParse({ ...valid, communication: 88 }).success).toBe(true)
  })

  it("rejects a score above 100", () => {
    expect(ticketAttemptScoresSchema.safeParse({ ...valid, overall: 101 }).success).toBe(false)
  })

  it("rejects a score below 0", () => {
    expect(ticketAttemptScoresSchema.safeParse({ ...valid, understanding: -1 }).success).toBe(false)
  })

  it("rejects an extra field", () => {
    expect(ticketAttemptScoresSchema.safeParse({ ...valid, bonus: 5 }).success).toBe(false)
  })
})

describe("ticketAttemptSchema", () => {
  const valid = {
    ticketKey: "MER-401",
    aiPolicy: "unassisted" as const,
    variantId: "variant-a",
    finalized: true,
    gateResults: [
      {
        gate: "hidden" as const,
        cases: [{ testId: "t-1", humanName: "Escaped: duplicate delivery.", passed: true }],
      },
    ],
    escapedDefects: [] as string[],
    scores: {
      understanding: 80,
      problemSolving: 75,
      codeQuality: 90,
      communication: null,
      verification: 60,
      overall: 76,
    },
    submittedAt: "2026-08-26T00:00:00.000Z",
  }

  it("parses a valid finalized attempt with no modelId", () => {
    expect(ticketAttemptSchema.safeParse(valid).success).toBe(true)
  })

  it("parses with modelId present", () => {
    expect(ticketAttemptSchema.safeParse({ ...valid, modelId: "gemini-3.6-flash" }).success).toBe(
      true
    )
  })

  it("rejects a malformed gateResults entry", () => {
    const result = ticketAttemptSchema.safeParse({ ...valid, gateResults: [{ gate: "hidden" }] })
    expect(result.success).toBe(false)
  })

  it("rejects an aiPolicy outside the enum", () => {
    expect(ticketAttemptSchema.safeParse({ ...valid, aiPolicy: "auto" }).success).toBe(false)
  })
})

describe("provenanceSchema", () => {
  it("accepts human and agent", () => {
    expect(provenanceSchema.safeParse("human").success).toBe(true)
    expect(provenanceSchema.safeParse("agent").success).toBe(true)
  })

  it("rejects an unknown provenance", () => {
    expect(provenanceSchema.safeParse("system").success).toBe(false)
  })
})

describe("sprintLabTranscriptMessageSchema / sprintLabTranscriptSchema", () => {
  it("parses a bare message with no optional fields", () => {
    const result = sprintLabTranscriptMessageSchema.safeParse({ role: "assistant", content: "Hi." })
    expect(result.success).toBe(true)
  })

  it("parses a message carrying aiPolicy, provenance, and capabilities", () => {
    const result = sprintLabTranscriptMessageSchema.safeParse({
      role: "assistant",
      content: "Server side isolated grading lands next month.",
      aiPolicy: "assisted",
      provenance: "human",
      capabilities: ["chat"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid provenance", () => {
    const result = sprintLabTranscriptMessageSchema.safeParse({
      role: "assistant",
      content: "Hi.",
      provenance: "ai",
    })
    expect(result.success).toBe(false)
  })

  it("parses a bounded transcript doc", () => {
    const result = sprintLabTranscriptSchema.safeParse({
      messages: [{ role: "user", content: "Why is this failing?" }],
      truncated: false,
      originalCount: 1,
    })
    expect(result.success).toBe(true)
  })
})

describe("directiveEntrySchema", () => {
  const valid = {
    id: "dir-1",
    instruction:
      "On changes touching tenant scoping, narrate the invariant before editing and leave the assertion for the learner to write.",
    tags: ["tenant-isolation"],
    createdSprint: 3,
    expiresAfterSprint: 6,
  }

  it("parses a valid directive entry", () => {
    expect(directiveEntrySchema.safeParse(valid).success).toBe(true)
  })

  it("rejects a missing instruction", () => {
    const { instruction: _instruction, ...rest } = valid
    expect(directiveEntrySchema.safeParse(rest).success).toBe(false)
  })

  it("rejects a non-positive createdSprint", () => {
    expect(directiveEntrySchema.safeParse({ ...valid, createdSprint: 0 }).success).toBe(false)
  })
})

describe("platform-capabilities", () => {
  it("names the ETA and folds it into the canonical message", () => {
    expect(SERVER_EXECUTION_ETA).toBe("next month")
    expect(SERVER_EXECUTION_MESSAGE).toContain(SERVER_EXECUTION_ETA)
    expect(SERVER_EXECUTION_MESSAGE).not.toContain("--")
  })

  it("lists exactly the four supported workbook languages, in order", () => {
    expect(SUPPORTED_WORKBOOK_LANGUAGES).toEqual(["typescript", "javascript", "python", "sql"])
  })

  it("workbookIsRunnable is true for a supported language with no server requirement", () => {
    expect(workbookIsRunnable({ language: "typescript", requiresServerExecution: false })).toBe(
      true
    )
  })

  it("workbookIsRunnable is false when the workbook declares it needs the server sandbox", () => {
    expect(workbookIsRunnable({ language: "python", requiresServerExecution: true })).toBe(false)
  })

  it("workbookIsRunnable is false for a language outside the supported set", () => {
    expect(workbookIsRunnable({ language: "go", requiresServerExecution: false })).toBe(false)
  })
})
