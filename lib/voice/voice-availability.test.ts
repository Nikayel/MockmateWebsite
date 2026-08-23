/**
 * The strings matched here are thrown by deepgram-service.ts. Tests assert the
 * exact wording on purpose: if one of those throws is reworded, the classifier
 * silently degrades every one of its cases to "unknown" and the candidate gets
 * generic copy instead of the one instruction that would fix their problem.
 * Failing here is how that gets noticed.
 */

import { describe, expect, it } from "vitest"
import {
  classifyVoiceError,
  voiceUnavailableCopy,
  type VoiceUnavailableReason,
} from "./voice-availability"

/** A DOMException-shaped rejection, as getUserMedia produces. */
function domError(name: string): Error {
  const error = new Error(`${name} raised`)
  error.name = name
  return error
}

describe("classifyVoiceError", () => {
  it("reads permission refusals off the DOMException name", () => {
    expect(classifyVoiceError(domError("NotAllowedError"))).toBe("mic-denied")
    expect(classifyVoiceError(domError("PermissionDeniedError"))).toBe("mic-denied")
    expect(classifyVoiceError(domError("SecurityError"))).toBe("mic-denied")
  })

  it("separates no-device from denied, because the fix differs", () => {
    expect(classifyVoiceError(domError("NotFoundError"))).toBe("mic-missing")
    expect(classifyVoiceError(domError("DevicesNotFoundError"))).toBe("mic-missing")
  })

  it("treats a device that will not start as disconnected", () => {
    expect(classifyVoiceError(domError("NotReadableError"))).toBe("mic-disconnected")
  })

  it("prefers the DOMException name over the message", () => {
    // A permission error whose message happens to mention a connection must
    // still classify as denied: name is the reliable half of the contract.
    const error = domError("NotAllowedError")
    error.message = "connection blocked by policy"

    expect(classifyVoiceError(error)).toBe("mic-denied")
  })

  describe("errors thrown by deepgram-service", () => {
    it("classifies a guest with no auth token", () => {
      expect(
        classifyVoiceError(new Error("Auth token required to fetch a Deepgram access token"))
      ).toBe("not-signed-in")
    })

    it("classifies the 503 refusal", () => {
      expect(
        classifyVoiceError(
          new Error(
            "Voice transcription is temporarily unavailable. You can keep typing your answers."
          )
        )
      ).toBe("service-unavailable")
    })

    it("classifies a rejected token grant", () => {
      expect(classifyVoiceError(new Error("Failed to fetch voice token"))).toBe("credentials")
      expect(classifyVoiceError(new Error("Deepgram credentials not available"))).toBe(
        "credentials"
      )
    })

    it("classifies the mid-session track-ended error", () => {
      expect(
        classifyVoiceError(new Error("Microphone disconnected. Please reconnect and try again."))
      ).toBe("mic-disconnected")
    })
  })

  it("falls back to unknown rather than guessing", () => {
    expect(classifyVoiceError(new Error("something else entirely"))).toBe("unknown")
    expect(classifyVoiceError(null)).toBe("unknown")
    expect(classifyVoiceError(undefined)).toBe("unknown")
    expect(classifyVoiceError("a bare string")).toBe("unknown")
  })
})

describe("voiceUnavailableCopy", () => {
  const ALL: VoiceUnavailableReason[] = [
    "not-signed-in",
    "service-unavailable",
    "credentials",
    "mic-denied",
    "mic-missing",
    "mic-disconnected",
    "connection",
    "unknown",
  ]

  it("covers every reason with non-empty copy", () => {
    for (const reason of ALL) {
      const copy = voiceUnavailableCopy(reason)
      expect(copy.title.length).toBeGreaterThan(0)
      expect(copy.detail.length).toBeGreaterThan(0)
    }
  })

  it("always tells the candidate the interview still works", () => {
    // Voice is a convenience, never the only way in. Copy that reads as a dead
    // end turns a recoverable moment into an abandoned session.
    for (const reason of ALL) {
      const { detail } = voiceUnavailableCopy(reason)
      expect(detail.toLowerCase()).toMatch(/typ|try again|reconnect/)
    }
  })

  it("marks the one reason that retrying cannot fix", () => {
    expect(voiceUnavailableCopy("not-signed-in").canRetry).toBe(false)
    for (const reason of ALL.filter((r) => r !== "not-signed-in")) {
      expect(voiceUnavailableCopy(reason).canRetry).toBe(true)
    }
  })

  it("uses no em dashes, per the house copy rule", () => {
    for (const reason of ALL) {
      const { title, detail } = voiceUnavailableCopy(reason)
      expect(`${title} ${detail}`).not.toContain("—")
    }
  })
})
