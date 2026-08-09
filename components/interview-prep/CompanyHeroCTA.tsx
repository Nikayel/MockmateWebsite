"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowRight, Crown, ExternalLink } from "lucide-react"
import Link from "next/link"
import { isPaidTier } from "@/lib/pricing"
import type { SubscriptionTier } from "@/lib/config"

interface CompanyHeroCTAProps {
  companyId: string
  careersUrl: string
}

export function CompanyHeroCTA({ companyId, careersUrl }: CompanyHeroCTAProps) {
  const { user, firebaseUser, initialized } = useAuth()
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [isLoadingPro, setIsLoadingPro] = useState(false)
  const isLoggedIn = !!user

  // Check Pro status for logged-in users
  useEffect(() => {
    const checkProStatus = async () => {
      // Not initialized yet - wait
      if (!initialized) {
        return
      }

      // No user - reset state
      if (!user?.id || !firebaseUser) {
        setIsPro(null)
        setIsLoadingPro(false)
        return
      }

      setIsLoadingPro(true)
      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/user/subscription-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = (await response.json()) as { tier?: SubscriptionTier }
          setIsPro(isPaidTier(data.tier ?? "free"))
        } else {
          setIsPro(false)
        }
      } catch {
        setIsPro(false)
      } finally {
        setIsLoadingPro(false)
      }
    }

    checkProStatus()
  }, [user?.id, firebaseUser, initialized])

  // Determine if we're in a loading state for Pro check
  const isProLoading = isLoggedIn && (isPro === null || isLoadingPro)

  return (
    <div className="flex flex-wrap gap-3">
      {!isLoggedIn ? (
        // Not logged in - show normal CTA to login
        <Link href={`/login?redirect=/interview-prep/${companyId}`}>
          <Button className="bg-white text-black hover:bg-zinc-200">
            Create study plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      ) : isProLoading ? (
        // Loading state - show neutral button while checking Pro status
        <Button className="cursor-wait bg-zinc-700 text-zinc-300" disabled>
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
          Create study plan
        </Button>
      ) : isPro ? (
        // Pro user - direct to roadmap creation
        <Link href={`/roadmap/new?company=${companyId}`}>
          <Button className="bg-white text-black hover:bg-zinc-200">
            Create study plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      ) : (
        // Free logged-in user - show upgrade CTA with Pro badge
        <Link href="/upgrade">
          <Button className="bg-[#c4703f] text-black hover:bg-[#c4703f]/90">
            <Crown className="mr-2 h-4 w-4" />
            Create study plan
            <span className="ml-2 text-[10px] opacity-80">Pro</span>
          </Button>
        </Link>
      )}

      <a href={careersUrl} target="_blank" rel="noopener noreferrer">
        <Button
          variant="outline"
          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Careers page
          <ExternalLink className="ml-2 h-3 w-3" />
        </Button>
      </a>
    </div>
  )
}
