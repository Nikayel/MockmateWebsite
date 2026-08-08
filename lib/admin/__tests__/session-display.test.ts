import { describe, it, expect } from "vitest"
import {
  relativeTime,
  absoluteTime,
  formatDuration,
  formatScore,
  sessionTypeLabel,
  SESSION_STATUS_DISPLAY,
  SESSION_STATUS_OPTIONS,
} from "../session-display"
import { SESSION_LIST_STATUSES } from "../session-query"

const NOW = new Date("2026-08-08T12:00:00.000Z")
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

describe("relativeTime", () => {
  it("reads the recent past at the resolution that matters", () => {
    expect(relativeTime(ago(5_000), NOW)).toBe("Just now")
    expect(relativeTime(ago(4 * 60_000), NOW)).toBe("4m ago")
    expect(relativeTime(ago(3 * 3_600_000), NOW)).toBe("3h ago")
    expect(relativeTime(ago(5 * 86_400_000), NOW)).toBe("5d ago")
    expect(relativeTime(ago(90 * 86_400_000), NOW)).toBe("3mo ago")
    expect(relativeTime(ago(400 * 86_400_000), NOW)).toBe("1y ago")
  })

  it("says so when there is no timestamp, rather than showing an epoch", () => {
    expect(relativeTime(null, NOW)).toBe("Never")
    expect(relativeTime("not a date", NOW)).toBe("Unknown")
  })

  it("tolerates a small clock skew instead of claiming the future", () => {
    expect(relativeTime(new Date(NOW.getTime() + 5_000).toISOString(), NOW)).toBe("Just now")
    expect(relativeTime(new Date(NOW.getTime() + 3_600_000).toISOString(), NOW)).toBe(
      "In the future"
    )
  })
})

describe("absoluteTime", () => {
  it("marks a missing instant as missing", () => {
    expect(absoluteTime(null)).toBe("Not recorded")
    expect(absoluteTime("nonsense")).toBe("Unknown")
  })

  it("renders a real instant", () => {
    expect(absoluteTime("2026-08-08T12:00:00.000Z")).toMatch(/2026/)
  })
})

describe("formatDuration", () => {
  it("distinguishes an open round from a zero-length one", () => {
    expect(formatDuration(null)).toBe("Still open")
    expect(formatDuration(0)).toBe("Under a minute")
  })

  it("reads minutes and hours", () => {
    expect(formatDuration(42)).toBe("42 min")
    expect(formatDuration(60)).toBe("1h")
    expect(formatDuration(95)).toBe("1h 35m")
  })
})

describe("formatScore", () => {
  it("keeps a zero score visible instead of blanking it", () => {
    // A round that scored 0 is a finding, not a missing value.
    expect(formatScore(0)).toBe("0%")
    expect(formatScore(null)).toBe("Not scored")
  })

  it("rounds to a whole percentage", () => {
    expect(formatScore(78.4)).toBe("78%")
  })
})

describe("labels", () => {
  it("has a display entry for every status the filter can produce", () => {
    for (const status of SESSION_LIST_STATUSES) {
      expect(SESSION_STATUS_DISPLAY[status]).toBeDefined()
      expect(SESSION_STATUS_DISPLAY[status].label.length).toBeGreaterThan(0)
    }
  })

  it("offers every status as a filter choice", () => {
    expect(SESSION_STATUS_OPTIONS.map((option) => option.value).sort()).toEqual(
      [...SESSION_LIST_STATUSES].sort()
    )
  })

  it("uses no em dashes in copy the admin reads", () => {
    for (const status of SESSION_LIST_STATUSES) {
      expect(SESSION_STATUS_DISPLAY[status].label).not.toContain("—")
    }
  })

  it("titles a scenario kind the option list has never seen", () => {
    expect(sessionTypeLabel("dsa")).toBe("DSA")
    expect(sessionTypeLabel("guided-lab")).toBe("Guided Lab")
    expect(sessionTypeLabel("some_new_type")).toBe("Some New Type")
  })
})
