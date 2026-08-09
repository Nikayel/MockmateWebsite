import { beforeEach, describe, expect, it, vi } from "vitest"
import { adminDb } from "../firebase-admin"
import { trackEnvDriftServer } from "../analytics-server"

/**
 * env_drift_shell_command is the durable counter for "the AI told the candidate
 * to run a shell command" (there is no terminal; Run Tests is the only way code
 * runs). Vercel log retention is ~1h and Sentry is not configured, so this
 * Firestore event is the record the drift rate is read from - it must land in
 * analytics_events with the fields the Firebase-console filter relies on.
 */
describe("trackEnvDriftServer", () => {
  const add = vi.fn(() => Promise.resolve({ id: "evt" }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminDb.collection).mockReturnValue({ add } as never)
  })

  it("writes an env_drift_shell_command event with lane and snippet", async () => {
    await trackEnvDriftServer({
      sessionId: "session-1",
      role: "partner",
      snippet: "run python3",
    })

    expect(adminDb.collection).toHaveBeenCalledWith("analytics_events")
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "env_drift_shell_command",
        properties: expect.objectContaining({
          role: "partner",
          snippet: "run python3",
          sessionId: "session-1",
        }),
      })
    )
  })

  it("omits sessionId entirely when absent (Firestore rejects undefined)", async () => {
    await trackEnvDriftServer({ role: "interviewer", snippet: "execute node" })

    const written = add.mock.calls[0][0] as unknown as { properties: Record<string, unknown> }
    expect(written.properties).toEqual({ role: "interviewer", snippet: "execute node" })
    expect("sessionId" in written.properties).toBe(false)
  })
})
