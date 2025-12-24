'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, Target, Sparkles, Trophy, AlertTriangle, Clock, RefreshCw, PartyPopper, Calendar, ArrowRight, ChevronDown, ChevronUp, Archive, CheckCircle2, XCircle } from 'lucide-react'
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
import { useAuth } from '@/lib/auth-context'

export default function RoadmapPage() {
  const router = useRouter()
  const roadmap = useActiveRoadmap()
  const { user, initialized } = useAuth()
  const {
    selectedDayIndex,
    selectDay,
    markQuestionCompleted,
    markQuestionSkipped,
    setActiveRoadmap,
  } = useRoadmapStore()
  const [isInternBannerExpanded, setIsInternBannerExpanded] = useState(false)
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(true)
  const [allRoadmaps, setAllRoadmaps] = useState<any[]>([])
  const [showArchived, setShowArchived] = useState(false)

  // Get today's plan
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayIndex = roadmap?.dailyPlans.findIndex((plan) => {
    const planDate = new Date(plan.date)
    planDate.setHours(0, 0, 0, 0)
    return planDate.getTime() === today.getTime()
  }) ?? 0

  // Load roadmaps from Firebase on mount
  useEffect(() => {
    if (!initialized) return

    const loadRoadmaps = async () => {
      if (!user?.id) {
        setIsLoadingRoadmap(false)
        return
      }

      try {
        // Load active roadmap
        const activeResponse = await fetch('/api/roadmap')
        if (activeResponse.ok) {
          const activeData = await activeResponse.json()
          if (activeData.roadmap) {
            // Convert date strings back to Date objects for the store
            const roadmap = {
              ...activeData.roadmap,
              interviewDate: new Date(activeData.roadmap.interviewDate),
              createdAt: activeData.roadmap.createdAt ? new Date(activeData.roadmap.createdAt) : new Date(),
              updatedAt: activeData.roadmap.updatedAt ? new Date(activeData.roadmap.updatedAt) : new Date(),
              dailyPlans: activeData.roadmap.dailyPlans?.map((plan: any) => ({
                ...plan,
                date: new Date(plan.date),
                questions: plan.questions?.map((q: any) => ({
                  ...q,
                  completedAt: q.completedAt ? new Date(q.completedAt) : undefined,
                })),
              })) || [],
              milestones: activeData.roadmap.milestones?.map((m: any) => ({
                ...m,
                targetDate: new Date(m.targetDate),
              })) || [],
            }
            setActiveRoadmap(roadmap)
          }
        }

        // Load all roadmaps for the list view
        const allResponse = await fetch('/api/roadmap?all=true')
        if (allResponse.ok) {
          const allData = await allResponse.json()
          if (allData.roadmaps) {
            setAllRoadmaps(allData.roadmaps)
          }
        }
      } catch (error) {
        console.error('Error loading roadmaps:', error)
      } finally {
        setIsLoadingRoadmap(false)
      }
    }

    loadRoadmaps()
  }, [user?.id, initialized, setActiveRoadmap])

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

  // Loading state
  if (!initialized || isLoadingRoadmap) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-24">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your roadmap...</p>
          </div>
        </div>
      </div>
    )
  }

  // No active roadmap - show list of archived roadmaps or empty state
  if (!roadmap) {
    const archivedRoadmaps = allRoadmaps.filter(r => r.status === 'archived' || r.status === 'completed' || r.status === 'abandoned')
    
    if (archivedRoadmaps.length > 0) {
      return <RoadmapListView roadmaps={allRoadmaps} onCreateNew={() => router.push('/roadmap/new')} />
    }
    
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
    return <ExpiredState 
      roadmap={roadmap} 
      onCreateNew={() => router.push('/roadmap/new')} 
      onArchive={async () => {
        // Archive the roadmap
        try {
          await fetch('/api/roadmap', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roadmapId: roadmap.id, status: 'archived' }),
          })
          setActiveRoadmap(null)
          // Reload roadmaps
          const response = await fetch('/api/roadmap?all=true')
          if (response.ok) {
            const data = await response.json()
            if (data.roadmaps) {
              setAllRoadmaps(data.roadmaps)
            }
          }
        } catch (error) {
          console.error('Error archiving roadmap:', error)
        }
      }} 
    />
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
        {/* View archived roadmaps button */}
        {allRoadmaps.filter(r => r.status === 'archived' || r.status === 'completed' || r.status === 'abandoned').length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Archive className="h-4 w-4" />
              {showArchived ? 'Hide' : 'View'} Archived Roadmaps
            </button>
          </div>
        )}

        {showArchived ? (
          <RoadmapListView 
            roadmaps={allRoadmaps} 
            onCreateNew={() => router.push('/roadmap/new')}
            onClose={() => setShowArchived(false)}
          />
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  )
}

// Roadmap List View - Shows all roadmaps (active and archived)
function RoadmapListView({
  roadmaps,
  onCreateNew,
  onClose,
}: {
  roadmaps: any[]
  onCreateNew: () => void
  onClose?: () => void
}) {
  const activeRoadmaps = roadmaps.filter(r => r.status === 'active')
  const archivedRoadmaps = roadmaps.filter(r => r.status === 'archived' || r.status === 'completed' || r.status === 'abandoned')

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pt-24 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Roadmaps</h1>
            <p className="text-muted-foreground mt-1">View and manage all your interview preparation roadmaps</p>
          </div>
          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Close
              </button>
            )}
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Roadmap
            </button>
          </div>
        </div>

        {/* Active Roadmaps */}
        {activeRoadmaps.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Active</h2>
            <div className="grid gap-4">
              {activeRoadmaps.map((roadmap) => (
                <RoadmapCard key={roadmap.id} roadmap={roadmap} />
              ))}
            </div>
          </div>
        )}

        {/* Archived Roadmaps */}
        {archivedRoadmaps.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Archived</h2>
            <div className="grid gap-4">
              {archivedRoadmaps.map((roadmap) => (
                <RoadmapCard key={roadmap.id} roadmap={roadmap} />
              ))}
            </div>
          </div>
        )}

        {roadmaps.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No roadmaps yet</p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Your First Roadmap
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// Roadmap Card Component
function RoadmapCard({ roadmap }: { roadmap: any }) {
  const interviewDate = new Date(roadmap.interviewDate)
  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)
  const companyName = roadmap.companyName || roadmap.targetCompany
  const status = roadmap.status

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <Target className="h-4 w-4 text-primary" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'archived':
        return <Archive className="h-4 w-4 text-muted-foreground" />
      case 'abandoned':
        return <XCircle className="h-4 w-4 text-muted-foreground" />
      default:
        return <BookOpen className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'border-primary/30 bg-primary/5'
      case 'completed':
        return 'border-green-500/30 bg-green-500/5'
      case 'archived':
        return 'border-border bg-muted/30'
      case 'abandoned':
        return 'border-border bg-muted/30'
      default:
        return 'border-border bg-card'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'border rounded-xl p-6 hover:shadow-md transition-all cursor-pointer',
        getStatusColor()
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-foreground">{companyName}</h3>
            <p className="text-sm text-muted-foreground capitalize">{status}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Interview Date</p>
          <p className="text-sm font-medium text-foreground">
            {interviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium text-foreground">{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center pt-2 border-t border-border">
          <div>
            <p className="text-lg font-semibold text-foreground">{roadmap.questionsCompleted}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{roadmap.totalQuestions}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{Math.round(roadmap.actualHoursSpent || 0)}h</p>
            <p className="text-xs text-muted-foreground">Studied</p>
          </div>
        </div>
      </div>
    </motion.div>
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
