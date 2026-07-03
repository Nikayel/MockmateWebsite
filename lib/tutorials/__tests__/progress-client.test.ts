import { afterEach, describe, expect, it, vi } from "vitest"

// The client attaches a Firebase token; stub it so a "signed-in" request path is exercised.
vi.mock("@/lib/firebase-lazy", () => ({
  getCurrentUserToken: vi.fn(async () => "test-token"),
}))

import { fetchLessonProgress } from "../progress-client"

/**
 * Audit #4 regression: a load FAILURE must be distinguishable from "no saved progress yet". A failure
 * throws (so the resume hook keeps autosave gated and never clobbers the unread server doc); a genuine
 * 200 with `progress: null` returns null.
 */
describe("fetchLessonProgress — load failure vs. no-progress", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("throws on a non-ok response (a real failure, not an empty result)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 }) as Response)
    )
    await expect(fetchLessonProgress("py-l1-x")).rejects.toThrow(/Progress load failed/)
  })

  it("returns null for a genuine 200 with progress: null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ progress: null }) }) as Response)
    )
    await expect(fetchLessonProgress("py-l1-x")).resolves.toBeNull()
  })

  it("returns the saved progress on a 200 with data", async () => {
    const progress = { lessonId: "py-l1-x", levelId: 1 }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ progress }) }) as unknown as Response)
    )
    await expect(fetchLessonProgress("py-l1-x")).resolves.toEqual(progress)
  })
})
