"use client"

import dynamic from "next/dynamic"

// Dynamically import the actual component to avoid SSR issues
// ssr: false ensures this component never runs on the server
const AuthCallbackClient = dynamic(
  () => import("./auth-callback-client").then((mod) => ({ default: mod.AuthCallbackClient })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-foreground text-center">
          <div className="border-accent mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p>Completing sign in...</p>
        </div>
      </div>
    ),
  }
)

export default function AuthCallback() {
  return <AuthCallbackClient />
}
