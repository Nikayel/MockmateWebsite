"use client"

import { ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface GatedContentProps {
  children: ReactNode
  lockedContent: ReactNode
  lockedCount: number
  contentType: string
  companyName: string
  companyId: string
}

export function GatedContent({
  children,
  lockedContent,
  lockedCount,
  contentType,
  companyName,
  companyId,
}: GatedContentProps) {
  const { user, loading } = useAuth()

  // Show all content for logged-in users
  if (user) {
    return (
      <>
        {children}
        {lockedContent}
      </>
    )
  }

  // For non-logged-in users, show limited content with blur overlay
  return (
    <>
      {children}

      {/* Blurred/Locked Section */}
      <div className="relative mt-2">
        {/* Blur overlay */}
        <div className="via-background/80 to-background absolute inset-0 z-10 rounded-lg bg-gradient-to-b from-transparent" />

        {/* Blurred content preview */}
        <div className="pointer-events-none opacity-50 blur-sm select-none">{lockedContent}</div>

        {/* Lock CTA overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4">
          <div className="border-border bg-popover/95 max-w-sm rounded-xl border p-6 text-center backdrop-blur-sm">
            <div className="bg-muted mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full">
              <Lock className="text-muted-foreground h-5 w-5" />
            </div>
            <h3 className="text-foreground mb-1 font-medium">
              +{lockedCount} more {contentType}
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Sign up free to unlock the full {companyName} interview guide
            </p>
            <Link href={`/login?redirect=/interview-prep/${companyId}`}>
              <Button size="sm" className="w-full bg-white text-black hover:bg-zinc-200">
                Sign up free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

interface GatedSidebarProps {
  children: ReactNode
  companyName: string
  companyId: string
  showTeaser?: boolean
  teaserText?: string
}

export function GatedSidebar({
  children,
  companyName,
  companyId,
  showTeaser = true,
  teaserText = "Unlock insider tips",
}: GatedSidebarProps) {
  const { user } = useAuth()

  if (user) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {/* Blur overlay */}
      <div className="to-background/90 absolute inset-0 z-10 rounded-lg bg-gradient-to-b from-transparent" />

      {/* Blurred content */}
      <div className="pointer-events-none opacity-40 blur-sm select-none">{children}</div>

      {/* Lock overlay */}
      {showTeaser && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <Link href={`/login?redirect=/interview-prep/${companyId}`} className="group">
            <div className="border-border bg-popover/95 text-muted-foreground hover:border-border hover:text-foreground flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors">
              <Lock className="h-3.5 w-3.5" />
              {teaserText}
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}

export function SocialProofBanner({ companyName }: { companyName: string }) {
  const { user } = useAuth()

  if (user) return null

  // Generate a realistic-looking number based on company name (deterministic)
  const hash = companyName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const baseCount = 1200 + (hash % 800)
  const monthlyCount = Math.floor(baseCount + ((Date.now() / 1000000000) % 500))

  return (
    <div className="border-border bg-card mb-4 rounded-lg border p-3">
      <p className="text-muted-foreground text-center text-xs">
        <span className="font-medium text-emerald-400">{monthlyCount.toLocaleString()}</span>{" "}
        engineers prepared for {companyName} this month
      </p>
    </div>
  )
}
