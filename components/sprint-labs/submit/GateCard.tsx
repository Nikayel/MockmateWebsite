/**
 * GateCard — one gate in the submit/CI staged reveal (UX-SPEC.md §8).
 *
 * "A gate that has not started renders its number, name and definition at
 * `--wb-disabled` with no counts. A running gate shows a small inline
 * spinner, not a second Sparra." Hidden/adversary output is names only:
 * this card is INCAPABLE of rendering anything but `GateCardViewModel.escaped`
 * (curated `humanName` strings) and `summaryLine` (the one aggregate line the
 * real API supplies for visible/regression/adversary) — no stack, no diff, no
 * expected/actual, because those fields do not exist on the type it is handed.
 */

import { Loader2 } from "lucide-react"
import { EscapedDefectList } from "./EscapedDefectList"
import { GATE_ERRORED_LINE, type GateCardViewModel } from "./gate-view-model"

export interface GateCardProps {
  index: number
  card: GateCardViewModel
  /** True only for the one card currently being revealed (the running spinner). */
  isRunning: boolean
}

const STATUS_LABEL: Record<GateCardViewModel["status"], string> = {
  pending: "",
  passed: "pass",
  failed: "",
  errored: "not counted",
}

export function GateCard({ index, card, isRunning }: GateCardProps) {
  const dim = card.status === "pending"

  return (
    <div
      className={
        "flex flex-col gap-2 rounded-lg border p-4 " +
        (dim
          ? "border-[var(--wb-border)] bg-[var(--wb-panel)] text-[var(--wb-disabled)]"
          : "border-[var(--wb-border)] bg-[var(--wb-card)] text-[var(--wb-text)]")
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-xs font-medium">{index + 1}</span>
          <span className="text-sm font-semibold tracking-[0.02em] uppercase">{card.name}</span>
          <span className={"text-xs " + (dim ? "" : "text-[var(--wb-text-secondary)]")}>
            {card.definition}
          </span>
        </div>
        {isRunning && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      </div>

      {card.status === "passed" && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[var(--wb-text-secondary)]">
            {card.summaryLine ?? `${card.passed} of ${card.total} passed`}
          </span>
          <span className="text-xs font-semibold text-[var(--wb-success)] uppercase">
            {STATUS_LABEL.passed}
          </span>
        </div>
      )}

      {card.status === "failed" && card.id === "hidden" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[var(--wb-text-secondary)]">
              {card.passed} of {card.total} passed
            </span>
            <span className="text-destructive text-xs font-semibold uppercase">
              {card.total - card.passed === 1 ? "1 escaped" : `${card.total - card.passed} escaped`}
            </span>
          </div>
          <EscapedDefectList escaped={card.escaped} />
        </div>
      )}

      {card.status === "failed" && card.id !== "hidden" && (
        <p className="text-destructive text-sm">{card.summaryLine ?? "This gate did not pass."}</p>
      )}

      {card.status === "errored" && (
        <p className="text-sm text-[var(--wb-text-secondary)] italic">{GATE_ERRORED_LINE}</p>
      )}
    </div>
  )
}
