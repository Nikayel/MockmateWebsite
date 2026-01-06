'use client'

import { motion } from 'framer-motion'

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  label: string
  sublabel?: string
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  const getColor = () => {
    if (value >= 70) return 'text-green-500'
    if (value >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={getColor()}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}%</span>
        <span className="text-xs text-gray-500">{label}</span>
        {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
      </div>
    </div>
  )
}
