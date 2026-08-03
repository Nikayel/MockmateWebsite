import { describe, it, expect } from "vitest"

/**
 * The freshness line exists because retrievability decays against wall-clock time:
 * a tab left open overnight shows yesterday's beliefs. The line is the only thing
 * telling the reader that, so its two failure modes both matter — claiming numbers
 * are fresher than they are, and rendering something nonsensical instead of
 * silently omitting itself.
 *
 * Mirrors KnowledgeSummary's freshnessLabel; it is a small local helper in a client
 * component, and the boundaries are what is worth pinning.
 */
function freshnessLabel(generatedAt: string, now: number): string | null {
  const ms = now - new Date(generatedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const minutes = Math.floor(ms / 60000)
  if (minutes < 2) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const T0 = new Date("2026-08-02T12:00:00.000Z").getTime()
const at = (msAgo: number) => freshnessLabel(new Date(T0 - msAgo).toISOString(), T0)

describe("freshnessLabel", () => {
  it("reports the units a reader expects at each scale", () => {
    expect(at(0)).toBe("just now")
    expect(at(90_000)).toBe("just now")
    expect(at(5 * 60_000)).toBe("5 min ago")
    expect(at(3 * 3_600_000)).toBe("3h ago")
    expect(at(2 * 86_400_000)).toBe("2d ago")
  })

  it("switches unit exactly at each boundary", () => {
    expect(at(2 * 60_000)).toBe("2 min ago")
    expect(at(59 * 60_000)).toBe("59 min ago")
    expect(at(60 * 60_000)).toBe("1h ago")
    expect(at(23 * 3_600_000)).toBe("23h ago")
    expect(at(24 * 3_600_000)).toBe("1d ago")
  })

  it("stays silent rather than claiming the future when the clock is skewed", () => {
    // A client clock behind the server's would otherwise render "-3 min ago", and a
    // page about honest estimates should not display a negative age.
    expect(freshnessLabel(new Date(T0 + 60_000).toISOString(), T0)).toBeNull()
  })

  it("stays silent on an unparseable timestamp", () => {
    expect(freshnessLabel("not-a-date", T0)).toBeNull()
  })

  it("never rounds a stale model up to 'just now'", () => {
    // The one direction that must not fail: understating age is the lie that
    // matters, because the reader acts on numbers they think are current.
    for (const msAgo of [2 * 60_000, 60 * 60_000, 86_400_000, 30 * 86_400_000]) {
      expect(at(msAgo)).not.toBe("just now")
    }
  })
})
