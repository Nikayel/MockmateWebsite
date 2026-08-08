"use client"

/**
 * The three ways the admin gate can fail, as three different screens.
 *
 * The gate used to collapse every non-200 into "Access Denied", so a five second
 * backend hiccup told a real super admin they were not an admin. Signed out,
 * genuinely not an admin, and "the check itself failed" are different problems with
 * different next actions, so they get different screens.
 */

import { AlertTriangle, Home, LogIn, RefreshCw, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1917]"

function AdminGateFrame({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "clay" | "danger" | "warning"
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  const border =
    tone === "danger"
      ? "border-red-500/30"
      : tone === "warning"
        ? "border-amber-500/30"
        : "border-[#c4703f]/30"
  const iconColor =
    tone === "danger" ? "text-red-400" : tone === "warning" ? "text-amber-400" : "text-[#c4703f]"

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1917] p-6">
      <div
        role="alert"
        className={`w-full max-w-md rounded-xl border ${border} bg-gray-900/60 p-8 text-center`}
      >
        <Icon className={`mx-auto mb-4 h-12 w-12 ${iconColor}`} />
        <h1 className="mb-2 text-xl font-bold text-white">{title}</h1>
        {children}
      </div>
    </div>
  )
}

/**
 * 401: no session, or a token the server would not accept.
 */
export function AdminSignInRequired({ onSignIn }: { onSignIn: () => void }) {
  return (
    <AdminGateFrame tone="clay" icon={LogIn} title="Sign in to continue">
      <p className="mb-6 text-gray-400">
        Your session is missing or has expired. Sign in with an admin account to open the dashboard.
      </p>
      <Button
        onClick={onSignIn}
        className={`bg-[#c4703f] text-black hover:bg-[#c4703f]/80 ${FOCUS_RING}`}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign in
      </Button>
    </AdminGateFrame>
  )
}

/**
 * 403: the server resolved this user and they are not an admin.
 */
export function AdminAccessDenied({ email, onGoHome }: { email?: string; onGoHome: () => void }) {
  return (
    <AdminGateFrame tone="danger" icon={ShieldX} title="Access denied">
      <p className="mb-6 text-gray-400">
        {email ? (
          <>
            <span className="text-gray-300">{email}</span> does not have an admin role. Ask a super
            admin to grant one if you need access.
          </>
        ) : (
          <>This account does not have an admin role. Ask a super admin to grant one.</>
        )}
      </p>
      <Button
        onClick={onGoHome}
        className={`bg-[#c4703f] text-black hover:bg-[#c4703f]/80 ${FOCUS_RING}`}
      >
        <Home className="mr-2 h-4 w-4" />
        Return to home
      </Button>
    </AdminGateFrame>
  )
}

/**
 * Anything else: the check failed, which says nothing about whether the user is an
 * admin. Offer a retry instead of an accusation.
 */
export function AdminGateError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <AdminGateFrame tone="warning" icon={AlertTriangle} title="Could not verify your access">
      <p className="mb-6 text-gray-400">{message}</p>
      <Button
        onClick={onRetry}
        className={`bg-[#c4703f] text-black hover:bg-[#c4703f]/80 ${FOCUS_RING}`}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </AdminGateFrame>
  )
}
