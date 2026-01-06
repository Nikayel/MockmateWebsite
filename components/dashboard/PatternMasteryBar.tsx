'use client'

import { motion } from 'framer-motion'
import type { DSAPattern } from '@/lib/types/dsa-patterns'

// Pattern name mapping
const patternNames: Record<string, string> = {
  'arrays-hashing': 'Arrays',
  'two-pointers': 'Two Pointers',
  'sliding-window': 'Sliding Window',
  'stack': 'Stack',
  'binary-search': 'Binary Search',
  'linked-list': 'Linked List',
  'trees': 'Trees',
  'heap': 'Heap',
  'backtracking': 'Backtracking',
  'graphs': 'Graphs',
  'dp-1d': '1D DP',
  'dp-2d': '2D DP',
  'greedy': 'Greedy',
  'intervals': 'Intervals',
  'bit-manipulation': 'Bits',
  'trie': 'Trie',
  'union-find': 'Union Find',
}

interface PatternMasteryBarProps {
  pattern: DSAPattern
  mastery: number
  practiceCount: number
}

export function PatternMasteryBar({
  pattern,
  mastery,
  practiceCount,
}: PatternMasteryBarProps) {
  const getColor = () => {
    if (mastery >= 70) return 'bg-green-500'
    if (mastery >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-gray-600 dark:text-gray-300 truncate">
        {patternNames[pattern] || pattern}
      </span>
      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getColor()} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${mastery}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
      </div>
      <span className="w-12 text-sm text-gray-500 text-right">{mastery}%</span>
    </div>
  )
}
