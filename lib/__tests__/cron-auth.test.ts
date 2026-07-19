import { afterEach, describe, expect, it } from "vitest"
import { verifyCronRequest } from "../cron-auth"

function req(auth?: string): Request {
  return new Request("https://example.com/api/cron/x", {
    headers: auth ? { authorization: auth } : {},
  })
}

describe("verifyCronRequest", () => {
  const original = process.env.CRON_SECRET
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = original
  })

  it("fails closed with 500 when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET
    expect(verifyCronRequest(req("Bearer anything"))).toEqual({
      ok: false,
      status: 500,
      error: "Server misconfiguration",
    })
  })

  it("rejects a wrong-length header without throwing (timingSafeEqual guard)", () => {
    process.env.CRON_SECRET = "s3cret-value"
    expect(() => verifyCronRequest(req("Bearer x"))).not.toThrow()
    expect(verifyCronRequest(req("Bearer x"))).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    })
  })

  it("rejects a wrong token of the same length", () => {
    process.env.CRON_SECRET = "abcd"
    expect(verifyCronRequest(req("Bearer wxyz"))).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    })
  })

  it("accepts the valid Bearer token", () => {
    process.env.CRON_SECRET = "abcd"
    expect(verifyCronRequest(req("Bearer abcd"))).toEqual({ ok: true })
  })

  it("rejects a missing Authorization header", () => {
    process.env.CRON_SECRET = "abcd"
    expect(verifyCronRequest(req())).toEqual({ ok: false, status: 401, error: "Unauthorized" })
  })
})
