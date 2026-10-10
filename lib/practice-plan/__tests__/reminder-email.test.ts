import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fixturePlan } from "./fixtures"
const send = vi.hoisted(() => vi.fn())
vi.mock("@/lib/email/brevo", () => ({ sendEmail: send }))
import { practiceReminderContent, sendPracticeReminder } from "../reminder-email"
beforeEach(() => {
  vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "fixture-secret")
  send.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})
describe("saved practice reminder", () => {
  it("escapes task content and links to the exact task and unsubscribe", () => {
    const content = practiceReminderContent({
      ...fixturePlan,
      recommendation: {
        ...fixturePlan.recommendation,
        title: "<script>bad</script>",
        focus: "a & b",
      },
    })
    expect(content.htmlContent).not.toContain("<script>")
    expect(content.htmlContent).toContain("&lt;script&gt;")
    expect(content.htmlContent).toContain("a &amp; b")
    expect(content.textContent).toContain(`${fixturePlan.recommendation.href}&return=reminder`)
    expect(content.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click")
  })
  it("sends one explicitly requested reminder", async () => {
    send.mockResolvedValue({ success: true })
    expect(await sendPracticeReminder(fixturePlan, "fixture@example.com")).toEqual({
      success: true,
    })
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ singleAttempt: true, tags: ["saved-practice"] })
    )
  })
  it("fails closed without unsubscribe configuration", async () => {
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "")
    vi.stubEnv("CRON_SECRET", "")
    expect(await sendPracticeReminder(fixturePlan, "fixture@example.com")).toMatchObject({
      success: false,
      retryable: true,
    })
    expect(send).not.toHaveBeenCalled()
  })
  it("bounds a stalled provider without scheduling a duplicate delivery", async () => {
    vi.useFakeTimers()
    send.mockReturnValue(new Promise(() => {}))
    const result = sendPracticeReminder(fixturePlan, "fixture@example.com")
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await result).toMatchObject({ success: false, deliveryUncertain: true })
    expect(send).toHaveBeenCalledTimes(1)
  })
})
