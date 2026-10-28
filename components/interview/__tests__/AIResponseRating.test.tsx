/** @vitest-environment jsdom */
import { StrictMode } from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { AIResponseRating } from "../AIResponseRating"
import { ConversationMessage } from "@/app/interview/_components/ConversationMessage"

const mocks = vi.hoisted(() => ({
  user: { uid: "owner" } as { uid: string } | null,
  get: vi.fn(),
  send: vi.fn(),
}))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ firebaseUser: mocks.user }) }))
vi.mock("@/lib/hooks/useAuthedFetch", () => ({
  useAuthedFetch: () => ({ get: mocks.get, send: mocks.send }),
}))
const generationId = "a136081b-2732-48b4-953b-acf8b2658703"
const props = { generationId, responseId: generationId, label: "Rate response" }
const result = (value: "helpful" | "unhelpful" | null) => ({
  ok: true,
  data: { feedbackType: value },
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.user = { uid: "owner" }
  mocks.get.mockResolvedValue(result(null))
  mocks.send.mockImplementation(async (_url, _method, body) => result(body.feedbackType))
})
afterEach(cleanup)

it("works in StrictMode, awaits confirmation, and restores persisted ratings", async () => {
  let finish!: (value: ReturnType<typeof result>) => void
  mocks.send.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const view = render(
    <StrictMode>
      <AIResponseRating {...props} />
    </StrictMode>
  )
  const helpful = screen.getByRole("button", { name: "Helpful", exact: true })
  await waitFor(() => expect(helpful).toHaveProperty("disabled", false))
  fireEvent.click(helpful)
  expect(helpful).toHaveProperty("disabled", true)
  expect(helpful.getAttribute("aria-pressed")).toBe("false")
  expect(screen.queryByText("Rating saved")).toBeNull()
  await act(async () => finish(result("helpful")))
  expect(helpful.getAttribute("aria-pressed")).toBe("true")
  expect(mocks.send).toHaveBeenCalledWith(
    "/api/ai-response-feedback",
    "POST",
    { generationId, responseId: generationId, feedbackType: "helpful" },
    expect.any(Object)
  )
  view.unmount()
  mocks.get.mockResolvedValue(result("helpful"))
  render(<AIResponseRating {...props} />)
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Helpful", exact: true }).getAttribute("aria-pressed")
    ).toBe("true")
  )
})

it("keeps the saved value on a failed change and offers retry", async () => {
  mocks.get.mockResolvedValue(result("helpful"))
  mocks.send.mockResolvedValueOnce({ ok: false, status: 503 })
  render(<AIResponseRating {...props} />)
  const down = screen.getByRole("button", { name: "Not helpful" })
  await waitFor(() => expect(down).toHaveProperty("disabled", false))
  fireEvent.click(down)
  expect((await screen.findByRole("alert")).textContent).toContain("Couldn’t save")
  expect(
    screen.getByRole("button", { name: "Helpful", exact: true }).getAttribute("aria-pressed")
  ).toBe("true")
  fireEvent.click(down)
  await waitFor(() => expect(down.getAttribute("aria-pressed")).toBe("true"))
  expect(screen.queryByRole("alert")).toBeNull()
})

it("ignores a late write from the previous account", async () => {
  let finish!: (value: ReturnType<typeof result>) => void
  mocks.send.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const view = render(<AIResponseRating {...props} />)
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Helpful", exact: true })).toHaveProperty(
      "disabled",
      false
    )
  )
  fireEvent.click(screen.getByRole("button", { name: "Helpful", exact: true }))
  mocks.user = { uid: "next-owner" }
  view.rerender(<AIResponseRating {...props} />)
  await act(async () => finish(result("helpful")))
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Helpful", exact: true })).toHaveProperty(
      "disabled",
      false
    )
  )
  expect(
    screen.getByRole("button", { name: "Helpful", exact: true }).getAttribute("aria-pressed")
  ).toBe("false")
})

it("offers ratings only for registered, completed partner replies", async () => {
  const view = render(
    <ConversationMessage
      message={{ type: "ai", message: "Read the test", generationId }}
      speaker="Sparra"
      allowRating
    />
  )
  expect(await screen.findByRole("group", { name: "Rate partner response" })).not.toBeNull()
  for (const message of [
    { type: "user" as const, message: "question", generationId },
    { type: "ai" as const, message: "stream", generationId, isStreaming: true },
    { type: "ai" as const, message: "legacy" },
    { type: "ai" as const, message: "not registered", generationId, feedbackAvailable: false },
  ]) {
    view.rerender(<ConversationMessage message={message} speaker="Sparra" allowRating />)
    expect(screen.queryByRole("group")).toBeNull()
  }
})
