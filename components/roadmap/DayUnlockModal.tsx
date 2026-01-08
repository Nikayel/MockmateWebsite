"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  Rocket,
  ChevronRight,
  Coffee,
  Flame,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface DayUnlockModalProps {
  isOpen: boolean
  onClose: () => void
  onUnlockNextDay: () => void
  onTakeBreak: () => void
  completedDay: number
  totalDaysRemaining: number
  questionsCompletedToday: number
  minutesSpentToday: number
  nextDayTheme?: string
  nextDayQuestionCount?: number
}

/**
 * Modal shown when user completes all questions for the current day.
 * Celebrates their progress and offers to unlock the next day immediately.
 */
export function DayUnlockModal({
  isOpen,
  onClose,
  onUnlockNextDay,
  onTakeBreak,
  completedDay,
  totalDaysRemaining,
  questionsCompletedToday,
  minutesSpentToday,
  nextDayTheme,
  nextDayQuestionCount,
}: DayUnlockModalProps) {
  const encouragingMessages = [
    "You're crushing it!",
    "Incredible focus!",
    "Interview-ready pace!",
    "On fire today!",
    "Momentum building!",
  ]
  const randomMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-none bg-transparent p-0 shadow-none sm:max-w-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border-border relative overflow-hidden rounded-2xl border"
        >
          {/* Celebration Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-green-500/10" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/10" />
          </div>

          {/* Content */}
          <div className="relative p-6">
            {/* Trophy Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg"
            >
              <Trophy className="h-8 w-8 text-white" />
            </motion.div>

            {/* Main Message */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <h2 className="text-foreground text-xl font-bold">Day {completedDay} Complete!</h2>
              <p className="text-primary mt-1 font-medium">{randomMessage}</p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 grid grid-cols-2 gap-3"
            >
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-foreground text-lg font-bold">
                    {questionsCompletedToday}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">Questions solved</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-foreground text-lg font-bold">{minutesSpentToday}m</span>
                </div>
                <p className="text-muted-foreground text-xs">Focus time</p>
              </div>
            </motion.div>

            {/* Progress indicator */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-4 text-center"
            >
              <p className="text-muted-foreground text-xs">
                <Flame className="mr-1 inline h-3 w-3 text-orange-500" />
                {totalDaysRemaining} days of content remaining
              </p>
            </motion.div>

            {/* Next Day Preview */}
            {nextDayTheme && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="border-border mt-4 rounded-lg border bg-gradient-to-r from-blue-500/5 to-purple-500/5 p-3"
              >
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  Up next: Day {completedDay + 1}
                </p>
                <p className="text-foreground text-sm font-semibold">{nextDayTheme}</p>
                {nextDayQuestionCount && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {nextDayQuestionCount} questions ready
                  </p>
                )}
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 space-y-2"
            >
              <button
                onClick={onUnlockNextDay}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold shadow-sm transition-all hover:shadow-md"
              >
                <Rocket className="h-4 w-4" />
                Continue to Day {completedDay + 1}
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={onTakeBreak}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors"
              >
                <Coffee className="h-4 w-4" />
                Take a break, I'll continue tomorrow
              </button>
            </motion.div>

            {/* Tip */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground mt-4 text-center text-[10px]"
            >
              <Sparkles className="mr-1 inline h-3 w-3" />
              Pro tip: Finish early to have buffer days for review before your interview!
            </motion.p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
