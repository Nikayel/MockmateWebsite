"use client"

/**
 * Global client-side error listener. Renders nothing.
 *
 * Captures window "error" events and unhandled promise rejections and forwards
 * them to /api/client-error. The dedupe, 5-per-page-load cap, and
 * production-only guard live in report-client-error.ts. React render crashes
 * are reported separately by app/error.tsx and app/global-error.tsx.
 */

import { useEffect } from "react"
import { reportClientError } from "./report-client-error"

function describeRejectionReason(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) {
    return { message: reason.message || reason.name, stack: reason.stack }
  }
  if (typeof reason === "string") {
    return { message: reason }
  }
  try {
    // JSON.stringify returns undefined for undefined/functions/symbols.
    const serialized = JSON.stringify(reason)
    return { message: serialized ? serialized.slice(0, 500) : "Unhandled rejection (no reason)" }
  } catch {
    return { message: "Unhandled rejection (unserializable reason)" }
  }
}

export function ClientErrorReporter() {
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      reportClientError({
        message: event.message || "Unknown window error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        source: "window-error",
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const { message, stack } = describeRejectionReason(event.reason)
      reportClientError({
        message: message || "Unhandled promise rejection",
        stack,
        source: "unhandled-rejection",
      })
    }

    window.addEventListener("error", onWindowError)
    window.addEventListener("unhandledrejection", onUnhandledRejection)
    return () => {
      window.removeEventListener("error", onWindowError)
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
    }
  }, [])

  return null
}
