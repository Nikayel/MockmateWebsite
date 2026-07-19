"use client"

import { useEffect } from "react"
import { reportClientError } from "@/components/monitoring/report-client-error"

/**
 * Root-level error boundary. Renders when the root layout itself crashes, so
 * it must provide its own <html>/<body> and cannot rely on the app stylesheet
 * being loaded — styling is inline only (dark theme + clay accent), kept
 * deliberately plain. Mirrors the copy of app/error.tsx.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Fire-and-forget: funnels the crash into the server logger -> Sentry.
    reportClientError({
      message: error.message || "Root layout error",
      stack: error.stack,
      source: "react-boundary",
    })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#1a1917",
          color: "#f5f2ee",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#b3aca3", maxWidth: "28rem", marginBottom: "1.5rem" }}>
            We encountered an unexpected error. Our team has been notified and is working on a fix.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "0.75rem",
                color: "#b3aca3",
                marginBottom: "1.5rem",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              backgroundColor: "#c4703f",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
