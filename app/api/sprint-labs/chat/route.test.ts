/**
 * Route-level tests for /api/sprint-labs/chat. Mocks every module the route
 * imports except pure logic (sprintLabRunErrorStatus, isValidTicketKeyForDocId,
 * the real prompt/context-layer/concession builders) — matching
 * app/api/sprint-labs/attempts/route.test.ts's established style. The focus
 * here is POLICY RESOLUTION happening server-side from the ticket's real
 * ai_policy (never a client-claimed one), the unassisted 403 path, and
 * transcript-cap propagation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  getFlagAsync: vi.fn(),
  enforceMeteredAiRequest: vi.fn(),
  endRequestTracking: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
  generateAIResponse: vi.fn(),
  getSprint: vi.fn(),
  getTicket: vi.fn(),
  getSprintLabRun: vi.fn(),
  requireTierForSprint: vi.fn(),
  resolvePartnerModeForTicket: vi.fn(),
  getPartnerTranscript: vi.fn(),
  appendPartnerTurns: vi.fn(),
  setPartnerDirectiveMuted: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.verifyAuth }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))
vi.mock("@/lib/ai/metered-request", () => ({
  enforceMeteredAiRequest: mocks.enforceMeteredAiRequest,
}))
vi.mock("@/lib/rate-limiter", () => ({ endRequestTracking: mocks.endRequestTracking }))
vi.mock("@/lib/rate-limit", () => ({ chatRateLimit: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.loggerError, info: mocks.loggerInfo } }))
vi.mock("@/lib/ai-providers", () => ({ generateAIResponse: mocks.generateAIResponse }))
vi.mock("@/lib/sprint-labs/content/registry", () => ({
  getSprint: mocks.getSprint,
  getTicket: mocks.getTicket,
}))
vi.mock("@/lib/sprint-labs/runs", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/sprint-labs/runs")>("@/lib/sprint-labs/runs")
  return { ...actual, getSprintLabRun: mocks.getSprintLabRun }
})
vi.mock("@/lib/sprint-labs/route-guards", () => ({
  requireTierForSprint: mocks.requireTierForSprint,
}))
vi.mock("@/lib/sprint-labs/partner/resolve-mode.server", () => ({
  resolvePartnerModeForTicket: mocks.resolvePartnerModeForTicket,
}))
vi.mock("@/lib/sprint-labs/partner/transcript-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sprint-labs/partner/transcript-store")>(
    "@/lib/sprint-labs/partner/transcript-store"
  )
  return {
    ...actual,
    getPartnerTranscript: mocks.getPartnerTranscript,
    appendPartnerTurns: mocks.appendPartnerTurns,
    setPartnerDirectiveMuted: mocks.setPartnerDirectiveMuted,
  }
})

function createRequest(body: unknown, opts: { url?: string; method?: string } = {}): NextRequest {
  return {
    url: opts.url ?? "https://example.com/api/sprint-labs/chat",
    headers: { get: (name: string) => (name === "Authorization" ? "Bearer valid-token" : null) },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest
}

type StubResponse = { status: number; data?: Record<string, unknown> }

const USER = "user-1"
const RUN: { id: string; userId: string; workbookId: string; currentSprint: number } = {
  id: "run-1",
  userId: USER,
  workbookId: "fixture-demo",
  currentSprint: 1,
}
const TICKET = {
  key: "DEMO-101",
  title: "Claim intake 500s",
  aiPolicy: "assisted" as const,
  bodyMd: "body",
  acceptanceCriteria: [],
  objectives: [],
}
const COMPILED_TICKET = { ticket: TICKET, setupDiff: null, visibleTestFiles: [], hiddenTests: [] }
const VALID_BODY = { runId: "run-1", ticketKey: "DEMO-101", message: "hello", turnIndex: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: USER })
  mocks.getFlagAsync.mockResolvedValue(true)
  mocks.enforceMeteredAiRequest.mockResolvedValue({
    response: null,
    userId: USER,
    trackingStarted: true,
  })
  mocks.endRequestTracking.mockResolvedValue(undefined)
  mocks.getSprint.mockResolvedValue({
    number: 1,
    title: "Contracts",
    goal: "Ship it",
    standupQuote: "",
    archMapDelta: { added: [], changed: [], broke: [], invariants: [] },
    objectives: [],
  })
  mocks.getTicket.mockResolvedValue(COMPILED_TICKET)
  mocks.getSprintLabRun.mockResolvedValue(RUN)
  mocks.requireTierForSprint.mockResolvedValue(null)
  mocks.resolvePartnerModeForTicket.mockResolvedValue({ kind: "chat", filesContext: "" })
  mocks.getPartnerTranscript.mockResolvedValue({
    transcript: { messages: [], truncated: false, originalCount: 0 },
    mutedDirectiveIds: [],
  })
  mocks.generateAIResponse.mockResolvedValue({ text: "Sable's reply" })
  mocks.appendPartnerTurns.mockResolvedValue({ messages: [], truncated: false, originalCount: 2 })
})

describe("POST /api/sprint-labs/chat", () => {
  it("returns whatever enforceMeteredAiRequest's early response is, before any parsing", async () => {
    mocks.enforceMeteredAiRequest.mockResolvedValue({ response: { status: 429 } })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(429)
    expect(mocks.getFlagAsync).not.toHaveBeenCalled()
  })

  it("returns 404 (not 403) when the flag is off", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(404)
  })

  it("returns 400 on a body that fails schema validation", async () => {
    const { POST } = await import("./route")
    const response = (await POST(createRequest({ runId: "" }))) as unknown as StubResponse
    expect(response.status).toBe(400)
    expect(mocks.generateAIResponse).not.toHaveBeenCalled()
  })

  it("returns 400 for an unsafe ticket key", async () => {
    const { POST } = await import("./route")
    const response = (await POST(
      createRequest({ ...VALID_BODY, ticketKey: "../etc/passwd" })
    )) as unknown as StubResponse
    expect(response.status).toBe(400)
  })

  it("gates on Pro tier via the run before ever resolving a mode", async () => {
    mocks.requireTierForSprint.mockResolvedValue({ status: 403, data: { error: "Pro required" } })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(403)
    expect(mocks.resolvePartnerModeForTicket).not.toHaveBeenCalled()
  })

  it("returns 404 when the run does not resolve", async () => {
    mocks.getSprintLabRun.mockResolvedValue(null)
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(404)
  })

  it("returns 404 (UNKNOWN_TICKET) when the ticket doesn't exist in the compiled workbook", async () => {
    mocks.getTicket.mockResolvedValue(undefined)
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(404)
  })

  it("resolves policy SERVER-SIDE from the ticket, ignoring any client-claimed policy in the body", async () => {
    const { POST } = await import("./route")
    // The body schema has no aiPolicy field at all, so there is nothing a
    // client COULD set here — this test pins that fact by asserting the
    // resolver is called with the ticket object the server itself fetched.
    await POST(createRequest(VALID_BODY))
    // VALID_BODY posts no `files` at all, so filesContext is undefined here
    // (distinct from "posted an empty array") -- resolvePartnerMode itself
    // defaults an undefined filesContext to "" on the resolved mode.
    expect(mocks.resolvePartnerModeForTicket).toHaveBeenCalledWith(
      "fixture-demo",
      TICKET,
      "partner",
      undefined,
      "DEMO-101"
    )
  })

  it("unassisted (mode: none) returns 403 with the in-fiction reason and issues NO chat call at all", async () => {
    mocks.resolvePartnerModeForTicket.mockResolvedValue({
      kind: "none",
      reason: "You write this one yourself.",
    })
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse & {
      data: { reason: string }
    }
    expect(response.status).toBe(403)
    expect(response.data.reason).toBe("You write this one yourself.")
    expect(mocks.generateAIResponse).not.toHaveBeenCalled()
    expect(mocks.appendPartnerTurns).not.toHaveBeenCalled()
  })

  it("passes files context only for the requested 'partner' mode, never for 'tutor'", async () => {
    const { POST } = await import("./route")
    await POST(
      createRequest({
        ...VALID_BODY,
        mode: "tutor",
        files: [{ path: "src/secret.ts", content: "SHOULD NOT LEAK" }],
      })
    )
    const call = mocks.resolvePartnerModeForTicket.mock.calls[0]
    expect(call[3]).toBeUndefined() // filesContext arg
  })

  it("C1 (review round 1, Critical): tutor-blind NEVER receives Layer B, even when the client posts one", async () => {
    // The real layerB/buildPartnerSystemPrompt run in this test (neither is
    // mocked) -- this is the load-bearing assertion: repo-blindness must be
    // a capability gate on the SERVER, not a hope that the client withholds
    // layerB for a repo-blind ticket.
    mocks.resolvePartnerModeForTicket.mockResolvedValue({ kind: "tutor-blind" })
    const { POST } = await import("./route")
    await POST(
      createRequest({
        ...VALID_BODY,
        mode: "tutor",
        layerB: {
          sha: "a1b2c3d",
          generatedAt: "2026-08-27T00:00:00.000Z",
          files: [{ path: "src/http/claims.ts", exports: ["postClaim", "SECRET_HELPER"] }],
          routes: ["POST /claims"],
          migrations: [],
          tests: ["claims-parser.test.ts"],
          diffStat: "3 files changed",
        },
      })
    )
    const [systemPrompt] = mocks.generateAIResponse.mock.calls[0]
    expect(systemPrompt).not.toContain("generated at a1b2c3d")
    expect(systemPrompt).not.toContain("SECRET_HELPER")
    expect(systemPrompt).not.toContain("POST /claims")
    expect(systemPrompt).not.toContain("claims-parser.test.ts")
    expect(systemPrompt).not.toContain("EXPORTED SYMBOLS")
  })

  it("chat and author-agent modes legitimately keep Layer B when the client posts one", async () => {
    const { POST } = await import("./route")
    const layerBBody = {
      sha: "a1b2c3d",
      generatedAt: "2026-08-27T00:00:00.000Z",
      files: [{ path: "src/http/claims.ts", exports: ["postClaim"] }],
      routes: [],
      migrations: [],
      tests: [],
      diffStat: "",
    }
    await POST(createRequest({ ...VALID_BODY, layerB: layerBBody }))
    const [systemPrompt] = mocks.generateAIResponse.mock.calls[0]
    expect(systemPrompt).toContain("generated at a1b2c3d")
    expect(systemPrompt).toContain("postClaim")
  })

  it("on success: calls generateAIResponse with service sprint-labs-chat, persists both turns, and returns the reply", async () => {
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse & {
      data: { reply: string }
    }
    expect(response.status).toBe(200)
    expect(response.data.reply).toBe("Sable's reply")
    expect(mocks.generateAIResponse).toHaveBeenCalledWith(
      expect.any(String),
      "hello",
      [],
      expect.objectContaining({ service: "sprint-labs-chat", userId: USER })
    )
    expect(mocks.appendPartnerTurns).toHaveBeenCalledTimes(1)
    const [, , , turns] = mocks.appendPartnerTurns.mock.calls[0]
    expect(turns).toHaveLength(2)
    expect(turns[0]).toMatchObject({ role: "user", content: "hello", provenance: "human" })
    expect(turns[1]).toMatchObject({
      role: "assistant",
      content: "Sable's reply",
      provenance: "human",
    })
  })

  it("M2 (review round 1): the live model call keeps the client-appended Layer D note, but the stored user turn strips it", async () => {
    const noted =
      "why is this failing?\n\n[TURN STATE: turn 4, 2 visible tests red. Failing: a: expected 1 got 2.]"
    const { POST } = await import("./route")
    await POST(createRequest({ ...VALID_BODY, message: noted }))

    const [, userMessageSent] = mocks.generateAIResponse.mock.calls[0]
    expect(userMessageSent).toBe(noted) // live call: unstripped

    const [, , , turns] = mocks.appendPartnerTurns.mock.calls[0]
    expect(turns[0].content).toBe("why is this failing?") // stored/replayed copy: stripped
  })

  it("author-agent mode: a matched concession trigger appends a server-side note to the model call but NOT to the stored user content", async () => {
    mocks.resolvePartnerModeForTicket.mockResolvedValue({
      kind: "author-agent",
      brief: {
        intent: "intent",
        decisions: [],
        doNotVolunteer: [],
        concessionTriggers: ["missing sunset date"],
      },
    })
    const { POST } = await import("./route")
    await POST(createRequest({ ...VALID_BODY, message: "what about the missing sunset date?" }))

    const [, userMessageSent] = mocks.generateAIResponse.mock.calls[0]
    expect(userMessageSent).toContain("CONCESSION TRIGGERED")

    const [, , , turns] = mocks.appendPartnerTurns.mock.calls[0]
    expect(turns[0].content).toBe("what about the missing sunset date?")
    expect(turns[1].capabilities).toContain("concession")
  })

  it("ends request tracking even when the handler throws", async () => {
    mocks.generateAIResponse.mockRejectedValue(new Error("boom"))
    const { POST } = await import("./route")
    await POST(createRequest(VALID_BODY))
    expect(mocks.endRequestTracking).toHaveBeenCalledWith(USER)
  })

  it("maps an unrecognized error to a logged 500", async () => {
    mocks.generateAIResponse.mockRejectedValue(new Error("boom"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(500)
    expect(mocks.loggerError).toHaveBeenCalledTimes(1)
  })

  it("maps a run-ownership error (runs.ts's own vocabulary) to its real status, not a bare 500", async () => {
    mocks.appendPartnerTurns.mockRejectedValue(new Error("RUN_NOT_ACTIVE"))
    const { POST } = await import("./route")
    const response = (await POST(createRequest(VALID_BODY))) as unknown as StubResponse
    expect(response.status).toBe(409)
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })
})

describe("GET /api/sprint-labs/chat", () => {
  function getRequest(query: string): NextRequest {
    return createRequest(null, { url: `https://example.com/api/sprint-labs/chat?${query}` })
  }

  it("returns 401 when unauthenticated", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { GET } = await import("./route")
    const response = (await GET(
      getRequest("runId=run-1&ticketKey=DEMO-101")
    )) as unknown as StubResponse
    expect(response.status).toBe(401)
  })

  it("returns 400 when runId or ticketKey is missing", async () => {
    const { GET } = await import("./route")
    const response = (await GET(getRequest("runId=run-1"))) as unknown as StubResponse
    expect(response.status).toBe(400)
  })

  it("returns the transcript + mutes on success", async () => {
    mocks.getPartnerTranscript.mockResolvedValue({
      transcript: {
        messages: [{ role: "user", content: "hi" }],
        truncated: false,
        originalCount: 1,
      },
      mutedDirectiveIds: ["d1"],
    })
    const { GET } = await import("./route")
    const response = (await GET(
      getRequest("runId=run-1&ticketKey=DEMO-101")
    )) as unknown as StubResponse & { data: { mutedDirectiveIds: string[] } }
    expect(response.status).toBe(200)
    expect(response.data.mutedDirectiveIds).toEqual(["d1"])
  })

  it("returns 404 when the caller does not own the run", async () => {
    mocks.getPartnerTranscript.mockResolvedValue(null)
    const { GET } = await import("./route")
    const response = (await GET(
      getRequest("runId=run-1&ticketKey=DEMO-101")
    )) as unknown as StubResponse
    expect(response.status).toBe(404)
  })
})

describe("PATCH /api/sprint-labs/chat", () => {
  const muteBody = {
    action: "mute-directive",
    runId: "run-1",
    ticketKey: "DEMO-101",
    directiveId: "d1",
    muted: true,
  }

  it("returns 401 when unauthenticated", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { PATCH } = await import("./route")
    const response = (await PATCH(createRequest(muteBody))) as unknown as StubResponse
    expect(response.status).toBe(401)
  })

  it("returns 400 on an invalid action", async () => {
    const { PATCH } = await import("./route")
    const response = (await PATCH(
      createRequest({ ...muteBody, action: "something-else" })
    )) as unknown as StubResponse
    expect(response.status).toBe(400)
  })

  it("toggles the mute and returns the updated list", async () => {
    mocks.setPartnerDirectiveMuted.mockResolvedValue(["d1"])
    const { PATCH } = await import("./route")
    const response = (await PATCH(createRequest(muteBody))) as unknown as StubResponse & {
      data: { mutedDirectiveIds: string[] }
    }
    expect(response.status).toBe(200)
    expect(response.data.mutedDirectiveIds).toEqual(["d1"])
    expect(mocks.setPartnerDirectiveMuted).toHaveBeenCalledWith(
      USER,
      "run-1",
      "DEMO-101",
      "d1",
      true
    )
  })
})
