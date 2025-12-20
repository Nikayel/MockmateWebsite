'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, Target, Sparkles, Trophy, AlertTriangle, Clock, RefreshCw, PartyPopper, Calendar, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

import { Header } from '@/components/header'
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
import { cn } from '@/lib/utils'

export default function RoadmapPage() {
  const router = useRouter()
  const roadmap = useActiveRoadmap()
  const {
    selectedDayIndex,
    selectDay,
    markQuestionCompleted,
    markQuestionSkipped,
    setActiveRoadmap,
  } = useRoadmapStore()
  const [isInternBannerExpanded, setIsInternBannerExpanded] = useState(false)

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

  // Check for edge cases
  const interviewDate = new Date(roadmap.interviewDate)
  const now = new Date()
  const daysRemaining = Math.ceil((interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysRemaining < 0
  const isCompleted = roadmap.questionsCompleted === roadmap.totalQuestions && roadmap.totalQuestions > 0
  const isIntern = roadmap.assessment?.experienceLevel === 'intern'
  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)

  // Roadmap is expired - show expired state
  if (isExpired) {
    return <ExpiredState roadmap={roadmap} onCreateNew={() => router.push('/roadmap/new')} onArchive={() => setActiveRoadmap(null)} />
  }

  // Roadmap is completed - show completion celebration
  if (isCompleted) {
    return <CompletedState roadmap={roadmap} onCreateNew={() => router.push('/roadmap/new')} onReviewAgain={() => {}} />
  }

  const companyData = getCompanyById(roadmap.targetCompany)
  const selectedPlan = roadmap.dailyPlans[selectedDayIndex]
  const recommendations = getStudyRecommendations(roadmap)
  const topPatterns = companyData?.topPatterns.map((p) => p.pattern) || []

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 pt-24 space-y-4 md:space-y-6">
        {/* Top section: Header info on left, Pattern Coverage & Milestones on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left column - Header sections and Today's Focus */}
          <div className="lg:col-span-2 space-y-4">
            {/* Intern-specific banner - Collapsible */}
            {isIntern && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-lg overflow-hidden max-w-2xl"
              >
                <button
                  onClick={() => setIsInternBannerExpanded(!isInternBannerExpanded)}
                  className="w-full flex items-center justify-between p-2 hover:bg-blue-500/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shrink-0">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-xs text-foreground">Internship Interview Track</p>
                      {!isInternBannerExpanded && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Your plan focuses on foundational patterns and easier problems
                        </p>
                      )}
                    </div>
                  </div>
                  {isInternBannerExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {isInternBannerExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-blue-500/20"
                    >
                      <div className="p-2 pt-1.5">
                        <p className="text-xs text-muted-foreground">
                          Your plan focuses on foundational patterns and easier problems. Master the basics first!
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Near expiration warning */}
            {daysRemaining <= 3 && daysRemaining >= 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {daysRemaining === 0 ? 'Interview Day!' : `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left!`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {daysRemaining === 0
                        ? 'Focus on reviewing what you know. You\'ve got this!'
                        : 'Focus on your weakest patterns and must-know questions.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Roadmap header with progress */}
            <div className="max-w-2xl">
              <RoadmapHeader roadmap={roadmap} />
            </div>

            {/* Recommendations alert */}
            {recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-lg p-2 max-w-2xl"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs text-foreground">Study Tips</p>
                    <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      {recommendations.slice(0, 2).map((rec, i) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Today's Focus - Moved up */}
            {selectedPlan && (
              <TodaysFocus
                plan={selectedPlan}
                onStartQuestion={handleStartQuestion}
                onSkipQuestion={handleSkipQuestion}
                onMarkComplete={handleMarkComplete}
              />
            )}
          </div>

          {/* Right column - Pattern coverage & Milestones */}
          <div className="space-y-4 md:space-y-6">
            <PatternCoverage
              roadmap={roadmap}
              companyTopPatterns={topPatterns}
            />

            {/* Milestones */}
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
                <CompanyInterviewGuide company={companyData} isIntern={isIntern} />
              </div>
            )}
          </div>
        </div>

        {/* Weekly calendar */}
        <WeeklyCalendar
          dailyPlans={roadmap.dailyPlans}
          selectedDayIndex={selectedDayIndex}
          onSelectDay={selectDay}
        />

        {/* Company Interview Guide - Full width on mobile */}
        {companyData && (
          <div className="block lg:hidden">
            <CompanyInterviewGuide company={companyData} isIntern={isIntern} />
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-24">
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
    </div>
  )
}

// Expired roadmap state - interview date has passed
function ExpiredState({
  roadmap,
  onCreateNew,
  onArchive,
}: {
  roadmap: any
  onCreateNew: () => void
  onArchive: () => void
}) {
  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)
  const interviewDate = new Date(roadmap.interviewDate)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg mx-auto px-4"
        >
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Roadmap Expired
          </h1>
          <p className="text-muted-foreground mb-6">
            Your interview date for <span className="font-medium text-foreground">{roadmap.companyName}</span> was on{' '}
            <span className="font-medium text-foreground">
              {interviewDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </p>

          {/* Progress summary */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-4 text-foreground">Your Progress Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{progress}%</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{roadmap.questionsCompleted}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{Math.round(roadmap.actualHoursSpent)}h</p>
                <p className="text-xs text-muted-foreground">Studied</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onCreateNew}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
              Create New Roadmap
            </button>
            <button
              onClick={onArchive}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
            >
              Archive & Clear
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            How did your interview go? Create a new roadmap for your next target!
          </p>
        </motion.div>
      </div>
    </div>
  )
}

// Completed roadmap state - all questions done
function CompletedState({
  roadmap,
  onCreateNew,
  onReviewAgain,
}: {
  roadmap: any
  onCreateNew: () => void
  onReviewAgain: () => void
}) {
  const interviewDate = new Date(roadmap.interviewDate)
  const now = new Date()
  const daysUntil = Math.ceil((interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg mx-auto px-4"
        >
          {/* Celebration animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25"
          >
            <PartyPopper className="h-12 w-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-foreground mb-2"
          >
            Congratulations!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-6"
          >
            You've completed your entire {roadmap.companyName} interview prep roadmap!
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6 mb-6"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{roadmap.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Questions Solved</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{Math.round(roadmap.actualHoursSpent)}h</p>
                <p className="text-xs text-muted-foreground">Total Practice</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{roadmap.patternCoverage?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Patterns Mastered</p>
              </div>
            </div>
          </motion.div>

          {/* Interview countdown */}
          {daysUntil > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-card border border-border rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  <span className="font-semibold text-foreground">{daysUntil} days</span>
                  <span className="text-muted-foreground"> until your interview</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use this time to review weak areas and practice mock interviews!
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              href="/interview"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Trophy className="h-5 w-5" />
              Practice Mock Interview
            </Link>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
              New Roadmap
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
