import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { attemptChunkErrorRecovery, isChunkLoadError } from "../chunk-reload"

// The three shapes that actually reached Sentry on 2026-08-17, plus webpack's classic.
const REAL_CHUNK_MESSAGES = [
  "Uncaught ChunkLoadError: Failed to load chunk /_next/static/chunks/473fb89765f7641d.js from module 360032",
  "Failed to load chunk /_next/static/chunks/473fb89765f7641d.js from module 360032",
  "ChunkLoadError: Loading chunk 4736 failed.",
  "Loading chunk 4736 failed. (timeout: https://www.codesparring.dev/_next/static/chunks/4736.js)",
]

function stubBrowser(storedBeat: string | null) {
  const reload = vi.fn()
  const setItem = vi.fn()
  vi.stubGlobal("window", {
    location: { reload },
    sessionStorage: { getItem: vi.fn(() => storedBeat), setItem },
  })
  return { reload, setItem }
}

describe("isChunkLoadError", () => {
  it("recognizes every chunk-error shape seen in production", () => {
    for (const message of REAL_CHUNK_MESSAGES) {
      expect(isChunkLoadError(message)).toBe(true)
    }
  })

  it("rejects ordinary errors and empty input", () => {
    expect(isChunkLoadError("Cannot read properties of undefined (reading 'map')")).toBe(false)
    expect(isChunkLoadError("Upstash set error")).toBe(false)
    expect(isChunkLoadError("")).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })
})

describe("attemptChunkErrorRecovery", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("reloads once on the first chunk failure and writes the latch", () => {
    const { reload, setItem } = stubBrowser(null)

    const recovered = attemptChunkErrorRecovery(REAL_CHUNK_MESSAGES[0])

    expect(recovered).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledWith("cs-chunk-reload-at", String(Date.now()))
  })

  it("does NOT reload again inside the latch window — no reload loops", () => {
    const { reload } = stubBrowser(String(Date.now() - 30_000))

    const recovered = attemptChunkErrorRecovery(REAL_CHUNK_MESSAGES[0])

    expect(recovered).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it("reloads again once the latch window has expired", () => {
    const { reload } = stubBrowser(String(Date.now() - 3 * 60 * 1000))

    expect(attemptChunkErrorRecovery(REAL_CHUNK_MESSAGES[1])).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("never reloads for a non-chunk error", () => {
    const { reload } = stubBrowser(null)

    expect(attemptChunkErrorRecovery("TypeError: x is not a function")).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it("falls back to reporting (no reload) when sessionStorage is unavailable", () => {
    // Private mode: without the latch a broken build could reload-loop, so don't.
    const reload = vi.fn()
    vi.stubGlobal("window", {
      location: { reload },
      sessionStorage: {
        getItem: vi.fn(() => {
          throw new Error("storage disabled")
        }),
        setItem: vi.fn(),
      },
    })

    expect(attemptChunkErrorRecovery(REAL_CHUNK_MESSAGES[0])).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it("is inert without a window (SSR safety)", () => {
    expect(attemptChunkErrorRecovery(REAL_CHUNK_MESSAGES[0])).toBe(false)
  })
})
