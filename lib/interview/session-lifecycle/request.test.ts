import { describe, expect, it } from "vitest"
import { captureSessionRequest } from "./request"

describe("session request generations", () => {
  it("discards a late result even after the paused attempt has resumed", () => {
    const generationRef = { current: 1 }
    const isCurrent = captureSessionRequest({ generationRef, isActive: () => true })
    expect(isCurrent()).toBe(true)
    generationRef.current = 3
    expect(isCurrent()).toBe(false)
  })
  it("rejects work while paused", () => {
    expect(captureSessionRequest({ paused: true })()).toBe(false)
    expect(captureSessionRequest({ isActive: () => false })()).toBe(false)
  })
})
