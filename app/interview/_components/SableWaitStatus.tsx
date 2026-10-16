"use client"

import { AnimatedEllipsis } from "@/components/brand/AnimatedEllipsis"

export function SableWaitStatus() {
  return (
    <div className="text-muted-foreground px-1 py-2 text-xs" role="status" aria-live="polite">
      <span>
        Sable is replying
        <AnimatedEllipsis />
      </span>
    </div>
  )
}
