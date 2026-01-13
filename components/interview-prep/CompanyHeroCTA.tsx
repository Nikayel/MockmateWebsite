"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowRight, Crown, ExternalLink } from "lucide-react"
import Link from "next/link"

interface CompanyHeroCTAProps {
  companyId: string
  careersUrl: string
}

export function CompanyHeroCTA({ companyId, careersUrl }: CompanyHeroCTAProps) {
  const { user, firebaseUser, initialized } = useAuth()
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const isLoggedIn = !!user

  // Check Pro status for logged-in users
  useEffect(() => {
    const checkProStatus = async () => {
      if (!initialized || !user?.id || !firebaseUser) {
        setIsPro(null)
        return
      }

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/user/subscription-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setIsPro(data.tier === "pro" || data.tier === "enterprise")
        }
      } catch {
        setIsPro(false)
      }
    }

    checkProStatus()
  }, [user?.id, firebaseUser, initialized])

  // Determine the roadmap CTA link and text
  const getRoadmapCTA = () => {
    if (!isLoggedIn) {
      return {
        href: `/login?redirect=/interview-prep/${companyId}`,
        text: "Create study plan",
        showProBadge: false,
        isUpgrade: false,
      }
    }
    if (isPro) {
      return {
        href: `/roadmap/new?company=${companyId}`,
        text: "Create study plan",
        showProBadge: false,
        isUpgrade: false,
      }
    }
    // Free user
    return {
      href: "/upgrade",
      text: "Create study plan",
      showProBadge: true,
      isUpgrade: true,
    }
  }

  const roadmapCTA = getRoadmapCTA()

  return (
    <div className="flex flex-wrap gap-3">
      {roadmapCTA.isUpgrade ? (
        // Free logged-in user - show upgrade CTA with Pro badge
        <Link href={roadmapCTA.href}>
          <Button className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/90">
            <Crown className="mr-2 h-4 w-4" />
            {roadmapCTA.text}
            <span className="ml-2 text-[10px] opacity-80">Pro</span>
          </Button>
        </Link>
      ) : (
        // Not logged in or Pro user - normal CTA
        <Link href={roadmapCTA.href}>
          <Button className="bg-white text-black hover:bg-zinc-200">
            {roadmapCTA.text}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )}

      <a href={careersUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Careers page
          <ExternalLink className="ml-2 h-3 w-3" />
        </Button>
      </a>
    </div>
  )
}
