import { describe, it, expect } from "vitest"
import {
  MEMORY_STRENGTH_BANDS,
  memoryBandFor,
  getMemoryStrength,
} from "@/lib/spaced-repetition/algorithm-router"
import { displayRetention } from "@/lib/spaced-repetition/memory-bands"
import { memoryColorClass } from "@/lib/ui/memory-colors"

/**
 * /knowledge renders the same retention twice — as a concept bar and as a card chip.
 * Those two used independent cut points (80/60/40 vs 90/70/50), so a concept at 85%
 * drew a green bar above amber "Good" cards: the instrument built to be honest about
 * its own beliefs was contradicting itself on screen.
 *
 * These pin the shared banding rather than either call site, because the failure mode
 * is not a wrong colour, it is two surfaces disagreeing.
 */
describe("memory strength bands", () => {
  it("bands each cut point at its floor, not above it", () => {
    expect(memoryBandFor(90).urgency).toBe("safe")
    expect(memoryBandFor(89.9).urgency).toBe("ok")
    expect(memoryBandFor(70).urgency).toBe("ok")
    expect(memoryBandFor(69.9).urgency).toBe("warning")
    expect(memoryBandFor(50).urgency).toBe("warning")
    expect(memoryBandFor(49.9).urgency).toBe("urgent")
    expect(memoryBandFor(0).urgency).toBe("urgent")
  })

  it("clamps values outside 0-100 to an end band", () => {
    expect(memoryBandFor(140).urgency).toBe("safe")
    expect(memoryBandFor(-5).urgency).toBe("urgent")
  })

  it("keeps the labels getMemoryStrength has always returned", () => {
    expect(memoryBandFor(95).label).toBe("Strong")
    expect(memoryBandFor(75).label).toBe("Good")
    expect(memoryBandFor(55).label).toBe("Weakening")
    expect(memoryBandFor(20).label).toBe("Fading")
  })

  it("is declared highest floor first, which memoryBandFor's find() depends on", () => {
    const floors = MEMORY_STRENGTH_BANDS.map((b) => b.floor)
    expect(floors).toEqual([...floors].sort((a, b) => b - a))
  })

  it("agrees with getMemoryStrength, the scheduler-facing entry point", () => {
    // Same retention in, same band out — whichever door the caller came through.
    const strength = getMemoryStrength("fsrs", { fsrs_card: undefined }, 0)
    expect(strength).toMatchObject(memoryBandFor(strength.score))
  })
})

describe("displayRetention", () => {
  it("rounds to the nearest 5 when that stays inside the band", () => {
    expect(displayRetention(72)).toBe(70) // 70 is still "ok", same as 72
    expect(displayRetention(93)).toBe(95)
    expect(displayRetention(50)).toBe(50)
  })

  it("never lets the shown number contradict the band word", () => {
    // 68 is "Weakening"; nearest-5 gives 70, which is the Good floor. The display
    // must round toward its own band, or the number and the label tell two stories.
    expect(displayRetention(68)).toBe(65)
    expect(memoryBandFor(displayRetention(68)).urgency).toBe(memoryBandFor(68).urgency)
    // 88 is "Good"; nearest-5 gives 90, the Strong floor.
    expect(displayRetention(88)).toBe(85)
    // 48 is "Fading"; nearest-5 gives 50, the Weakening floor.
    expect(displayRetention(48)).toBe(45)
  })

  it("agrees with the band for every integer value", () => {
    for (let v = 0; v <= 100; v++) {
      expect(memoryBandFor(displayRetention(v)).urgency).toBe(memoryBandFor(v).urgency)
    }
  })
})

describe("memoryColorClass", () => {
  it("gives every band a distinct colour in both variants", () => {
    for (const variant of ["chip", "bar"] as const) {
      const classes = MEMORY_STRENGTH_BANDS.map((b) => memoryColorClass(b.urgency, variant))
      expect(new Set(classes).size).toBe(MEMORY_STRENGTH_BANDS.length)
    }
  })

  it("colours the bar and the chip from the same band for one value", () => {
    // The actual regression: a concept mean of 85 must not read "safe" on the bar
    // while its cards read "ok" on the chip.
    const urgency = memoryBandFor(85).urgency
    expect(urgency).toBe("ok")
    expect(memoryColorClass(urgency, "bar")).toContain("amber")
    expect(memoryColorClass(urgency, "chip")).toContain("amber")
  })

  it("falls back to neutral for a card the model has no belief about", () => {
    // Not green. An unknown must never be coloured as a good outcome.
    expect(memoryColorClass(null, "chip")).toContain("muted")
    expect(memoryColorClass(undefined, "bar")).toContain("muted")
    expect(memoryColorClass("nonsense", "chip")).toContain("muted")
  })

  it("suppresses the verdict hue on thin evidence, without ever muting trouble entirely", () => {
    // VSUP-lite: positive verdicts mute to neutral (a confident green off one review
    // is an overclaim), but warning/urgent stay visibly warm — under-alerting on
    // thin evidence would be its own kind of overclaim.
    expect(memoryColorClass("safe", "ink", { suppressed: true })).toContain("muted")
    expect(memoryColorClass("ok", "ink", { suppressed: true })).toContain("muted")
    expect(memoryColorClass("warning", "ink", { suppressed: true })).toContain("orange")
    expect(memoryColorClass("urgent", "ink", { suppressed: true })).toContain("orange")
  })

  it("suppression only touches ink — bars and chips keep the full ramp", () => {
    expect(memoryColorClass("urgent", "bar", { suppressed: true })).toContain("rose")
    expect(memoryColorClass("urgent", "chip", { suppressed: true })).toContain("rose")
    expect(memoryColorClass("safe", "ink", { suppressed: false })).toContain("emerald")
  })

  it("keeps light-mode text on the -700 shades for AA contrast", () => {
    // The -400 shades render around 1.8:1 on a light background.
    for (const band of MEMORY_STRENGTH_BANDS) {
      const chip = memoryColorClass(band.urgency, "chip")
      expect(chip).toMatch(/ text-[a-z]+-700/)
    }
  })
})
