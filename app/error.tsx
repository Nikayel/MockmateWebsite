"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, Home, RotateCcw } from "lucide-react"
import { attemptChunkErrorRecovery } from "@/components/monitoring/chunk-reload"
import { reportClientError } from "@/components/monitoring/report-client-error"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // A stale-deploy chunk error is recoverable: a reload fetches the new build. Only
    // when the reload latch says we already tried does it fall through to reporting.
    if (attemptChunkErrorRecovery(error.message)) return
    // One incident, one beacon. (A logger.error used to sit here too; in the browser
    // the logger beacons its own message, so every crash produced a second Sentry
    // issue — "[ClientError] Route error caught" — alongside this one.)
    reportClientError({
      message: error.message || "Route error",
      stack: error.stack,
      source: "react-boundary",
    })
  }, [error])

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="bg-card border-border w-full max-w-md rounded-xl border p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-foreground mb-2 text-2xl font-bold">Something went wrong</h1>

        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error. Our team has been notified and is working on a fix.
        </p>

        {error.digest && (
          <p className="text-muted-foreground bg-muted mb-6 rounded p-2 font-mono text-xs">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex justify-center gap-3">
          <Button onClick={reset} className="bg-primary hover:bg-primary/90">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          <Button onClick={() => (window.location.href = "/")} variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}
