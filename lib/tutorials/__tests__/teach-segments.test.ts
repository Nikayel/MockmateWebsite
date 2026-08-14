/**
 * The segmentation engine paces content; it must never CHANGE content. The core
 * invariant: joining the segments with newlines reproduces the input exactly. The
 * rest pins the split rules (threshold, fence awareness, 2-4 segment envelope, no
 * stub tails) and runs the engine over every real SD lesson as a regression net.
 */
import { describe, it, expect } from "vitest"
import { SYSTEM_DESIGN_LEVELS } from "@/lib/tutorials/system-design/curriculum"
import { segmentTeachMarkdown } from "../teach-segments"

const para = (words: number, tag: string) => Array.from({ length: words }, () => tag).join(" ")

function teachWith(sections: Array<{ heading: string; words: number }>): string {
  return sections
    .map((s) => `## ${s.heading}\n\n${para(s.words, s.heading.toLowerCase())}`)
    .join("\n\n")
}

describe("segmentTeachMarkdown", () => {
  it("returns short teaches whole", () => {
    const md = teachWith([
      { heading: "One", words: 150 },
      { heading: "Two", words: 150 },
    ])
    expect(segmentTeachMarkdown(md)).toEqual([md])
  })

  it("splits a long teach into 2-4 segments on heading boundaries", () => {
    const md = teachWith([
      { heading: "Alpha", words: 300 },
      { heading: "Beta", words: 300 },
      { heading: "Gamma", words: 300 },
      { heading: "Delta", words: 300 },
    ])
    const segments = segmentTeachMarkdown(md)
    expect(segments.length).toBeGreaterThanOrEqual(2)
    expect(segments.length).toBeLessThanOrEqual(4)
    for (const s of segments) expect(s).toMatch(/^## /)
  })

  it("joining the segments reproduces the input exactly", () => {
    const md = teachWith([
      { heading: "Alpha", words: 400 },
      { heading: "Beta", words: 350 },
      { heading: "Gamma", words: 420 },
    ])
    expect(segmentTeachMarkdown(md).join("\n")).toBe(md)
  })

  it("never splits inside a code fence even when a heading-like line appears there", () => {
    const fence = "```\n## not a heading, ascii art\nboxes and arrows\n```"
    const md = [
      `## Real heading\n\n${para(300, "alpha")}\n\n${fence}`,
      `## Second heading\n\n${para(300, "beta")}`,
      `## Third heading\n\n${para(300, "gamma")}`,
    ].join("\n\n")
    const segments = segmentTeachMarkdown(md)
    expect(segments.join("\n")).toBe(md)
    // The fence's fake heading never starts a segment.
    for (const s of segments) expect(s.startsWith("## not a heading")).toBe(false)
    // The fence stays inside the segment that owns its paragraph, intact.
    const withFence = segments.filter((s) => s.includes("```"))
    expect(withFence).toHaveLength(1)
    expect(withFence[0]).toContain("## not a heading, ascii art")
  })

  it("keeps a whole teach with no headings unsegmented regardless of length", () => {
    const md = para(900, "word")
    expect(segmentTeachMarkdown(md)).toEqual([md])
  })

  it("merges a stub tail into its predecessor instead of orphaning the recap", () => {
    const md = teachWith([
      { heading: "Alpha", words: 400 },
      { heading: "Beta", words: 400 },
      { heading: "Recap", words: 40 },
    ])
    const segments = segmentTeachMarkdown(md)
    expect(segments[segments.length - 1]).toContain("## Recap")
    expect(segments[segments.length - 1]).not.toMatch(/^## Recap/)
  })

  it("segments every real SD lesson losslessly within the 1-4 envelope", () => {
    let segmented = 0
    for (const level of SYSTEM_DESIGN_LEVELS) {
      for (const mod of level.modules) {
        for (const lesson of mod.lessons) {
          const md = lesson.teach.markdown
          const segments = segmentTeachMarkdown(md)
          expect(segments.length).toBeGreaterThanOrEqual(1)
          expect(segments.length).toBeLessThanOrEqual(4)
          expect(segments.join("\n")).toBe(md)
          if (segments.length > 1) segmented++
        }
      }
    }
    // The whole point of the feature: the long teaches actually get paced.
    expect(segmented).toBeGreaterThan(100)
  })

  it("paces on prose, so a diagram-heavy lesson is not silently unsegmented", () => {
    // The regression this pins actually shipped. Weighing raw markdown counted a csdiagram spec's
    // JSON as words, so when the diagram sweep converted the ASCII drawings the mass moved into
    // whichever chunk held the spec: sd-l0-functional-requirements chunked as 99 / 87 / 843 words
    // with the last being almost all JSON, the proportional packer could find no split that
    // carried its share, and the lesson quietly stopped being paced. 126 lessons went at once and
    // the page looked completely normal, because an unsegmented teach is just a longer page.
    const proseHeavy = teachWith([
      { heading: "Alpha", words: 300 },
      { heading: "Beta", words: 300 },
    ])
    // Same prose, plus a fat fence. Pacing must not change: a fence is ONE thing the learner
    // meets, whatever its JSON weighs.
    const fenceHeavy =
      proseHeavy +
      "\n\n```csdiagram\n" +
      JSON.stringify(
        {
          type: "table",
          columns: ["a"],
          rows: Array.from({ length: 40 }, (_, i) => [`row ${i} of padding`]),
        },
        null,
        2
      ) +
      "\n```\n"

    expect(segmentTeachMarkdown(fenceHeavy).length).toBe(segmentTeachMarkdown(proseHeavy).length)
    // And it still reassembles exactly, fence included.
    expect(segmentTeachMarkdown(fenceHeavy).join("\n")).toBe(fenceHeavy)
  })

  it("keeps the real corpus overwhelmingly paced, not merely above the floor", () => {
    // The floor above is >100 of 208, which the broken version cleared at 82 only by luck of
    // where the specs landed. This asserts the shape the feature is supposed to have.
    let segmented = 0
    let total = 0
    for (const level of SYSTEM_DESIGN_LEVELS) {
      for (const mod of level.modules) {
        for (const lesson of mod.lessons) {
          total += 1
          if (segmentTeachMarkdown(lesson.teach.markdown).length > 1) segmented += 1
        }
      }
    }
    expect(segmented / total).toBeGreaterThan(0.7)
  })

  it("segments the exit-criteria lesson sd-l2-keys-ids-constraints into multiple parts", () => {
    const lesson = SYSTEM_DESIGN_LEVELS.flatMap((l) => l.modules)
      .flatMap((m) => m.lessons)
      .find((l) => l.id === "sd-l2-keys-ids-constraints")
    expect(lesson).toBeDefined()
    const segments = segmentTeachMarkdown(lesson!.teach.markdown)
    expect(segments.length).toBeGreaterThanOrEqual(2)
  })
})
