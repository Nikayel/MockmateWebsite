"use client"

import { useEffect, useState } from "react"
import { Sparra } from "@/components/brand/Sparra"
import { AnimatedEllipsis } from "@/components/brand/AnimatedEllipsis"

const SABLE_WAIT_MESSAGES = [
  "Reviewing",
  "Checking details",
  "Considering it",
  "Verifying",
  "Reading closely",
  "One moment",
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
