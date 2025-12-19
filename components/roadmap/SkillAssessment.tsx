'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Zap, Book, Target, Clock } from 'lucide-react'
import { DSAPattern, PATTERN_METADATA } from '@/lib/types/dsa-patterns'
import { cn } from '@/lib/utils'

interface SkillAssessmentProps {
  onComplete: (assessment: AssessmentResult) => void
  onBack?: () => void
}

export interface AssessmentResult {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  problemsSolved: number
  hoursPerDay: number
  patternFamiliarity: { pattern: DSAPattern; level: 'unknown' | 'seen' | 'practiced' | 'confident' }[]
}

type Step = 'experience' | 'problems' | 'hours' | 'patterns'

const CORE_PATTERNS: DSAPattern[] = [
  'arrays-hashing',
  'two-pointers',
  'sliding-window',
  'binary-search',
  'trees',
  'bfs',
  'dp-1d',
  'heap',
]

export function SkillAssessment({ onComplete, onBack }: SkillAssessmentProps) {
  const [step, setStep] = useState<Step>('experience')
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null)
  const [problemsSolved, setProblemsSolved] = useState<number>(0)
  const [hoursPerDay, setHoursPerDay] = useState<number>(2)
  const [patternFamiliarity, setPatternFamiliarity] = useState<
    Record<DSAPattern, 'unknown' | 'seen' | 'practiced' | 'confident'>
  >({} as Record<DSAPattern, 'unknown' | 'seen' | 'practiced' | 'confident'>)

  const steps: Step[] = ['experience', 'problems', 'hours', 'patterns']
  const currentStepIndex = steps.indexOf(step)

  const canContinue = () => {
    switch (step) {
      case 'experience':
        return experienceLevel !== null
      case 'problems':
        return true // Always can continue, default 0
      case 'hours':
        return hoursPerDay >= 0.5
      case 'patterns':
        return Object.keys(patternFamiliarity).length >= 4
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step === 'patterns') {
      onComplete({
        experienceLevel: experienceLevel!,
        problemsSolved,
        hoursPerDay,
        patternFamiliarity: Object.entries(patternFamiliarity).map(([pattern, level]) => ({
          pattern: pattern as DSAPattern,
          level,
        })),
      })
    } else {
      const nextIndex = currentStepIndex + 1
      if (nextIndex < steps.length) {
        setStep(steps[nextIndex])
      }
    }
  }

  const handleBack = () => {
    if (currentStepIndex === 0) {
      onBack?.()
    } else {
      setStep(steps[currentStepIndex - 1])
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              'h-2 rounded-full transition-all',
              i <= currentStepIndex ? 'bg-primary w-8' : 'bg-muted w-4'
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 'experience' && (
            <ExperienceStep
              selected={experienceLevel}
              onSelect={setExperienceLevel}
            />
          )}
          {step === 'problems' && (
            <ProblemsSolvedStep
              value={problemsSolved}
              onChange={setProblemsSolved}
            />
          )}
          {step === 'hours' && (
            <HoursPerDayStep
              value={hoursPerDay}
              onChange={setHoursPerDay}
            />
          )}
          {step === 'patterns' && (
            <PatternFamiliarityStep
              familiarity={patternFamiliarity}
              onChange={(pattern, level) =>
                setPatternFamiliarity((prev) => ({ ...prev, [pattern]: level }))
              }
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canContinue()}
          className={cn(
            'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors',
            canContinue()
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {step === 'patterns' ? 'Generate Roadmap' : 'Continue'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function ExperienceStep({
  selected,
  onSelect,
}: {
  selected: 'beginner' | 'intermediate' | 'advanced' | null
  onSelect: (level: 'beginner' | 'intermediate' | 'advanced') => void
}) {
  const options = [
    {
      level: 'beginner' as const,
      icon: Book,
      title: 'Beginner',
      description: 'New to DSA or solved < 50 problems',
      detail: 'Learning fundamentals, need more practice time',
    },
    {
      level: 'intermediate' as const,
      icon: Target,
      title: 'Intermediate',
      description: 'Solved 50-150 problems',
      detail: 'Know common patterns, working on optimization',
    },
    {
      level: 'advanced' as const,
      icon: Zap,
      title: 'Advanced',
      description: 'Solved 150+ problems',
      detail: 'Strong foundations, focusing on hard problems',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">What's Your Experience Level?</h2>
        <p className="mt-2 text-muted-foreground">
          This helps us calibrate problem difficulty and pacing
        </p>
      </div>

      <div className="grid gap-4">
        {options.map((option) => {
          const Icon = option.icon
          const isSelected = selected === option.level

          return (
            <button
              key={option.level}
              onClick={() => onSelect(option.level)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all hover:shadow-md',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{option.title}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{option.detail}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProblemsSolvedStep({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const presets = [0, 25, 50, 100, 200, 300]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">How Many Problems Have You Solved?</h2>
        <p className="mt-2 text-muted-foreground">
          Approximate LeetCode / HackerRank problems solved
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              value === preset
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {preset === 0 ? '< 10' : preset === 300 ? '300+' : preset}
          </button>
        ))}
      </div>

      <div className="text-center">
        <input
          type="range"
          min={0}
          max={500}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full max-w-md"
        />
        <p className="mt-2 text-lg font-semibold">{value} problems</p>
      </div>
    </div>
  )
}

function HoursPerDayStep({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const presets = [
    { hours: 1, label: '1 hour', description: 'Light practice' },
    { hours: 2, label: '2 hours', description: 'Recommended' },
    { hours: 3, label: '3 hours', description: 'Intensive' },
    { hours: 4, label: '4+ hours', description: 'Full-time prep' },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">How Much Time Can You Study Daily?</h2>
        <p className="mt-2 text-muted-foreground">
          We'll adjust your roadmap to fit your schedule
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {presets.map((preset) => (
          <button
            key={preset.hours}
            onClick={() => onChange(preset.hours)}
            className={cn(
              'p-4 rounded-xl border-2 text-center transition-all',
              value === preset.hours
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="font-semibold">{preset.label}</p>
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function PatternFamiliarityStep({
  familiarity,
  onChange,
}: {
  familiarity: Record<DSAPattern, 'unknown' | 'seen' | 'practiced' | 'confident'>
  onChange: (pattern: DSAPattern, level: 'unknown' | 'seen' | 'practiced' | 'confident') => void
}) {
  const levels = [
    { level: 'unknown' as const, label: 'New', color: 'bg-gray-200 text-gray-700' },
    { level: 'seen' as const, label: 'Seen', color: 'bg-yellow-100 text-yellow-700' },
    { level: 'practiced' as const, label: 'Practiced', color: 'bg-blue-100 text-blue-700' },
    { level: 'confident' as const, label: 'Confident', color: 'bg-green-100 text-green-700' },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Rate Your Pattern Knowledge</h2>
        <p className="mt-2 text-muted-foreground">
          How comfortable are you with these core patterns?
        </p>
      </div>

      <div className="space-y-3">
        {CORE_PATTERNS.map((pattern) => {
          const metadata = PATTERN_METADATA[pattern]
          const currentLevel = familiarity[pattern]

          return (
            <div
              key={pattern}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div>
                <p className="font-medium">{metadata?.name || pattern}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {metadata?.description || ''}
                </p>
              </div>
              <div className="flex gap-1">
                {levels.map((l) => (
                  <button
                    key={l.level}
                    onClick={() => onChange(pattern, l.level)}
                    className={cn(
                      'px-2 py-1 text-xs rounded transition-all',
                      currentLevel === l.level
                        ? l.color + ' ring-2 ring-offset-1 ring-current'
                        : 'bg-muted text-muted-foreground hover:opacity-80'
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Rate at least 4 patterns to continue
      </p>
    </div>
  )
}
