'use client'

import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'

interface FocusCompletionBannerProps {
  completedMinutes: number
}

export function FocusCompletionBanner({ completedMinutes }: FocusCompletionBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 bg-green-500/10 border-t border-green-200 dark:border-green-800/30"
    >
      <div className="flex items-center justify-center gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-green-700 dark:text-green-400">
            Excellent work! You've completed today's goals!
          </p>
          <p className="text-sm text-green-600/70 dark:text-green-400/70">
            {completedMinutes} minutes of focused practice
          </p>
        </div>
      </div>
    </motion.div>
  )
}
