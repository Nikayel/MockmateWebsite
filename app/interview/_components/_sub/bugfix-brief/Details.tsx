"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { BugSymptom } from "@/lib/scenarios/types"
import { BRIEF_LABEL as LABEL } from "./content"

export function SymptomCard({ symptom }: { symptom: BugSymptom }) {
  return (
    <div className="border-border/70 bg-card/40 rounded-lg border">
      <div className="border-border/50 flex items-center gap-2 border-b px-3 py-1.5">
        <span className={LABEL}>{symptom.subject}</span>
        {symptom.tag && (
          <>
            <span className="text-muted-foreground/40 text-[10px]">···</span>
            <span className={LABEL}>{symptom.tag}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-2">
        <div className="border-border/50 min-w-0 border-r px-3 py-2 break-words">
          <div className={cn(LABEL, "mb-1")}>Expected</div>
          <div className="text-foreground font-mono text-[17px] leading-tight tabular-nums">
            {symptom.expected}
          </div>
        </div>
        <div className="min-w-0 px-3 py-2 break-words">
          <div className={cn(LABEL, "mb-1")}>Actual</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[17px] leading-tight text-[var(--workspace-error)] tabular-nums">
              {symptom.actual}
            </span>
            {symptom.delta && (
              <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] text-[var(--workspace-error)]">
                {symptom.delta}
              </span>
            )}
          </div>
        </div>
      </div>

      {symptom.caveat && (
        <div className="border-border/50 text-muted-foreground border-t px-3 py-1.5 text-[11.5px] leading-snug">
          {symptom.caveat}
        </div>
      )}
    </div>
  )
}

export function AcceptanceRow({ text }: { text: string }) {
  const [checked, setChecked] = useState(false)

  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-2 py-2">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => setChecked(value === true)}
        className="mt-0.5 flex-shrink-0"
      />
      <span
        className={cn(
          "text-sm leading-relaxed transition-colors",
          "text-muted-foreground",
          checked && "line-through"
        )}
      >
        {text}
      </span>
    </label>
  )
}
