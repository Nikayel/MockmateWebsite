'use client'

import { Brain } from 'lucide-react'
import type { SkillInsightsData } from '@/lib/hooks/useSkillInsights'

interface CognitiveProfileProps {
  cognitive: SkillInsightsData['cognitive']
}

export function CognitiveProfile({ cognitive }: CognitiveProfileProps) {
  const traits = [
    { label: 'Learning Style', value: cognitive.learningStyle.primary, icon: '📚' },
    { label: 'Problem Solving', value: cognitive.problemSolvingApproach, icon: '🧠' },
    { label: 'Pattern Speed', value: cognitive.patternRecognitionSpeed, icon: '⚡' },
    { label: 'Complexity', value: cognitive.complexityTolerance, icon: '🎯' },
  ]

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-500" />
        <h4 className="font-medium text-gray-900 dark:text-white">Your Learning Profile</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {traits.map((trait, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <span>{trait.icon}</span>
              <span className="text-xs text-gray-500">{trait.label}</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
              {trait.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
