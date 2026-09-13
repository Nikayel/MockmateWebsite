"use client"

import { useCallback, useState } from "react"

import { LabOnboarding } from "@/components/labs/onboarding/LabOnboarding"
import { completeInitialOnboarding } from "@/lib/onboarding/onboarding-service"

const INITIAL_INTERVIEW_CONFIG = {
  id: "initial-interview-v1",
  company: "CodeSparring",
  beats: [
    {
      kind: "offer" as const,
      chapter: "Welcome",
      lines: ["Welcome to CodeSparring.", "Practice the moment the interview begins."],
    },
    {
      kind: "company" as const,
      chapter: "The room",
      heading: "One focused round at a time.",
      lines: [
        "Think out loud, make your decisions visible, and get feedback you can use on the next attempt.",
      ],
    },
    {
      kind: "pair" as const,
      chapter: "Your guide",
      partnerName: "Sparra",
      mascot: "sparra" as const,
      lines: ["Your interviewer keeps the round moving. You do the thinking and the coding."],
    },
    {
      kind: "handoff" as const,
      chapter: "Start",
      heading: "Choose your first practice lane.",
      body: "Start with DSA or debugging. Your first personalized roadmap is free. Labs and decomposition practice are currently in beta.",
      ctaLabel: "Choose a practice lane",
    },
  ],
}

interface InitialInterviewOnboardingProps {
  isOpen: boolean
  userId: string
  onDone: () => void
}

/** The Labs cinematic adapted for a new account's first arrival. */
export function InitialInterviewOnboarding({
  isOpen,
  userId,
  onDone,
}: InitialInterviewOnboardingProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleDone = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await completeInitialOnboarding(userId)
    } catch (error) {
      // The cinematic is an introduction, never an account access gate.
      console.error("Failed to persist initial onboarding:", error)
    }
    onDone()
  }, [isSaving, onDone, userId])

  if (!isOpen) return null
  return <LabOnboarding config={INITIAL_INTERVIEW_CONFIG} onDone={handleDone} />
}
