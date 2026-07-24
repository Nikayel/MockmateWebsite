/**
 * Read-out formatting for calc-widget outputs. Spec-driven (`format` on the output),
 * deterministic, and honest about non-finite results: a divide-by-zero renders as
 * "n/a" instead of a crash or an Infinity glyph.
 */

export type OutputFormat = "number" | "compact" | "percent" | "duration" | "bytes"

const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumSignificantDigits: 3,
})
const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 })
const percentFmt = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 })

export function formatOutputValue(value: number, format: OutputFormat = "number"): string {
  if (!Number.isFinite(value)) return "n/a"
  switch (format) {
    case "compact":
      return compactFmt.format(value)
    case "percent":
      return `${percentFmt.format(value * 100)}%`
    case "duration":
      return formatDuration(value)
    case "bytes":
      return formatBytes(value)
    case "number":
      return numberFmt.format(value)
  }
}

/** Seconds in, human unit out (us to days), one unit, no compound strings. */
function formatDuration(seconds: number): string {
  const abs = Math.abs(seconds)
  if (abs < 0.001) return `${numberFmt.format(seconds * 1_000_000)} us`
  if (abs < 1) return `${numberFmt.format(seconds * 1000)} ms`
  if (abs < 60) return `${numberFmt.format(seconds)} s`
  if (abs < 3600) return `${numberFmt.format(seconds / 60)} min`
  if (abs < 86400) return `${numberFmt.format(seconds / 3600)} h`
  return `${numberFmt.format(seconds / 86400)} days`
}

/** Bytes in, decimal units out (matches the curriculum's 10^3 convention). */
function formatBytes(bytes: number): string {
  const abs = Math.abs(bytes)
  if (abs < 1e3) return `${numberFmt.format(bytes)} B`
  if (abs < 1e6) return `${numberFmt.format(bytes / 1e3)} KB`
  if (abs < 1e9) return `${numberFmt.format(bytes / 1e6)} MB`
  if (abs < 1e12) return `${numberFmt.format(bytes / 1e9)} GB`
  if (abs < 1e15) return `${numberFmt.format(bytes / 1e12)} TB`
  return `${numberFmt.format(bytes / 1e15)} PB`
}
