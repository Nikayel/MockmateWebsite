/**
 * No route may declare a `keywords` meta tag.
 *
 * The root layout used to set a 37-term global array, so every page rendered the same block. On
 * the stock exchange lesson it read, in part: "LeetCode alternative", "cheap mock interviews",
 * "interview anxiety practice", "24/7 mock interviews". None of that describes a page about
 * order-matching engines.
 *
 * Google has ignored `meta name="keywords"` since 2009, so this was never costing rankings. It was
 * costing two other things: roughly 700 bytes of identical payload on every page, and a
 * stuffed-keyword quality signal to the crawlers that DO still read it, which includes the AI
 * crawlers this site deliberately welcomes (`app/robots.ts`, `public/llms.txt`).
 *
 * Ten more per-page blocks existed beyond the global one, and they went too. They were at least
 * topically relevant, which is the argument for keeping them and also the reason to be suspicious:
 * a tag with no consumer is not improved by being accurate. Enforcing it as a test rather than a
 * note is CLAUDE.md's rule, and it is what stops the next author from adding one back "just for
 * this page".
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const APP_DIR = join(process.cwd(), "app")

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, found)
    } else if (/\.(ts|tsx)$/.test(entry)) {
      found.push(full)
    }
  }
  return found
}

const ROUTE_FILES = walk(APP_DIR)

describe("no route ships a keywords meta tag", () => {
  it("walks a real app directory, so the assertion cannot pass vacuously", () => {
    expect(ROUTE_FILES.length).toBeGreaterThan(50)
  })

  it("declares `keywords` nowhere in a Metadata object", () => {
    // Matched as a property in a metadata literal rather than as the bare word, so prose
    // discussing keywords (including this file's own reasoning, quoted in a comment) does not
    // trip it.
    const offenders: string[] = []
    for (const file of ROUTE_FILES) {
      const source = readFileSync(file, "utf8")
      for (const line of source.split("\n")) {
        // Skip comment lines: the root layout carries a deliberate note explaining the absence.
        const trimmed = line.trim()
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue
        if (/^\s*keywords\s*:/.test(line)) {
          offenders.push(`${file.replace(process.cwd(), "")}: ${trimmed}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
