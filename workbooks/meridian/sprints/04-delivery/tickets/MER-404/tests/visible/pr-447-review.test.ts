import { describe, expect, it } from "vitest"
import { buildSignedBase } from "../../src/delivery/signature"
import { constantTimeEqual } from "../../src/delivery/signature"
import { createReplayCache } from "../../src/delivery/signature"
import { signWebhookDelivery } from "../../src/delivery/signature"
import { verifyAndRecordWebhookDelivery } from "../../src/delivery/signature"
import { verifyWebhookSignature } from "../../src/delivery/signature"

const SECRET = "shh-secret"
const PREVIOUS_SECRET = "old-secret"
const BODY = JSON.stringify({
  claimId: "clm_8842",
  status: "paid",
  amount: 412.19,
  currency: "USD",
})
const NOW_MS = 1_770_000_000_000
const TIMESTAMP = Math.floor(NOW_MS / 1000).toString()

describe("PR #447 - claimed fix", () => {
  it("a tampered body fails signature verification", async () => {
    const signature = await signWebhookDelivery(TIMESTAMP, BODY, SECRET)
    const result = await verifyWebhookSignature({
      body: BODY + "tampered",
      timestamp: TIMESTAMP,
      signature,
      secrets: [SECRET],
      nowMs: NOW_MS,
      windowSeconds: 300,
    })
    expect(result).toBe(false)
  })

  it("a valid, fresh signature verifies", async () => {
    const signature = await signWebhookDelivery(TIMESTAMP, BODY, SECRET)
    const result = await verifyWebhookSignature({
      body: BODY,
      timestamp: TIMESTAMP,
      signature,
      secrets: [SECRET],
      nowMs: NOW_MS,
      windowSeconds: 300,
    })
    expect(result).toBe(true)
  })
})

describe("PR #447 - the defect its own tests do not cover", () => {
  it("the timestamp is bound into the signature: a captured request replayed with a forged, newer timestamp fails, not just a stale one", async () => {
    const signature = await signWebhookDelivery(TIMESTAMP, BODY, SECRET)
    const forgedTimestamp = Math.floor((NOW_MS + 250_000) / 1000).toString()

    const result = await verifyWebhookSignature({
      body: BODY,
      timestamp: forgedTimestamp,
      signature, // the ORIGINAL signature, computed over the ORIGINAL timestamp
      secrets: [SECRET],
      nowMs: NOW_MS + 250_000,
      windowSeconds: 300,
    })

    expect(result).toBe(false)
  })

  it("a stale but correctly-signed request is rejected once it falls outside the freshness window", async () => {
    const signature = await signWebhookDelivery(TIMESTAMP, BODY, SECRET)
    const result = await verifyWebhookSignature({
      body: BODY,
      timestamp: TIMESTAMP,
      signature,
      secrets: [SECRET],
      nowMs: NOW_MS + 400_000,
      windowSeconds: 300,
    })
    expect(result).toBe(false)
  })

  it("the exact same valid, fresh delivery cannot be accepted twice", async () => {
    const signature = await signWebhookDelivery(TIMESTAMP, BODY, SECRET)
    const cache = createReplayCache(300_000)
    const request = {
      body: BODY,
      timestamp: TIMESTAMP,
      signature,
      secrets: [SECRET],
      windowSeconds: 300,
      cache,
    }

    const first = await verifyAndRecordWebhookDelivery({ ...request, nowMs: NOW_MS })
    const replay = await verifyAndRecordWebhookDelivery({ ...request, nowMs: NOW_MS + 1000 })

    expect(first).toBe(true)
    expect(replay).toBe(false)
  })

  it("verifies against either of two active keys through a rotation, and rejects a retired one", async () => {
    const signedWithPrevious = await signWebhookDelivery(TIMESTAMP, BODY, PREVIOUS_SECRET)

    const duringRotation = await verifyWebhookSignature({
      body: BODY,
      timestamp: TIMESTAMP,
      signature: signedWithPrevious,
      secrets: [SECRET, PREVIOUS_SECRET],
      nowMs: NOW_MS,
      windowSeconds: 300,
    })
    const afterRetirement = await verifyWebhookSignature({
      body: BODY,
      timestamp: TIMESTAMP,
      signature: signedWithPrevious,
      secrets: [SECRET],
      nowMs: NOW_MS,
      windowSeconds: 300,
    })

    expect(duringRotation).toBe(true)
    expect(afterRetirement).toBe(false)
  })

  it("compares in constant time and never throws on a malformed, wrong-length signature", () => {
    expect(() => constantTimeEqual("abc", "abcdef")).not.toThrow()
    expect(constantTimeEqual("abc", "abcdef")).toBe(false)
    expect(constantTimeEqual("same-length", "same-lengt2")).toBe(false)
    expect(constantTimeEqual("identical", "identical")).toBe(true)
  })

  it("signs the timestamp INSIDE the base string, not appended unsigned alongside it", () => {
    expect(buildSignedBase("123", "the-body")).toBe("123.the-body")
  })
})
