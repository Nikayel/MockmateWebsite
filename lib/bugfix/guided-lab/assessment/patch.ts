import type { z } from "zod"
import type { patchSchema } from "./schema"

/** A bounded changed region with two context lines; explicitly marks omitted code. */
export function describePatch(
  path: string,
  before: string,
  after: string
): z.infer<typeof patchSchema> | null {
  if (before === after) return null
  const oldLines = before.split("\n"),
    newLines = after.split("\n")
  let start = 0,
    tail = 0
  while (start < Math.min(oldLines.length, newLines.length) && oldLines[start] === newLines[start])
    start++
  while (
    tail < Math.min(oldLines.length, newLines.length) - start &&
    oldLines[oldLines.length - 1 - tail] === newLines[newLines.length - 1 - tail]
  )
    tail++
  const from = Math.max(0, start - 2)
  const oldRegion = oldLines.slice(from, oldLines.length - Math.max(0, tail - 2)).join("\n")
  const newRegion = newLines.slice(from, newLines.length - Math.max(0, tail - 2)).join("\n")
  return {
    path,
    startLine: from + 1,
    before: oldRegion.slice(0, 3000),
    after: newRegion.slice(0, 3000),
    truncated: oldRegion.length > 3000 || newRegion.length > 3000,
  }
}
