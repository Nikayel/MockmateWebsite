import { beforeEach, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET, POST } from "./route"
import { verifyAuth } from "@/lib/auth-helpers"
import { responseFeedback, ResponseFeedbackError } from "@/lib/ai-response-feedback/generations"
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: vi.fn() }))
vi.mock("@/lib/rate-limiting", () => ({ ragRateLimit: vi.fn(async () => null) }))
vi.mock("@/lib/ai-response-feedback/generations", () => ({
  responseFeedback: vi.fn(),
  ResponseFeedbackError: class extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message)
    }
  },
}))
const identity = { generationId: "a136081b-2732-48b4-953b-acf8b2658703", responseId: "hint-1" }
function request(body: unknown = { ...identity, feedbackType: "helpful" }) {
  const req = new NextRequest(
    `https://app.test/api/ai-response-feedback?${new URLSearchParams(identity)}`
  )
  req.json = async () => body
  return req
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAuth).mockResolvedValue({ authenticated: true, userId: "owner" })
  vi.mocked(responseFeedback).mockResolvedValue("helpful")
})
it("authenticates reads and writes and uses token identity", async () => {
  expect((await POST(request())).status).toBe(200)
  expect(responseFeedback).toHaveBeenLastCalledWith(
    "owner",
    identity.generationId,
    identity.responseId,
    "helpful"
  )
  expect((await GET(request())).status).toBe(200)
  expect(responseFeedback).toHaveBeenLastCalledWith(
    "owner",
    identity.generationId,
    identity.responseId,
    undefined
  )
  vi.mocked(verifyAuth).mockResolvedValue({ authenticated: false, userId: null })
  expect((await POST(request())).status).toBe(401)
  expect((await GET(request())).status).toBe(401)
  expect(responseFeedback).toHaveBeenCalledTimes(2)
})
it.each([
  { ...identity, feedbackType: "great" },
  { ...identity, feedbackType: "helpful", userId: "forged" },
  { ...identity, feedbackType: "helpful", responseId: "../other" },
  { ...identity, feedbackType: "helpful", generationId: "slot-0" },
])("rejects malformed/spoofed input %j", async (body) => {
  expect((await POST(request(body))).status).toBe(400)
  expect(responseFeedback).not.toHaveBeenCalled()
})
it("reports missing ownership and failed storage rather than claiming success", async () => {
  vi.mocked(responseFeedback).mockRejectedValueOnce(
    new ResponseFeedbackError("Response not found", 404)
  )
  expect((await POST(request())).status).toBe(404)
  vi.mocked(responseFeedback).mockRejectedValueOnce(new Error("database unavailable"))
  expect((await POST(request())).status).toBe(503)
})
