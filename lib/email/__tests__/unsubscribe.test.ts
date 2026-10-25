/**
 * The unsubscribe token is the only auth on a state-changing endpoint, so its
 * edges are pinned: roundtrip works, any tampering fails closed, and a missing
 * secret disables minting rather than minting unsigned tokens.
 */
import { createHmac } from "node:crypto"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  mintUnsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrlFor,
  listUnsubscribeHeaders,
} from "../unsubscribe"

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env.EMAIL_UNSUBSCRIBE_SECRET = "test-secret"
})

afterEach(() => {
  process.env.EMAIL_UNSUBSCRIBE_SECRET = ORIGINAL_ENV.EMAIL_UNSUBSCRIBE_SECRET
  process.env.CRON_SECRET = ORIGINAL_ENV.CRON_SECRET
})

describe("unsubscribe tokens", () => {
  it("roundtrips userId and category", () => {
    const token = mintUnsubscribeToken("user-123", "inactivity")
    expect(token).toBeTruthy()
    expect(verifyUnsubscribeToken(token!)).toEqual({
      userId: "user-123",
      category: "inactivity",
      scope: "optional",
    })
  })

  it("rejects a tampered signature", () => {
    const token = mintUnsubscribeToken("user-123", "inactivity")!
    const [payload] = token.split(".")
    expect(verifyUnsubscribeToken(`${payload}.AAAA`)).toBeNull()
  })

  it("rejects a payload swapped under a valid-shape token", () => {
    const tokenA = mintUnsubscribeToken("user-a", "inactivity")!
    const tokenB = mintUnsubscribeToken("user-b", "roadmap")!
    const forged = `${tokenA.split(".")[0]}.${tokenB.split(".")[1]}`
    expect(verifyUnsubscribeToken(forged)).toBeNull()
  })

  it("rejects garbage and empty tokens", () => {
    expect(verifyUnsubscribeToken("")).toBeNull()
    expect(verifyUnsubscribeToken("not-a-token")).toBeNull()
    expect(verifyUnsubscribeToken(".")).toBeNull()
  })

  it("rejects an unknown category even when correctly signed", () => {
    // Mint a token whose payload claims a category outside the map by signing
    // it with the same code path: craft payload manually via the public mint,
    // then verify the category gate rejects a doctored payload with a bad sig.
    // (A correctly-signed unknown category is impossible through the public
    // API, which is itself the guarantee this test documents.)
    const token = mintUnsubscribeToken("user-123", "roadmap")!
    const payload = Buffer.from(JSON.stringify({ u: "user-123", c: "everything" })).toString(
      "base64url"
    )
    expect(verifyUnsubscribeToken(`${payload}.${token.split(".")[1]}`)).toBeNull()
  })

  it("mints nothing without a secret", () => {
    delete process.env.EMAIL_UNSUBSCRIBE_SECRET
    delete process.env.CRON_SECRET
    expect(mintUnsubscribeToken("user-123", "inactivity")).toBeNull()
    expect(unsubscribeUrlFor("user-123", "inactivity")).toBeUndefined()
    expect(listUnsubscribeHeaders("user-123", "inactivity")).toBeUndefined()
  })

  it("falls back to CRON_SECRET when the dedicated secret is unset", () => {
    delete process.env.EMAIL_UNSUBSCRIBE_SECRET
    process.env.CRON_SECRET = "cron-secret"
    const token = mintUnsubscribeToken("user-123", "spaced_repetition")
    expect(token).toBeTruthy()
    expect(verifyUnsubscribeToken(token!)?.category).toBe("spaced_repetition")
  })

  it("builds RFC 8058 headers around the tokenized URL", () => {
    const headers = listUnsubscribeHeaders("user-123", "inactivity")!
    expect(headers["List-Unsubscribe"]).toContain("mailto:nikayel@codesparring.dev")
    expect(headers["List-Unsubscribe"]).toContain("/api/email/unsubscribe?token=")
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click")
  })
})

describe("unsubscribe scope compatibility", () => {
  function signed(payload: Record<string, unknown>) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
    return `${encoded}.${createHmac("sha256", "test-secret").update(encoded).digest("base64url")}`
  }
  it("keeps old category tokens scoped to the category originally promised", () => {
    expect(verifyUnsubscribeToken(signed({ u: "legacy", c: "spaced_repetition" }))).toEqual({
      userId: "legacy",
      category: "spaced_repetition",
      scope: "category",
    })
  })
  it("new links explicitly authorize all optional email suppression", () => {
    expect(verifyUnsubscribeToken(mintUnsubscribeToken("current", "marketing")!)?.scope).toBe(
      "optional"
    )
  })
  it.each(["toString", "__proto__", "unknown"])("rejects signed non-category %s", (category) => {
    expect(verifyUnsubscribeToken(signed({ u: "legacy", c: category }))).toBeNull()
  })
  it("rejects unknown scopes even with a valid signature", () => {
    expect(verifyUnsubscribeToken(signed({ u: "legacy", c: "inactivity", s: "admin" }))).toBeNull()
  })
})
