'use client'

import { AlertTriangle, Zap } from 'lucide-react'
import type { DSAPattern } from '@/lib/types/dsa-patterns'
import type { SkillInsightsData } from '@/lib/hooks/useSkillInsights'

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

// Skill decay warning
interface SkillDecayWarningProps {
  decayItems: SkillInsightsData['skillDecay']
}

export function SkillDecayWarning({ decayItems }: SkillDecayWarningProps) {
  if (decayItems.length === 0) return null

  return (
    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h4 className="font-medium text-gray-900 dark:text-white">Skills Fading</h4>
      </div>
      <div className="space-y-2">
        {decayItems.slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              {patternNames[item.pattern] || item.pattern}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{item.daysSincePractice}d ago</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                item.urgency === 'high' ? 'bg-red-100 text-red-700' :
                item.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                -{item.decayPercent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Misconception alert
interface MisconceptionAlertProps {
  misconceptions: SkillInsightsData['misconceptions']
}

export function MisconceptionAlert({ misconceptions }: MisconceptionAlertProps) {
  if (misconceptions.length === 0) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-amber-500" />
        <h4 className="font-medium text-gray-900 dark:text-white">Common Mistakes</h4>
      </div>
      <div className="space-y-3">
        {misconceptions.slice(0, 2).map((m, i) => (
          <div key={i} className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {m.type.replace(/-/g, ' ')}
              </span>
              <span className="text-xs text-gray-500">({m.frequency}x)</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-xs">{m.suggestedFix}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
