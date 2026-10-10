import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const api = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock("@getbrevo/brevo", () => ({
  TransactionalEmailsApi: class {
    setApiKey() {}
    sendTransacEmail = api.send
  },
  TransactionalEmailsApiApiKeys: { apiKey: "key" },
  ContactsApi: class {},
  ContactsApiApiKeys: {},
  SendSmtpEmail: class {},
  CreateContact: class {},
}))
import { sendEmail } from "../brevo"
const options = {
  to: [{ email: "fixture@example.com" }],
  subject: "Fixture",
  htmlContent: "Fixture",
  singleAttempt: true,
}
beforeEach(() => {
  vi.stubEnv("BREVO_API_KEY", "fixture-key")
  api.send.mockReset()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})
describe("reminder delivery classification", () => {
  it.each([
    [{ code: "ETIMEDOUT" }, true, false],
    [{ statusCode: 500 }, true, false],
    [{ response: { statusCode: 503 } }, true, false],
    [{ statusCode: 429 }, false, true],
    [{ statusCode: 400 }, false, false],
  ])("sends once and classifies %j", async (error, deliveryUncertain, retryable) => {
    api.send.mockRejectedValue(error)
    expect(await sendEmail(options)).toMatchObject({ success: false, deliveryUncertain, retryable })
    expect(api.send).toHaveBeenCalledTimes(1)
  })
  it("confirms a successful provider response", async () => {
    api.send.mockResolvedValue({ body: { messageId: "confirmed" } })
    expect(await sendEmail(options)).toEqual({ success: true, messageId: "confirmed" })
  })
  it("retries missing configuration later without claiming a delivery", async () => {
    vi.stubEnv("BREVO_API_KEY", "")
    expect(await sendEmail(options)).toMatchObject({ success: false, retryable: true })
    expect(api.send).not.toHaveBeenCalled()
  })
  it("preserves the existing immediate retry behavior for other mail", async () => {
    vi.useFakeTimers()
    api.send.mockRejectedValue({ statusCode: 503 })
    const result = sendEmail({ ...options, singleAttempt: false })
    await vi.advanceTimersByTimeAsync(3000)
    expect(await result).toMatchObject({ success: false })
    expect(api.send).toHaveBeenCalledTimes(3)
  })
})
