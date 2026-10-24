import { beforeEach, describe, expect, it, vi } from "vitest"

const h = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  reads: [] as string[],
  failArchive: false,
  profiles: vi.fn(),
}))
vi.mock("@/lib/firebase-admin", () => {
  const collection = (path: string) => ({
    doc: (id: string) => ({
      collection: (child: string) => collection(`${path}/${id}/${child}`),
      get: async () => {
        const key = `${path}/${id}`
        h.reads.push(key)
        if (h.failArchive && key.endsWith("/artifacts/transcript"))
          throw new Error("archive unavailable")
        return { id, exists: h.documents.has(key), data: () => h.documents.get(key) }
      },
    }),
  })
  return { adminDb: { collection } }
})
vi.mock("@/lib/usage/profile-lookup", () => ({
  fetchProfilesById: h.profiles,
  profileEmail: () => "learner@example.com",
}))
import { loadSessionInspection } from "../session-review/load"

beforeEach(() => {
  h.documents.clear()
  h.reads.length = 0
  h.failArchive = false
  h.profiles.mockReset().mockResolvedValue(new Map())
})

describe("loadSessionInspection", () => {
  it("reads only the selected session and its transcript, returning an explicit allowlist", async () => {
    h.documents.set("interview_sessions/sess1", {
      user_id: "learner",
      topic: "Cache",
      final_code: "fixed",
      silent_notes: ["private observation"],
      structured_feedback: { tldr: "Summary", rawFeedback: "private model output" },
      stripe_customer_id: "cus_secret",
    })
    h.documents.set("interview_sessions/sess1/artifacts/transcript", {
      messages: [{ role: "candidate", content: "I reproduced it" }],
      source: "server",
      secret: "not rendered",
    })
    const inspection = await loadSessionInspection("sess1")
    expect(h.reads).toEqual([
      "interview_sessions/sess1",
      "interview_sessions/sess1/artifacts/transcript",
    ])
    expect(h.profiles).toHaveBeenCalledTimes(1)
    expect(h.profiles).toHaveBeenCalledWith(["learner"])
    expect(inspection?.session.userLabel).toBe("learner@example.com")
    expect(inspection?.conversations[0].messages[0].content).toBe("I reproduced it")
    expect(inspection?.work.code).toBe("fixed")
    expect(JSON.stringify(inspection)).not.toMatch(
      /private observation|private model output|cus_secret|not rendered/
    )
  })
  it("does not request artifacts or profiles for nonexistent sessions", async () => {
    expect(await loadSessionInspection("missing")).toBeNull()
    expect(h.reads).toEqual(["interview_sessions/missing"])
    expect(h.profiles).not.toHaveBeenCalled()
  })
  it("falls back for an absent archive but propagates read failures instead of reporting an empty conversation", async () => {
    h.documents.set("interview_sessions/sess1", {
      session_state: { interviewer_messages: [{ type: "user", message: "Saved message" }] },
    })
    expect((await loadSessionInspection("sess1"))?.conversations[0].source).toBe(
      "interviewer_checkpoint"
    )
    h.failArchive = true
    await expect(loadSessionInspection("sess1")).rejects.toThrow("archive unavailable")
  })
})
