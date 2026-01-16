"use client"

/**
 * Interview Page
 *
 * Thin wrapper that:
 * 1. Provides Suspense boundary for Next.js useSearchParams
 * 2. Wraps content with InterviewProvider for state management
 * 3. Renders InterviewContent component
 *
 * All business logic lives in hooks, all state lives in context.
 * ~50 lines total.
 */

import { Suspense } from "react"
import { InterviewProvider } from "./_providers"
import { InterviewContent } from "./_components"

/**
 * Loading fallback for Suspense boundary
 */
function InterviewPageLoading() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#00d9ff]"></div>
        <p className="text-gray-400">Loading interview...</p>
      </div>
    </main>
  )
}

/**
 * Interview page wrapper with provider
 */
function InterviewPageWithProvider() {
  return (
    <InterviewProvider>
      <InterviewContent />
    </InterviewProvider>
  )
}

/**
 * Main export with Suspense boundary for useSearchParams
 */
export default function InterviewPage() {
  return (
    <Suspense fallback={<InterviewPageLoading />}>
      <InterviewPageWithProvider />
    </Suspense>
  )
}
