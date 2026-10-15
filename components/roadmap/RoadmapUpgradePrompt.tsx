"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRICING_CONFIG } from "@/lib/config"
import type { RoadmapUpgradeReason } from "@/lib/roadmap/upgrade-gate"

interface RoadmapUpgradePromptProps {
  reason: RoadmapUpgradeReason
  companyName: string
  onUpgrade: () => void
  onStartOver: () => void
}

export function RoadmapUpgradePrompt({
  reason,
  companyName,
  onUpgrade,
  onStartOver,
}: RoadmapUpgradePromptProps) {
  return (
    <section
      aria-labelledby="roadmap-upgrade-heading"
      className="border-border bg-card mx-auto max-w-lg rounded-xl border p-5 text-left sm:p-6"
    >
      <h2 id="roadmap-upgrade-heading" className="text-foreground text-xl font-semibold">
        {reason === "free_roadmap_used"
          ? "Create your next prep plan with Pro"
          : "Build your interview prep plan with Pro"}
      </h2>
      <p className="text-muted-foreground mt-3 text-sm leading-6">
        {reason === "free_roadmap_used"
          ? "Your account has already used its free roadmap. "
          : "This roadmap requires Pro. "}
        Create a daily plan for {companyName} based on your role, skills, interview date, and
        available study time.
      </p>
      <ul className="text-muted-foreground mt-5 space-y-3 text-sm">
        {[
          "Company- and role-aware practice selection",
          "A daily schedule built around your interview date",
          "Spaced repetition review scheduling",
          `${PRICING_CONFIG.pro.sessionsPerMonth} AI interview sessions per month`,
        ].map((benefit) => (
          <li key={benefit} className="flex items-start gap-2">
            <Check aria-hidden="true" className="text-accent-strong mt-0.5 h-4 w-4 shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-5 text-xs leading-5">
        We haven’t generated this plan yet. Review Pro pricing before deciding to upgrade.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild className="min-h-11">
          <Link href="/upgrade?source=roadmap" onClick={onUpgrade}>
            See Pro pricing
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/dashboard">Continue with Free</Link>
        </Button>
        <Button variant="ghost" className="min-h-11" onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </section>
  )
}
