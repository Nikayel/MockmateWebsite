"use client"

/**
 * EscapedDefectCurve — inline SVG line chart, no chart library (UX-SPEC.md
 * §1.8, §11). `--wb-accent` solid for the graded series, `--wb-muted` dotted
 * for the assisted series. Points are labelled via `<title>` (hover/focus)
 * and the chart carries a visually-hidden `<table>` text alternative so the
 * numbers are never available only as a picture.
 *
 * Plotted per TICKET, in submission order, not per sprint: the compiled
 * registry has no ticket-to-sprint mapping anywhere (the same documented gap
 * `lib/sprint-labs/runs.ts` and the ticket/retro screens already carry), so
 * a true per-sprint x-axis is not buildable from real data. Flagged in the
 * Task 13 report.
 */

import type { EscapedRatePoint } from "./session-attempts"

export interface EscapedDefectCurveProps {
  points: EscapedRatePoint[]
}

const WIDTH = 480
const HEIGHT = 160
const PADDING = 28

function toCoords(
  points: EscapedRatePoint[]
): Array<{ x: number; y: number; point: EscapedRatePoint }> {
  const plottable = points.filter((p) => p.rate !== null)
  const step = plottable.length > 1 ? (WIDTH - PADDING * 2) / (plottable.length - 1) : 0
  return plottable.map((point, index) => ({
    x: PADDING + index * step,
    y: PADDING + (1 - (point.rate ?? 0)) * (HEIGHT - PADDING * 2),
    point,
  }))
}

export function EscapedDefectCurve({ points }: EscapedDefectCurveProps) {
  const graded = toCoords(points.filter((p) => p.graded))
  const assisted = toCoords(points.filter((p) => !p.graded))

  const gradedPath = graded.map((c) => `${c.x},${c.y}`).join(" ")
  const assistedPath = assisted.map((c) => `${c.x},${c.y}`).join(" ")

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Escaped defect rate per ticket"
        className="w-full max-w-[480px]"
      >
        <line
          x1={PADDING}
          y1={HEIGHT - PADDING}
          x2={WIDTH - PADDING}
          y2={HEIGHT - PADDING}
          stroke="var(--wb-border)"
          strokeWidth={1}
        />
        <line
          x1={PADDING}
          y1={PADDING}
          x2={PADDING}
          y2={HEIGHT - PADDING}
          stroke="var(--wb-border)"
          strokeWidth={1}
        />

        {assisted.length > 0 && (
          <polyline
            points={assistedPath}
            fill="none"
            stroke="var(--wb-muted)"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        )}
        {graded.length > 0 && (
          <polyline points={gradedPath} fill="none" stroke="var(--wb-accent)" strokeWidth={2} />
        )}

        {[...graded, ...assisted].map((c) => (
          <circle
            key={`${c.point.graded ? "graded" : "assisted"}-${c.point.ticketKey}`}
            cx={c.x}
            cy={c.y}
            r={4}
            fill={c.point.graded ? "var(--wb-accent)" : "var(--wb-muted)"}
            tabIndex={0}
          >
            <title>
              {c.point.ticketKey}: {Math.round((c.point.rate ?? 0) * 100)}% escaped (
              {c.point.graded ? "graded" : "assisted, feedback only"})
            </title>
          </circle>
        ))}
      </svg>

      <table className="sr-only">
        <caption>Escaped defect rate per ticket</caption>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Escaped rate</th>
            <th scope="col">Policy</th>
          </tr>
        </thead>
        <tbody>
          {points
            .filter((p) => p.rate !== null)
            .map((p) => (
              <tr key={p.ticketKey}>
                <td>{p.ticketKey}</td>
                <td>{Math.round((p.rate ?? 0) * 100)}%</td>
                <td>{p.graded ? "graded" : "assisted, feedback only"}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
