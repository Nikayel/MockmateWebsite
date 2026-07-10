"use client"

/**
 * OnsiteTimer (PF-16) — a running clock that gives Onsite mode real teeth.
 *
 * Onsite is sold as "interview conditions" but used to differ only by the Build
 * curveball. A visible countdown from the lab's time budget adds the time
 * pressure a real onsite has, without removing the guidance's teaching value.
 * Counts down from `startedAt`; once past the budget it counts up in a warning
 * colour so the candidate feels the overrun the way an interviewer would notice it.
 */

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function OnsiteTimer({
  startedAt,
  budgetMinutes,
}: {
  startedAt: string
  budgetMinutes: number
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const started = new Date(startedAt).getTime()
  const elapsedSec = Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0
  const remainingSec = budgetMinutes * 60 - elapsedSec
  const over = remainingSec < 0
  const abs = Math.abs(remainingSec)
  const label = `${over ? "+" : ""}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`

  return (
    <span
      role="timer"
      aria-label={over ? `${label} over the time budget` : `${label} remaining`}
      title="Onsite time budget"
      className={cn(
        "flex items-center gap-1 text-[12px] tabular-nums",
        over ? "font-medium text-[var(--wb-danger,#dc2626)]" : "text-[var(--wb-muted)]"
      )}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  )
}
