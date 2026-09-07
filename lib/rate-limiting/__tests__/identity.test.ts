import type { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const verifyIdToken = vi.hoisted(() => vi.fn())

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: { verifyIdToken },
}))

import { resolveVerifiedIdentifier } from "../identity"

function request(headers: Record<string, string>): NextRequest {
  return {
    headers: new Headers(headers),
  } as unknown as NextRequest
}

describe("resolveVerifiedIdentifier", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses the verified Firebase uid instead of a client-selected identity", async () => {
    verifyIdToken.mockResolvedValue({ uid: "verified-user" })

    await expect(
      resolveVerifiedIdentifier(
        request({ authorization: "Bearer valid-token", "x-real-ip": "198.51.100.1" })
      )
    ).resolves.toBe("user:verified-user")
  })

  it("uses the IP bucket for an anonymous request", async () => {
    await expect(resolveVerifiedIdentifier(request({ "x-real-ip": "198.51.100.2" }))).resolves.toBe(
      "ip:198.51.100.2"
    )
    expect(verifyIdToken).not.toHaveBeenCalled()
  })

  it("does not mint a user bucket from an invalid token", async () => {
    verifyIdToken.mockRejectedValue(new Error("invalid token"))

    await expect(
      resolveVerifiedIdentifier(
        request({ authorization: "Bearer forged-token", "x-real-ip": "198.51.100.3" })
      )
    ).resolves.toBe("ip:198.51.100.3")
  })
})
