/**
 * The blog's `updated` front-matter field, and the rules that keep it honest.
 *
 * ## Why this field is guarded at all
 *
 * `app/sitemap.ts` publishes `lastModified` for exactly one section of this site, the blog, and its
 * header argues the case: the front-matter date is authored, so it is trustworthy, and everywhere
 * else an absent lastmod beats a wrong one. `updated` extends that promise to revisions, which means
 * it inherits the same obligation. A date that is malformed, that predates publication, or that sits
 * in the future is not a smaller version of the truth. It is the wrong-lastmod case the sitemap
 * refuses to emit anywhere else, arriving through the one door that section left open.
 *
 * The rules:
 *
 *  1. `YYYY-MM-DD`, and a real calendar date. "2026-02-31" parses in JavaScript and silently becomes
 *     March 3rd, so the format check alone is not enough and the round-trip below is what catches it.
 *  2. Never before `date`. A post cannot be revised before it existed.
 *  3. Never in the future. A lastmod dated tomorrow is a claim no crawler can verify and the exact
 *     signal that gets the field discounted.
 *
 * What this deliberately does NOT check is whether the revision was substantive: no test can read a
 * diff and judge that. `lib/blog-types.ts` states the rule for authors, and it is the reason the
 * field is opt-in rather than stamped by the build.
 */
import { describe, expect, it } from "vitest"

import { getAllBlogPosts } from "../mdx"

const POSTS = getAllBlogPosts()

/** Strict `YYYY-MM-DD`. Anything else is a front-matter typo, not a date. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * True when the string is a real calendar day, not merely a parseable one.
 *
 * `new Date("2026-02-31")` does not throw; it rolls forward to March 3rd. Comparing the parsed
 * date's own ISO day back against the input is what rejects that.
 */
function isRealCalendarDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === value
}

/** Front-matter `date` is sometimes a full ISO timestamp, so compare on the day part only. */
function dayPart(value: string): string {
  return value.slice(0, 10)
}

describe("blog post `updated` dates", () => {
  it("walks a real, non-empty corpus", () => {
    expect(POSTS.length).toBeGreaterThan(10)
  })

  it("is a real YYYY-MM-DD calendar day wherever it is set", () => {
    const offenders = POSTS.filter((post) => post.updated && !isRealCalendarDay(post.updated)).map(
      (post) => `${post.slug}: "${post.updated}"`
    )
    expect(offenders).toEqual([])
  })

  it("never predates the post's own publication date", () => {
    const offenders = POSTS.filter(
      (post) => post.updated && dayPart(post.updated) < dayPart(post.date)
    ).map((post) => `${post.slug}: updated ${post.updated} but published ${post.date}`)
    expect(offenders).toEqual([])
  })

  it("is never in the future", () => {
    const today = new Date().toISOString().slice(0, 10)
    const offenders = POSTS.filter((post) => post.updated && dayPart(post.updated) > today).map(
      (post) => `${post.slug}: updated ${post.updated}, today is ${today}`
    )
    expect(offenders).toEqual([])
  })

  it("leaves posts that were never revised without the field", () => {
    // Not a rule so much as a description of the default: the field is opt-in, so on a corpus where
    // most posts have never been revised most posts should have no value. If this ever fails it
    // means someone started stamping it by default, which is where lastmod stops meaning anything.
    const withUpdated = POSTS.filter((post) => post.updated)
    expect(withUpdated.length).toBeLessThan(POSTS.length)
  })
})

describe("the calendar-day rule rejects what it is meant to reject", () => {
  it("accepts an ordinary date", () => {
    expect(isRealCalendarDay("2026-08-18")).toBe(true)
  })

  it("accepts a real leap day and rejects a fake one", () => {
    expect(isRealCalendarDay("2024-02-29")).toBe(true)
    expect(isRealCalendarDay("2026-02-29")).toBe(false)
  })

  it("rejects a day that rolls forward instead of failing", () => {
    // The case a bare `new Date()` check would pass.
    expect(isRealCalendarDay("2026-02-31")).toBe(false)
    expect(isRealCalendarDay("2026-13-01")).toBe(false)
  })

  it("rejects formats that are not YYYY-MM-DD", () => {
    expect(isRealCalendarDay("2026-8-18")).toBe(false)
    expect(isRealCalendarDay("08/18/2026")).toBe(false)
    expect(isRealCalendarDay("2026-08-18T00:00:00Z")).toBe(false)
    expect(isRealCalendarDay("")).toBe(false)
  })
})
