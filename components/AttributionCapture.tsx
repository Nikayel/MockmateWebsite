"use client"

import { useEffect } from "react"
import { captureAttribution } from "@/lib/attribution"

/**
 * Captures first-touch UTM attribution on mount so analytics events can be tied
 * to the acquisition channel. Renders nothing.
 */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution()
  }, [])

  return null
}
