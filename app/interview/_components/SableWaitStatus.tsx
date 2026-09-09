"use client"

import { useEffect, useState } from "react"
import { Sparra } from "@/components/brand/Sparra"
import { AnimatedEllipsis } from "@/components/brand/AnimatedEllipsis"

const SABLE_WAIT_MESSAGES = [
  "Contemplating the trade-offs",
  "Evaluating the invariants",
  "Reading between the loops",
  "Checking the sneaky edge cases",
  "Low-key, that reasoning has structure",
  "Making sure the hash map isn't doing all the talking",
  "Verifying before I commit to the record",
]

export function SableWaitStatus() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    setMessageIndex(Math.floor(Math.random() * SABLE_WAIT_MESSAGES.length))
    const rotation = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % SABLE_WAIT_MESSAGES.length)
    }, 2200)

    return () => window.clearInterval(rotation)
  }, [])

  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <Sparra state="thinking" size={20} />
      <span className="text-muted-foreground text-xs">
        {SABLE_WAIT_MESSAGES[messageIndex]}
        <AnimatedEllipsis />
      </span>
    </div>
  )
}
