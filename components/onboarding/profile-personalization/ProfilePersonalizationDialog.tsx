"use client"

import { useRef, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { trackEvent } from "@/lib/analytics"
import { completeProfilePersonalization } from "@/lib/onboarding/onboarding-service"
import type {
  InterviewGoal,
  InterviewTimeline,
  ProfilePersonalizationData,
  TargetRole,
} from "@/lib/onboarding/profile-personalization"
import type { Profile } from "@/lib/types"
import { CadenceStep } from "./CadenceStep"
import { GoalTimelineStep } from "./GoalTimelineStep"
import { TargetRoleStep } from "./TargetRoleStep"

interface ProfilePersonalizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  source: "feedback" | "dashboard"
  profile: Profile | null
  onCompleted: (data: ProfilePersonalizationData) => void
}

export function ProfilePersonalizationDialog({
  open,
  onOpenChange,
  userId,
  source,
  profile,
  onCompleted,
}: ProfilePersonalizationDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<TargetRole | null>(profile?.role ?? null)
  const [goal, setGoal] = useState<InterviewGoal | null>(profile?.goal ?? null)
  const [timeline, setTimeline] = useState<InterviewTimeline | null>(
    profile?.interview_timeline ?? null
  )
  const [targetCompany, setTargetCompany] = useState(profile?.target_company ?? "")
  const [weeklyGoal, setWeeklyGoal] = useState<number | null>(profile?.weekly_goal ?? null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canContinue =
    step === 0
      ? role !== null
      : step === 1
        ? goal !== null && timeline !== null
        : weeklyGoal !== null

  const focusCurrentStep = () => {
    const content = contentRef.current

    if (typeof content?.scrollTo === "function") {
      content.scrollTo({ top: 0 })
    }

    content
      ?.querySelector<HTMLElement>("[data-personalization-step-heading]")
      ?.focus({ preventScroll: true })
  }

  const handleSave = async () => {
    if (!role || !goal || !timeline || !weeklyGoal || isSaving) return

    const data: ProfilePersonalizationData = {
      role,
      goal,
      interviewTimeline: timeline,
      targetCompany: targetCompany.trim() || null,
      weeklyGoal,
    }

    setError(null)
    setIsSaving(true)
    try {
      await completeProfilePersonalization(userId, data)
      trackEvent("profile_personalization_completed", {
        source,
        role,
        goal,
        interview_timeline: timeline,
        weekly_goal: weeklyGoal,
      })
      onCompleted(data)
      onOpenChange(false)
    } catch (saveError) {
      console.error("Failed to save profile personalization:", saveError)
      setError("We couldn’t save your profile. Check your connection and try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className="border-border/70 bg-card max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-2xl gap-0 overflow-y-auto rounded-2xl p-0 shadow-2xl sm:w-full [&>button]:top-2 [&>button]:right-2 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center"
      >
        <div className="border-border/60 border-b px-5 pt-6 pb-5 sm:px-7">
          <DialogHeader className="pr-10 text-left">
            <div className="text-accent-strong flex items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase">
              <span>Personalize your plan</span>
              <span className="text-muted-foreground">{step + 1} of 3</span>
            </div>
            <DialogTitle className="text-2xl tracking-tight">
              Give Sparra a better target
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              Three quick answers turn your first-session signal into a more relevant practice plan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid grid-cols-3 gap-2" aria-label={`Step ${step + 1} of 3`}>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={`h-1 rounded-full transition-colors ${index <= step ? "bg-accent" : "bg-muted"}`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        <MotionConfig reducedMotion="user">
          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                onAnimationComplete={focusCurrentStep}
              >
                {step === 0 && <TargetRoleStep value={role} onChange={setRole} />}
                {step === 1 && (
                  <GoalTimelineStep
                    goal={goal}
                    timeline={timeline}
                    targetCompany={targetCompany}
                    onGoalChange={setGoal}
                    onTimelineChange={setTimeline}
                    onTargetCompanyChange={setTargetCompany}
                  />
                )}
                {step === 2 && <CadenceStep value={weeklyGoal} onChange={setWeeklyGoal} />}
              </motion.div>
            </AnimatePresence>

            {error && (
              <p
                className="border-destructive/30 bg-destructive/10 text-destructive mt-5 rounded-lg border p-3 text-sm"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="border-border/60 mt-7 flex items-center justify-between gap-3 border-t pt-5">
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground min-h-11"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0 || isSaving}
              >
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
              {step < 2 ? (
                <Button
                  type="button"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 min-h-11 px-5"
                  onClick={() => setStep((current) => Math.min(2, current + 1))}
                  disabled={!canContinue}
                >
                  Continue
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 min-h-11 px-5"
                  onClick={() => void handleSave()}
                  disabled={!canContinue}
                  loading={isSaving}
                >
                  <Check aria-hidden="true" />
                  Save my plan
                </Button>
              )}
            </div>
          </div>
        </MotionConfig>
      </DialogContent>
    </Dialog>
  )
}
