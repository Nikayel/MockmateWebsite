'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { SkillInsightsData } from '@/lib/hooks/useSkillInsights'

// Stat card component
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sublabel?: string
  color?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = 'text-primary',
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
        </div>
      </div>
    </div>
  )
}

// Insight card component
interface InsightCardProps {
  insight: SkillInsightsData['insights'][0]
}

export function InsightCard({ insight }: InsightCardProps) {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-50 dark:bg-red-900/10',
    medium: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
    low: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border-l-4 rounded-r-lg p-4 ${priorityColors[insight.priority as keyof typeof priorityColors] || priorityColors.low}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{insight.icon}</span>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white">{insight.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{insight.description}</p>
          {insight.action && (
            <button className="text-sm text-primary font-medium mt-2 flex items-center gap-1 hover:underline">
              {insight.action}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
