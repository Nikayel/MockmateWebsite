'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, Target, Sparkles, Trophy, AlertTriangle, Clock, RefreshCw, PartyPopper, Calendar, ArrowRight, ChevronDown, ChevronUp, Archive, CheckCircle2, XCircle, Play, Flame, BarChart3, Info, Zap, Crown } from 'lucide-react'
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

/**
 * Roadmap Page - Cognitive Load Optimized
 *
 * Design Principles Applied:
 * 1. Miller's Law: Max 7±2 chunks visible at once
 * 2. Progressive Disclosure: Details on demand via tabs
 * 3. Single Primary Action: "Start Next Problem" always prominent
 * 4. F-Pattern: Key info top-left, action top-right
 * 5. Gestalt Grouping: Related items visually clustered
 */

// Tab-based view to reduce cognitive load
type RoadmapTab = 'today' | 'schedule' | 'progress' | 'guide'

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
  const [activeTab, setActiveTab] = useState<RoadmapTab>('today')
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(true)
  const [allRoadmaps, setAllRoadmaps] = useState<any[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [showTips, setShowTips] = useState(false)

  // Get today's plan
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayIndex = roadmap?.dailyPlans.findIndex((plan) => {
    const planDate = new Date(plan.date)
    planDate.setHours(0, 0, 0, 0)
    return planDate.getTime() === today.getTime()
  }) ?? 0

  // Load roadmaps from Firebase on mount
  // IMPORTANT: Clear stale roadmap first to prevent cross-user data leaks
  useEffect(() => {
    if (!initialized) return

    const loadRoadmaps = async () => {
      if (!user?.id) {
        // No user - clear any stale roadmap data
        setActiveRoadmap(null)
        setIsLoadingRoadmap(false)
        return
      }

      // Clear existing roadmap before loading to prevent showing stale data
      setActiveRoadmap(null)

      try {
        // Load active roadmap from Firebase (source of truth)
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

    return <EmptyState onCreateNew={() => router.push('/roadmap/new')} />
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
  const todayPlan = roadmap.dailyPlans[todayIndex >= 0 ? todayIndex : 0]
  const recommendations = getStudyRecommendations(roadmap)
  const topPatterns = companyData?.topPatterns.map((p) => p.pattern) || []

  // Get first pending question for primary CTA
  const nextQuestion = todayPlan?.questions.find(q => q.status === 'pending' || q.status === 'in_progress')
  const todayCompleted = todayPlan?.questions.filter(q => q.status === 'completed').length || 0
  const todayTotal = todayPlan?.questions.length || 0

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 pt-24 max-w-4xl">
        {showArchived ? (
          <RoadmapListView
            roadmaps={allRoadmaps}
            onCreateNew={() => router.push('/roadmap/new')}
            onClose={() => setShowArchived(false)}
          />
        ) : (
          <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════════
                HERO SECTION: Single Clear Focus (Cognitive Load Principle #1)
                - One primary action visible
                - Key metrics at a glance (max 4 items)
                - F-pattern: Company left, CTA right
            ═══════════════════════════════════════════════════════════════ */}
            <section className="relative">
              {/* Urgent warning - only when critical (≤3 days) */}
              {daysRemaining <= 3 && daysRemaining >= 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 flex items-center gap-3"
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    {daysRemaining === 0 ? 'Interview Day! Focus on confidence.' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
                  </span>
                </motion.div>
              )}

              {/* Main Hero Card */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Top Bar: Company + Days Remaining */}
                <div className="px-5 py-4 border-b border-border bg-accent/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-foreground">{roadmap.companyName}</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{daysRemaining} days remaining</span>
                          {isIntern && (
                            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-[10px] font-medium">
                              Intern Track
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats - Max 3 for cognitive load */}
                    <div className="hidden sm:flex items-center gap-4">
                      <QuickStat
                        value={`${progress}%`}
                        label="complete"
                        color={progress >= 75 ? 'green' : progress >= 50 ? 'blue' : 'orange'}
                      />
                      <QuickStat
                        value={`${roadmap.questionsCompleted}/${roadmap.totalQuestions}`}
                        label="solved"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Action Area: What to do NOW */}
                <div className="p-5">
                  {nextQuestion ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          <span>Today's Focus • {todayCompleted}/{todayTotal} done</span>
                        </div>
                        <h2 className="text-base font-semibold text-foreground mb-1">
                          {nextQuestion.title}
                        </h2>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded font-medium",
                            nextQuestion.difficulty === 'easy' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                            nextQuestion.difficulty === 'medium' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                            nextQuestion.difficulty === 'hard' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {nextQuestion.difficulty}
                          </span>
                          <span className="text-muted-foreground">{nextQuestion.pattern.replace(/-/g, ' ')}</span>
                          <span className="text-muted-foreground">• {nextQuestion.estimatedMinutes} min</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartQuestion(nextQuestion.scenarioId)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                      >
                        <Play className="h-4 w-4" />
                        Start Problem
                      </button>
                    </div>
                  ) : todayTotal > 0 && todayCompleted === todayTotal ? (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="font-semibold text-green-600 dark:text-green-400">Today complete!</p>
                        <p className="text-xs text-muted-foreground">Great work on your interview prep</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-muted-foreground">
                      <p>Select a day from the schedule to view problems</p>
                    </div>
                  )}
                </div>

                {/* Tips Toggle - Collapsed by default */}
                {recommendations.length > 0 && (
                  <div className="border-t border-border">
                    <button
                      onClick={() => setShowTips(!showTips)}
                      className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-primary" />
                        Study tips available
                      </span>
                      {showTips ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <AnimatePresence>
                      {showTips && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 text-xs text-muted-foreground space-y-1">
                            {recommendations.slice(0, 2).map((rec, i) => (
                              <p key={i}>• {rec}</p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TAB NAVIGATION: Progressive Disclosure (Principle #2)
                - Reduces simultaneous information
                - User controls what they see
                - Max 4 tabs (Miller's Law)
            ═══════════════════════════════════════════════════════════════ */}
            <nav className="flex items-center gap-1 bg-muted/50 rounded-lg p-1" role="tablist">
              <TabButton
                active={activeTab === 'today'}
                onClick={() => setActiveTab('today')}
                icon={<Flame className="h-4 w-4" />}
                label="Today"
              />
              <TabButton
                active={activeTab === 'schedule'}
                onClick={() => setActiveTab('schedule')}
                icon={<Calendar className="h-4 w-4" />}
                label="Schedule"
              />
              <TabButton
                active={activeTab === 'progress'}
                onClick={() => setActiveTab('progress')}
                icon={<BarChart3 className="h-4 w-4" />}
                label="Progress"
              />
              {companyData && (
                <TabButton
                  active={activeTab === 'guide'}
                  onClick={() => setActiveTab('guide')}
                  icon={<Info className="h-4 w-4" />}
                  label="Guide"
                />
              )}
            </nav>

            {/* ═══════════════════════════════════════════════════════════════
                TAB CONTENT: One view at a time (Principle #3)
            ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'today' && selectedPlan && (
                  <TodaysFocus
                    plan={selectedPlan}
                    onStartQuestion={handleStartQuestion}
                    onSkipQuestion={handleSkipQuestion}
                    onMarkComplete={handleMarkComplete}
                  />
                )}

                {activeTab === 'schedule' && (
                  <div className="space-y-4">
                    <WeeklyCalendar
                      dailyPlans={roadmap.dailyPlans}
                      selectedDayIndex={selectedDayIndex}
                      onSelectDay={(index) => {
                        selectDay(index)
                        setActiveTab('today')
                      }}
                    />
                    {/* Milestones - compact in schedule view */}
                    <div className="bg-card border border-border rounded-xl p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Milestones
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {roadmap.milestones.slice(0, 3).map((milestone) => (
                          <div
                            key={milestone.id}
                            className={cn(
                              "p-2.5 rounded-lg border text-center",
                              milestone.isCompleted
                                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/30"
                                : "bg-muted/50 border-border"
                            )}
                          >
                            <p className="font-medium text-xs truncate">{milestone.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(milestone.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'progress' && (
                  <div className="space-y-4">
                    <RoadmapHeader roadmap={roadmap} />
                    <PatternCoverage roadmap={roadmap} companyTopPatterns={topPatterns} />
                  </div>
                )}

                {activeTab === 'guide' && companyData && (
                  <CompanyInterviewGuide company={companyData} isIntern={isIntern} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Archived roadmaps link - minimal, bottom */}
            {allRoadmaps.filter(r => r.status !== 'active').length > 0 && (
              <div className="pt-4 border-t border-border text-center">
                <button
                  onClick={() => setShowArchived(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Archive className="inline h-3 w-3 mr-1" />
                  View archived roadmaps ({allRoadmaps.filter(r => r.status !== 'active').length})
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS - Extracted for clarity
// ═══════════════════════════════════════════════════════════════════════════

function QuickStat({ value, label, color = 'default' }: { value: string; label: string; color?: 'green' | 'blue' | 'orange' | 'default' }) {
  return (
    <div className="text-center">
      <p className={cn(
        "text-lg font-bold",
        color === 'green' && "text-green-600",
        color === 'blue' && "text-primary",
        color === 'orange' && "text-orange-500",
        color === 'default' && "text-foreground"
      )}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
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

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  const { user, firebaseUser, initialized } = useAuth()
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check user's subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!initialized || !user?.id || !firebaseUser) {
        setIsLoading(false)
        return
      }

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch('/api/user/subscription-status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setIsPro(data.tier === 'pro' || data.tier === 'enterprise')
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSubscription()
  }, [user?.id, firebaseUser, initialized])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-24">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Pro user - show create roadmap CTA
  if (isPro) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-24">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Create Your Interview Roadmap
            </h1>
            <p className="text-muted-foreground mb-8">
              Get a personalized AI-powered study plan tailored to your target company, interview date, and skill gaps.
              Includes spaced repetition scheduling and pattern mastery tracking.
            </p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Roadmap
            </button>

            <div className="mt-12 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">20+</p>
                <p className="text-xs text-muted-foreground">Companies</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">200+</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">15</p>
                <p className="text-xs text-muted-foreground">Patterns</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl text-left">
              <h3 className="font-semibold text-foreground text-sm mb-2">Your roadmap will include:</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Custom study plan for your interview date
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Spaced repetition for long-term retention
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Pattern mastery tracking across 15 DSA patterns
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Company-specific interview tips
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Free user - show upgrade prompt
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-24">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full text-xs font-semibold mb-4">
            <Crown className="h-3.5 w-3.5" />
            Pro Feature
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Personalized Interview Roadmaps
          </h1>
          <p className="text-muted-foreground mb-8">
            Get AI-powered study plans tailored to your target company, interview date, and skill gaps.
            Includes spaced repetition scheduling and pattern mastery tracking.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
          >
            <Crown className="h-5 w-5" />
            Upgrade to Pro
          </Link>

          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">20+</p>
              <p className="text-xs text-muted-foreground">Companies</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">200+</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">15</p>
              <p className="text-xs text-muted-foreground">Patterns</p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-xl text-left">
            <h3 className="font-semibold text-foreground text-sm mb-2">What you'll get with Pro:</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Custom study plan for your interview date
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Spaced repetition for long-term retention
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Pattern mastery tracking across 15 DSA patterns
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Company-specific interview tips
              </li>
            </ul>
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
