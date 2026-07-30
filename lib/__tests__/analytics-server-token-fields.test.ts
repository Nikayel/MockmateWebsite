import { beforeEach, describe, expect, it, vi } from "vitest"
import { adminDb } from "../firebase-admin"
import { trackAIChatServer, trackFeedbackGenerationServer } from "../analytics-server"

/**
 * ai_chat / feedback_generated events carry provider-REPORTED token counts so
 * the AI-margin claim is measured, not modeled. Two contracts guarded here:
 * present usage lands on the event, absent usage stays entirely absent
 * (undefined values would fail the Firestore write and drop the whole event;
 * guessed zeros would poison the measured-margin data).
 */

describe("analytics-server token fields", () => {
  const add = vi.fn(() => Promise.resolve({ id: "evt" }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminDb.collection).mockReturnValue({ add } as never)
  })

  it("attaches provider-reported token counts to ai_chat events", async () => {
    await trackAIChatServer({
      sessionId: "session-1",
      userId: "user-1",
      interactionType: "interviewer",
      messageLength: 42,
      responseTimeMs: 900,
      provider: "gemini",
      tokensIn: 120,
      tokensOut: 45,
    })

    expect(adminDb.collection).toHaveBeenCalledWith("analytics_events")
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "ai_chat",
        properties: expect.objectContaining({ tokensIn: 120, tokensOut: 45 }),
      })
    )
  })

  it("omits token fields from ai_chat entirely when the provider reported no usage", async () => {
    await trackAIChatServer({
      sessionId: "session-1",
      interactionType: "partner",
      messageLength: 10,
      tokensIn: undefined,
      tokensOut: undefined,
    })

    const payload = add.mock.calls[0][0] as unknown as { properties: Record<string, unknown> }
    expect("tokensIn" in payload.properties).toBe(false)
    expect("tokensOut" in payload.properties).toBe(false)
  })

  it("attaches provider-reported token counts to feedback_generated events", async () => {
    await trackFeedbackGenerationServer({
      sessionId: "session-1",
      userId: "user-1",
      scenarioType: "dsa",
      performanceScore: 80,
      generationDurationMs: 1800,
      tokensIn: 900,
      tokensOut: 250,
    })

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "feedback_generated",
        properties: expect.objectContaining({ tokensIn: 900, tokensOut: 250 }),
      })
    )
  })

  it("omits token fields from feedback_generated when unavailable", async () => {
    await trackFeedbackGenerationServer({
      sessionId: "session-1",
      scenarioType: "dsa",
      performanceScore: 80,
      generationDurationMs: 1800,
    })

    const payload = add.mock.calls[0][0] as unknown as { properties: Record<string, unknown> }
    expect("tokensIn" in payload.properties).toBe(false)
    expect("tokensOut" in payload.properties).toBe(false)
  })
})
