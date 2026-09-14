"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Check, Sparkles } from "lucide-react"

import { Sparra } from "@/components/brand/Sparra"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"
import type { ProfilePersonalizationData } from "@/lib/onboarding/profile-personalization"
import type { Profile } from "@/lib/types"
import { ProfilePersonalizationDialog } from "./ProfilePersonalizationDialog"

interface ProfilePersonalizationPromptProps {
  userId: string
  source: "feedback" | "dashboard"
  profile: Profile | null
  onCompleted: (data: ProfilePersonalizationData) => void
}

const BENEFITS = ["Level-aware follow-ups", "A sharper roadmap", "A realistic weekly pace"]

export function ProfilePersonalizationPrompt({
  userId,
  source,
  profile,
  onCompleted,
}: ProfilePersonalizationPromptProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    trackEvent("profile_personalization_prompt_shown", { source })
  }, [source])

  const openDialog = () => {
    trackEvent("profile_personalization_started", { source })
    setIsOpen(true)
  }

  return (
    <>
      <section
        className="border-accent/30 bg-card shadow-accent/5 relative overflow-hidden rounded-2xl border p-5 shadow-lg sm:p-6"
        aria-labelledby={`profile-personalization-${source}`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_38%)]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="border-accent/20 bg-accent/10 hidden size-16 shrink-0 items-center justify-center rounded-2xl border sm:flex">
              <Sparra state="thinking" size={48} label="Sparra" />
            </div>
            <div>
              <div className="text-accent-strong flex items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Your next best step
              </div>
              <h2
                id={`profile-personalization-${source}`}
                className="text-foreground mt-2 text-xl font-semibold tracking-tight sm:text-2xl"
              >
                Make the next round yours.
              </h2>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
                Your first session gave us a baseline. Add three preferences so Sparra can aim your
                practice at the role you actually want.
              </p>
              <ul className="text-muted-foreground mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-1.5">
                    <Check className="text-neural size-3.5" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="shrink-0 lg:text-right">
            <Button
              type="button"
              onClick={openDialog}
              className="bg-accent text-accent-foreground hover:bg-accent/90 min-h-11 w-full px-5 shadow-sm lg:w-auto"
            >
              Personalize my plan
              <ArrowRight aria-hidden="true" />
            </Button>
            <p className="text-muted-foreground mt-2 text-center text-xs lg:text-right">
              About 60 seconds
            </p>
          </div>
        </div>
      </section>

      <ProfilePersonalizationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        userId={userId}
        source={source}
        profile={profile}
        onCompleted={onCompleted}
      />
    </>
  )
}
