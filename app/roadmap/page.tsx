'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, BookOpen, Target, Sparkles } from 'lucide-react'
import Link from 'next/link'

import {
  RoadmapHeader,
  TodaysFocus,
  PatternCoverage,
  WeeklyCalendar,
  CompanyInterviewGuide,
} from '@/components/roadmap'
import { useRoadmapStore, useActiveRoadmap } from '@/lib/stores/roadmap-store'
import { getCompanyById } from '@/lib/data/company-questions'
import { getStudyRecommendations } from '@/lib/roadmap/prioritization-algorithm'

export default function RoadmapPage() {
  const router = useRouter()
  const roadmap = useActiveRoadmap()
  const {
    selectedDayIndex,
    selectDay,
    markQuestionCompleted,
    markQuestionSkipped,
  } = useRoadmapStore()

  // Get today's plan
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayIndex = roadmap?.dailyPlans.findIndex((plan) => {
    const planDate = new Date(plan.date)
    planDate.setHours(0, 0, 0, 0)
    return planDate.getTime() === today.getTime()
  }) ?? 0

  // Set selected day to today on initial mount only
  useEffect(() => {
    if (roadmap && todayIndex >= 0) {
      // Only auto-select today on first load, not on every change
      selectDay(todayIndex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap?.id]) // Only run when roadmap changes, not on every selectedDayIndex change

  const handleStartQuestion = (scenarioId: string) => {
    // Navigate to interview with this scenario
    router.push(`/interview?scenario=${scenarioId}&roadmap=true`)
  }

  const handleSkipQuestion = (scenarioId: string) => {
    markQuestionSkipped(scenarioId)
  }

  const handleMarkComplete = (scenarioId: string) => {
    markQuestionCompleted(scenarioId)
  }

  // No active roadmap - show empty state
  if (!roadmap) {
    return <EmptyState />
  }

  const companyData = getCompanyById(roadmap.targetCompany)
  const selectedPlan = roadmap.dailyPlans[selectedDayIndex]
  const recommendations = getStudyRecommendations(roadmap)
  const topPatterns = companyData?.topPatterns.map((p) => p.pattern) || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            MockMate
          </Link>
          <Link
            href="/roadmap/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Roadmap
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Roadmap header with progress */}
        <RoadmapHeader roadmap={roadmap} />

        {/* Recommendations alert */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Study Tips</p>
                <ul className="mt-1 text-sm text-muted-foreground space-y-1">
                  {recommendations.slice(0, 2).map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main content grid - Responsive layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left column - Today's focus */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6 order-2 lg:order-1">
            {selectedPlan && (
              <TodaysFocus
                plan={selectedPlan}
                onStartQuestion={handleStartQuestion}
                onSkipQuestion={handleSkipQuestion}
                onMarkComplete={handleMarkComplete}
              />
            )}

            {/* Weekly calendar */}
            <WeeklyCalendar
              dailyPlans={roadmap.dailyPlans}
              selectedDayIndex={selectedDayIndex}
              onSelectDay={selectDay}
            />

            {/* Company Interview Guide - Full width on mobile, in left column on desktop */}
            {companyData && (
              <div className="block lg:hidden">
                <CompanyInterviewGuide company={companyData} />
              </div>
            )}
          </div>

          {/* Right column - Pattern coverage & Interview Guide */}
          <div className="space-y-4 md:space-y-6 order-1 lg:order-2">
            <PatternCoverage
              roadmap={roadmap}
              companyTopPatterns={topPatterns}
            />

            {/* Milestones - Collapsible on mobile */}
            <div className="bg-card border border-border rounded-xl p-4 md:p-6">
              <h3 className="font-semibold mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                <Target className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Milestones
              </h3>
              <div className="space-y-2 md:space-y-3">
                {roadmap.milestones.slice(0, 3).map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`p-2 md:p-3 rounded-lg border ${
                      milestone.isCompleted
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/30'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <p className="font-medium text-xs md:text-sm">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(milestone.targetDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Company Interview Guide - Only on desktop sidebar */}
            {companyData && (
              <div className="hidden lg:block">
                <CompanyInterviewGuide company={companyData} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Create Your Interview Roadmap
        </h1>
        <p className="text-muted-foreground mb-8">
          Get a personalized study plan based on your target company, interview date, and current skill level.
        </p>
        <Link
          href="/roadmap/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Roadmap
        </Link>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">20+</p>
            <p className="text-xs text-muted-foreground">Companies</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">168</p>
            <p className="text-xs text-muted-foreground">Questions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">31</p>
            <p className="text-xs text-muted-foreground">Patterns</p>
          </div>
        </div>
      </div>
    </div>
  )
}
