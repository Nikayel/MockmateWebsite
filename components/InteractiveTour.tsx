"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  MousePointer2
} from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface TourStep {
  target: string // CSS selector for the element to highlight
  title: string
  description: string
  position?: "top" | "bottom" | "left" | "right" | "center"
  action?: "click" | "hover" | "none"
  route?: string // Optional route to navigate to for this step
}

interface InteractiveTourProps {
  isOpen: boolean
  userId: string
  userName?: string
  onComplete: () => void
  onSkip: () => void
}

const tourSteps: TourStep[] = [
  {
    target: "[data-tour='welcome']",
    title: "Welcome to CodeSparring! 👋",
    description: "Let's take a quick interactive tour of the platform. I'll show you the key features to get you started.",
    position: "center",
    action: "none"
  },
  {
    target: "[data-tour='sessions-card']",
    title: "Track Your Sessions",
    description: "This shows how many practice sessions you've used this month. Free users get 5 sessions, Pro users get 35.",
    position: "bottom",
    action: "none"
  },
  {
    target: "[data-tour='subscription-card']",
    title: "Your Plan",
    description: "See your current subscription status. Upgrade anytime for more sessions and features.",
    position: "bottom",
    action: "none"
  },
  {
    target: "[data-tour='quick-start']",
    title: "Start Practicing",
    description: "Click here to jump into a practice session. You'll be able to choose your topic and difficulty.",
    position: "bottom",
    action: "none"
  },
  {
    target: "[data-tour='recent-activity']",
    title: "Recent Activity",
    description: "Your practice history shows up here. Review past sessions and track your improvement over time.",
    position: "top",
    action: "none"
  },
  {
    target: "[data-tour='start-practice-btn']",
    title: "Ready to Begin?",
    description: "Click this button to start your first AI mock interview. Pick a problem and practice explaining your approach out loud!",
    position: "left",
    action: "none"
  }
]

export function InteractiveTour({ isOpen, userId, userName, onComplete, onSkip }: InteractiveTourProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const step = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0

  // Find and highlight the target element
  const updateTargetPosition = useCallback(() => {
    if (!isOpen) return

    const target = document.querySelector(step.target)
    if (target) {
      const rect = target.getBoundingClientRect()
      setTargetRect(rect)
      setIsVisible(true)
    } else if (step.position === "center") {
      // Center position doesn't need a target
      setTargetRect(null)
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [isOpen, step])

  useEffect(() => {
    updateTargetPosition()

    // Update position on scroll/resize
    window.addEventListener("scroll", updateTargetPosition, true)
    window.addEventListener("resize", updateTargetPosition)

    return () => {
      window.removeEventListener("scroll", updateTargetPosition, true)
      window.removeEventListener("resize", updateTargetPosition)
    }
  }, [updateTargetPosition])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "Escape") handleSkip()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentStep])

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    try {
      const profileRef = doc(db, "profiles", userId)
      await setDoc(profileRef, {
        tour_completed: true,
        tour_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true })
    } catch (error) {
      console.error("Failed to save tour completion:", error)
    }
    onComplete()
  }

  const handleSkip = async () => {
    try {
      const profileRef = doc(db, "profiles", userId)
      await setDoc(profileRef, {
        tour_completed: true,
        tour_skipped: true,
        tour_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true })
    } catch (error) {
      console.error("Failed to save tour skip:", error)
    }
    onSkip()
  }

  if (!isOpen) return null

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || step.position === "center") {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      }
    }

    const padding = 16
    const tooltipWidth = 320

    switch (step.position) {
      case "top":
        return {
          position: "fixed",
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding))
        }
      case "bottom":
        return {
          position: "fixed",
          top: targetRect.bottom + padding,
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding))
        }
      case "left":
        return {
          position: "fixed",
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + padding,
          transform: "translateY(-50%)"
        }
      case "right":
        return {
          position: "fixed",
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding,
          transform: "translateY(-50%)"
        }
      default:
        return {
          position: "fixed",
          top: targetRect.bottom + padding,
          left: Math.max(padding, targetRect.left)
        }
    }
  }

  // Get arrow position
  const getArrowStyle = (): React.CSSProperties | null => {
    if (!targetRect || step.position === "center") return null

    switch (step.position) {
      case "top":
        return {
          position: "absolute",
          bottom: -8,
          left: "50%",
          transform: "translateX(-50%) rotate(180deg)"
        }
      case "bottom":
        return {
          position: "absolute",
          top: -8,
          left: "50%",
          transform: "translateX(-50%)"
        }
      case "left":
        return {
          position: "absolute",
          right: -8,
          top: "50%",
          transform: "translateY(-50%) rotate(90deg)"
        }
      case "right":
        return {
          position: "absolute",
          left: -8,
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)"
        }
      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        {/* Dark overlay with spotlight cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.85)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Highlighted element border */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute pointer-events-none"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              border: "2px solid #00d9ff",
              borderRadius: 12,
              boxShadow: "0 0 20px rgba(0, 217, 255, 0.3), inset 0 0 20px rgba(0, 217, 255, 0.1)"
            }}
          />
        )}

        {/* Pulsing pointer for highlighted element */}
        {targetRect && step.action !== "none" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute pointer-events-none"
            style={{
              top: targetRect.top + targetRect.height / 2,
              left: targetRect.left + targetRect.width / 2,
              transform: "translate(-50%, -50%)"
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-12 h-12 rounded-full bg-[#00d9ff]/30 flex items-center justify-center"
            >
              <MousePointer2 className="h-6 w-6 text-[#00d9ff]" />
            </motion.div>
          </motion.div>
        )}

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-10 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm bg-gray-900/80 px-3 py-2 rounded-lg"
        >
          Skip tour
          <X className="h-4 w-4" />
        </button>

        {/* Progress dots */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex gap-2">
          {tourSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? "w-6 bg-[#00d9ff]"
                  : idx < currentStep
                  ? "w-2 bg-[#00d9ff]/50"
                  : "w-2 bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key={currentStep}
          className="z-10 w-80"
          style={getTooltipStyle() as React.CSSProperties}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            {/* Arrow */}
            {getArrowStyle() && (
              <div style={getArrowStyle() as React.CSSProperties}>
                <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                  <path d="M8 0L16 8H0L8 0Z" fill="#1f2937" />
                </svg>
              </div>
            )}

            {/* Header */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-[#00d9ff]" />
                <span className="text-xs text-[#00d9ff] font-medium">
                  Step {currentStep + 1} of {tourSteps.length}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">
                {step.title}
              </h3>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Navigation */}
            <div className="p-4 border-t border-gray-800 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={isFirstStep}
                className={`text-gray-400 hover:text-white ${isFirstStep ? "invisible" : ""}`}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              <Button
                size="sm"
                onClick={handleNext}
                className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black font-medium"
              >
                {isLastStep ? "Start Practicing" : "Next"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Keyboard hint */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-gray-500 text-xs">
            Use <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 mx-1">←</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 mx-1">→</kbd> to navigate
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
