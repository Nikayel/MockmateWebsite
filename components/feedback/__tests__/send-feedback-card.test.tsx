// @vitest-environment jsdom
/**
 * The submission flow for the in-app feedback widget.
 *
 * The defect this suite guards is not a rendering detail. POST /api/product-feedback shipped with
 * no caller at all, so the `feedback` collection had no writer and the admin queue was empty by
 * construction. These tests pin the two things that make the caller trustworthy: the body it sends
 * is one the server's own schema accepts, and a failure does not cost the user their message.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { userFeedbackSubmissionSchema } from "@/lib/feedback/user-feedback-schema"
import { SendFeedbackCard } from "../SendFeedbackCard"

const getCurrentUserToken = vi.fn<() => Promise<string | null>>()

vi.mock("@/lib/firebase-lazy", () => ({
  getCurrentUserToken: () => getCurrentUserToken(),
}))

const MESSAGE = "The voice interviewer cuts out when I switch tabs on Safari."

const messageBox = () => screen.getByLabelText("Your message") as HTMLTextAreaElement
const sendButton = () => screen.getByRole("button", { name: /send feedback/i }) as HTMLButtonElement
const statusText = () => screen.getByRole("status").textContent ?? ""

function typeMessage(text = MESSAGE) {
  fireEvent.change(messageBox(), { target: { value: text } })
}

/** The body the component actually put on the wire, parsed back out of the fetch call. */
function submittedBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return JSON.parse(init.body as string)
}

function mockFetch(response: { ok: boolean; status?: number; json: () => Promise<unknown> }) {
  const fetchMock = vi.fn(async () => response as unknown as Response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

beforeEach(() => {
  getCurrentUserToken.mockResolvedValue("test-token")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe("SendFeedbackCard submission", () => {
  it("sends a body the server's own schema accepts", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ success: true, feedbackId: "a" }) })

    render(<SendFeedbackCard />)
    typeMessage()
    fireEvent.click(sendButton())

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/product-feedback")
    expect(init.method).toBe("POST")
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-token" })

    // The real contract: whatever the widget sends must survive the endpoint's strict schema.
    // A field the user is not allowed to set would fail here rather than in production.
    const parsed = userFeedbackSubmissionSchema.safeParse(submittedBody(fetchMock))
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.content).toBe(MESSAGE)
      expect(parsed.data.type).toBe("feedback")
    }
  })

  it("sends the type the user picked", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ success: true }) })

    render(<SendFeedbackCard />)
    fireEvent.click(screen.getByRole("button", { name: /report a bug/i }))
    typeMessage()
    fireEvent.click(sendButton())

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const parsed = userFeedbackSubmissionSchema.safeParse(submittedBody(fetchMock))
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.type).toBe("bug_report")
  })

  it("refuses to send until the message clears the server's minimum length", () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ success: true }) })

    render(<SendFeedbackCard />)
    expect(sendButton().disabled).toBe(true)

    typeMessage("too short")
    expect(sendButton().disabled).toBe(true)

    typeMessage()
    expect(sendButton().disabled).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("clears the box only after the server confirms the write", async () => {
    mockFetch({ ok: true, json: async () => ({ success: true, feedbackId: "abc" }) })

    render(<SendFeedbackCard />)
    typeMessage()
    fireEvent.click(sendButton())

    await waitFor(() => expect(statusText()).toMatch(/thank you/i))
    expect(messageBox().value).toBe("")
  })

  // The defect that matters most: a user who loses a paragraph to a failed request does not
  // retype it, so the report is gone and the founder never learns the thing was broken.
  it("keeps what the user typed when the request fails", async () => {
    mockFetch({
      ok: false,
      status: 429,
      json: async () => ({ success: false, error: "You have sent a lot of feedback today." }),
    })

    render(<SendFeedbackCard />)
    typeMessage()
    fireEvent.click(sendButton())

    await waitFor(() => expect(statusText()).toMatch(/sent a lot of feedback today/i))
    expect(messageBox().value).toBe(MESSAGE)
    expect(sendButton().disabled).toBe(false)
  })

  it("keeps the message when the network throws rather than responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline")
      })
    )

    render(<SendFeedbackCard />)
    typeMessage()
    fireEvent.click(sendButton())

    await waitFor(() => expect(statusText()).toMatch(/still here/i))
    expect(messageBox().value).toBe(MESSAGE)
  })

  it("asks the user to sign in again instead of posting without a token", async () => {
    getCurrentUserToken.mockResolvedValue(null)
    const fetchMock = mockFetch({ ok: true, json: async () => ({ success: true }) })

    render(<SendFeedbackCard />)
    typeMessage()
    fireEvent.click(sendButton())

    await waitFor(() => expect(statusText()).toMatch(/sign in again/i))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(messageBox().value).toBe(MESSAGE)
  })

  it("treats a 200 that did not actually store anything as a failure", async () => {
    mockFetch({ ok: true, json: async () => ({ success: false, error: "Database not available" }) })

    render(<SendFeedbackCard />)
    typeMessage()
    fireEvent.click(sendButton())

    await waitFor(() => expect(statusText()).toMatch(/database not available/i))
    expect(messageBox().value).toBe(MESSAGE)
  })
})
