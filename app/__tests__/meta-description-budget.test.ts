/**
 * Meta descriptions have a hard budget, and overrunning it fails silently.
 *
 * Google truncates a description around 155-160 characters, and when the truncation reads badly it
 * discards the tag entirely and writes its own snippet from page text. Either outcome throws away
 * the one piece of SERP copy the author controls. Nothing in the build warns about it: the page
 * ships, renders, and quietly loses its snippet.
 *
 * Six public pages were over the line (167-180 characters). Each now runs its literal through
 * `truncateForDescription`, so a future edit degrades to a clean word-boundary cut instead of a
 * Google rewrite. This file pins the outcome from the other side: the literals are short enough
 * that the truncation never fires, which is what "hand-written" means here. An assertion on the
 * ellipsis is what distinguishes a deliberately short sentence from a machine-clipped long one.
 *
 * `next/server` is stubbed in `vitest.setup.ts`; the layouts imported below take `Metadata` as a
 * type-only import, which is erased, so nothing Next-runtime-specific loads.
 */
import type { Metadata } from "next"
import { describe, expect, it } from "vitest"

import { metadata as careersMetadata } from "../careers/layout"
import { metadata as docsMetadata } from "../docs/layout"
import { metadata as learnMetadata } from "../learn/page"
import { metadata as pricingMetadata } from "../pricing/layout"
import { metadata as samplesMetadata } from "../samples/layout"
import { metadata as whyMetadata } from "../why-codesparring/layout"

/**
 * The ceiling Google truncates at. `truncateForDescription` targets 155, so 160 leaves the copy a
 * little headroom while still failing on the 167-180 character descriptions this pins.
 */
const DESCRIPTION_LIMIT = 160

const PAGES: Array<{ path: string; metadata: Metadata }> = [
  { path: "/samples", metadata: samplesMetadata },
  { path: "/pricing", metadata: pricingMetadata },
  { path: "/careers", metadata: careersMetadata },
  { path: "/learn", metadata: learnMetadata },
  { path: "/why-codesparring", metadata: whyMetadata },
  { path: "/docs", metadata: docsMetadata },
]

describe("meta description budget", () => {
  it.each(PAGES)("$path fits inside Google's snippet budget", ({ metadata }) => {
    expect(typeof metadata.description).toBe("string")
    expect(metadata.description!.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT)
  })

  it.each(PAGES)("$path is hand-trimmed, not machine-clipped", ({ metadata }) => {
    // An ellipsis means the literal overran and `truncateForDescription` cut it. That still ships a
    // valid tag, but the author should rewrite the sentence rather than leave a dangling "…".
    expect(metadata.description).not.toMatch(/…$/)
  })
})
