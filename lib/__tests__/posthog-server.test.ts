/**
 * The identity contract between the two halves of PostHog instrumentation.
 *
 * lib/auth-context calls `posthog.identify(fbUser.uid)` in the browser, so the
 * Firebase uid is this project's person key. A server event captured against
 * any other id is not "slightly less useful" - PostHog records it as a
 * different person, and every question that spans the browser and the server
 * ("did the people who ran tests upgrade?") silently returns nonsense while
 * looking perfectly healthy.
 *
 * That failure is invisible in the product, invisible in the types, and only
 * shows up as two charts that quietly disagree, which is why it is pinned here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const capture = vi.fn()
const flush = vi.fn(() => Promise.resolve())
const construct = vi.fn()

vi.mock("posthog-node", () => ({
  PostHog: class {
    constructor(...args: unknown[]) {
      construct(...args)
    }
    capture(...args: unknown[]) {
      capture(...args)
    }
    flush() {
      return flush()
    }
  },
}))

const keepAlive = vi.fn()
vi.mock("@/lib/serverless-keep-alive", () => ({
  keepAliveUntilSettled: (p: Promise<unknown>) => keepAlive(p),
}))

const ORIGINAL_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

async function loadWithKey(key: string | undefined) {
  vi.resetModules()
  if (key === undefined) {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
  } else {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = key
  }
  return import("@/lib/posthog-server")
}

describe("capturePostHogServerEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    else process.env.NEXT_PUBLIC_POSTHOG_KEY = ORIGINAL_KEY
  })

  it("keys a signed-in event on the Firebase uid, so it joins the browser person", async () => {
    const { capturePostHogServerEvent } = await loadWithKey("phc_test")

    capturePostHogServerEvent("code_execution", {
      userId: "FTMrL1JxzzSVXk64DxnOnAdBZCi1",
      sessionId: "sess_9",
      passed: true,
    })

    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "FTMrL1JxzzSVXk64DxnOnAdBZCi1",
        event: "code_execution",
      })
    )
  })

  it("does not turn a signed-in event into an anonymous one", async () => {
    const { capturePostHogServerEvent } = await loadWithKey("phc_test")

    capturePostHogServerEvent("purchase", { userId: "uid_1", tier: "pro" })

    const properties = capture.mock.calls[0][0].properties
    expect(properties).not.toHaveProperty("$process_person_profile")
    expect(properties).toMatchObject({ tier: "pro" })
  })

  it("sends an event with no signed-in user WITHOUT inventing a person", async () => {
    const { capturePostHogServerEvent } = await loadWithKey("phc_test")

    capturePostHogServerEvent("ai_chat", { sessionId: "sess_4", interactionType: "partner" })

    const call = capture.mock.calls[0][0]
    // The id exists only because capture() demands one. The flag is what stops
    // it being counted as a human in person counts.
    expect(call.distinctId).toBe("anon_session:sess_4")
    expect(call.properties.$process_person_profile).toBe(false)
  })

  it("keeps the serverless instance alive until the flush settles", async () => {
    const { capturePostHogServerEvent } = await loadWithKey("phc_test")

    capturePostHogServerEvent("feedback_generated", { userId: "uid_1" })

    expect(flush).toHaveBeenCalledTimes(1)
    expect(keepAlive).toHaveBeenCalledTimes(1)
  })

  it("stays completely silent when no key is configured", async () => {
    const { capturePostHogServerEvent } = await loadWithKey(undefined)

    capturePostHogServerEvent("code_execution", { userId: "uid_1" })

    expect(construct).not.toHaveBeenCalled()
    expect(capture).not.toHaveBeenCalled()
  })

  it("never throws, so analytics cannot fail the request it measures", async () => {
    const { capturePostHogServerEvent } = await loadWithKey("phc_test")
    capture.mockImplementationOnce(() => {
      throw new Error("network down")
    })

    expect(() => capturePostHogServerEvent("ai_chat", { userId: "uid_1" })).not.toThrow()
  })

  it("builds the client once, not once per event", async () => {
    const { capturePostHogServerEvent } = await loadWithKey("phc_test")

    capturePostHogServerEvent("ai_chat", { userId: "uid_1" })
    capturePostHogServerEvent("ai_chat", { userId: "uid_2" })
    capturePostHogServerEvent("code_execution", { userId: "uid_3" })

    expect(construct).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledTimes(3)
  })
})
