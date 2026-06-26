"use client"

import dynamic from "next/dynamic"

// Dynamically import the actual component to avoid SSR issues
// ssr: false ensures this component never runs on the server
const AuthCallbackClient = dynamic(
  () => import("./auth-callback-client").then(mod => ({ default: mod.AuthCallbackClient })),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4703f] mx-auto mb-4"></div>
          <p>Completing sign in...</p>
        </div>
      </div>
    )
  }
)

export default function AuthCallback() {
  return <AuthCallbackClient />
}
