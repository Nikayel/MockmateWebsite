'use client'

/**
 * Admin User Profile Drawer
 *
 * A slide-out drawer showing comprehensive user profile data for admins.
 * Displays cognitive profile, skill insights, misconceptions, and interview readiness.
 */

import { useState, useEffect } from 'react'
import { X, Brain, Target, AlertTriangle, TrendingUp, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface UserProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
  token: string | null
}

interface ProfileData {
  user: {
    id: string
    email: string
    fullName?: string
    subscriptionTier: string
    subscriptionStatus?: string
    createdAt: string
    onboardingCompleted?: boolean
  }
  enhancedProfile: {
    cognitive: {
      learningStyle: { primary: string; secondary: string; confidence: number }
      problemSolvingApproach: { style: string; planningTendency: string }
      patternRecognition: { speed: string; accuracy: number; transferAbility: number }
      workingMemory: { complexityTolerance: string; averageVariablesTracked: number }
    }
    behavioral: {
      studyHabits: { preferredDays: string[]; optimalHours: string[] }
      sessionMetrics: { averageDuration: number; completionRate: number }
      engagementSignals: { hintUsage: string; struggleIndicators: any[] }
    }
    interviewReadiness: {
      overall: number
      companySpecific: Record<string, number>
      estimatedPrepDays: number
    }
    insights: Array<{ type: string; icon: string; title: string; description: string }>
  }
  insights: Array<{ type: string; icon: string; title: string; description: string; actionable: boolean }>
  interviewReadiness: { overall: number; byPattern: Record<string, number>; estimatedPrepDays: number }
  misconceptions: {
    total: number
    resolved: number
    active: number
    totalOccurrences: number
    byPattern: Record<string, number>
    byType: Record<string, number>
    topMisconceptions: Array<{ type: string; pattern: string; occurrences: number; resolved: boolean }>
  }
  recentSessions: Array<{
    id: string
    problemId: string
    problemTitle?: string
    pattern?: string
    difficulty?: string
    performance?: number
    duration?: number
    completed?: boolean
    timestamp: string
  }>
  learningState: {
    currentPattern?: string
    patternsCompleted: string[]
    totalProblemsAttempted: number
    totalProblemsSolved: number
    averagePerformance: number
    studyStreak: number
    lastActive?: string
    patternProgress?: Record<string, number>
  } | null
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#00d9ff]" />
          <span className="font-medium text-white">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 bg-gray-900/50">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatItem({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${color || 'text-white'}`}>{value}</span>
    </div>
  )
}

function ProgressBar({ value, max = 100, color = 'bg-[#00d9ff]' }: { value: number; max?: number; color?: string }) {
  const percentage = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
    </div>
  )
}

export function UserProfileDrawer({ isOpen, onClose, userId, token }: UserProfileDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProfileData | null>(null)

  useEffect(() => {
    if (isOpen && userId && token) {
      loadProfile()
    }
  }, [isOpen, userId, token])

  async function loadProfile() {
    if (!userId || !token) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/user-profile?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to load profile')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-white">User Profile</h2>
              <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d9ff]" />
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
                  <p className="text-red-400">{error}</p>
                  <button onClick={loadProfile} className="text-sm text-[#00d9ff] hover:underline mt-2">
                    Retry
                  </button>
                </div>
              )}

              {data && !loading && (
                <>
                  {/* User Basic Info */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-bold text-white text-lg">{data.user.fullName || 'No Name'}</h3>
                    <p className="text-gray-400 text-sm">{data.user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        data.user.subscriptionTier === 'pro'
                          ? 'bg-yellow-600/20 text-yellow-400'
                          : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        {data.user.subscriptionTier || 'free'}
                      </span>
                      {data.user.onboardingCompleted && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-600/20 text-green-400">
                          Onboarded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interview Readiness */}
                  <Section title="Interview Readiness" icon={Target} defaultOpen>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-400">Overall Readiness</span>
                          <span className="text-lg font-bold text-white">
                            {data.enhancedProfile?.interviewReadiness?.overall || data.interviewReadiness?.overall || 0}%
                          </span>
                        </div>
                        <ProgressBar
                          value={data.enhancedProfile?.interviewReadiness?.overall || data.interviewReadiness?.overall || 0}
                          color={
                            (data.enhancedProfile?.interviewReadiness?.overall || 0) >= 70
                              ? 'bg-green-500'
                              : (data.enhancedProfile?.interviewReadiness?.overall || 0) >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }
                        />
                      </div>
                      <StatItem
                        label="Est. Prep Days Remaining"
                        value={data.enhancedProfile?.interviewReadiness?.estimatedPrepDays || '?'}
                      />
                      {data.interviewReadiness?.byPattern && Object.keys(data.interviewReadiness.byPattern).length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs text-gray-500 uppercase">By Pattern</span>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {Object.entries(data.interviewReadiness.byPattern).slice(0, 6).map(([pattern, score]) => (
                              <div key={pattern} className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 truncate flex-1">{pattern}</span>
                                <span className={`text-xs font-medium ${
                                  (score as number) >= 70 ? 'text-green-400' : (score as number) >= 40 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {score}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* Cognitive Profile */}
                  {data.enhancedProfile?.cognitive && (
                    <Section title="Cognitive Profile" icon={Brain}>
                      <div className="space-y-3">
                        <StatItem
                          label="Learning Style"
                          value={`${data.enhancedProfile.cognitive.learningStyle.primary} (${data.enhancedProfile.cognitive.learningStyle.confidence}%)`}
                        />
                        <StatItem
                          label="Problem Solving"
                          value={data.enhancedProfile.cognitive.problemSolvingApproach.style}
                        />
                        <StatItem
                          label="Planning Tendency"
                          value={data.enhancedProfile.cognitive.problemSolvingApproach.planningTendency}
                        />
                        <StatItem
                          label="Pattern Recognition Speed"
                          value={data.enhancedProfile.cognitive.patternRecognition.speed}
                          color={
                            data.enhancedProfile.cognitive.patternRecognition.speed === 'fast'
                              ? 'text-green-400'
                              : data.enhancedProfile.cognitive.patternRecognition.speed === 'moderate'
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }
                        />
                        <StatItem
                          label="Pattern Accuracy"
                          value={`${data.enhancedProfile.cognitive.patternRecognition.accuracy}%`}
                        />
                        <StatItem
                          label="Transfer Ability"
                          value={`${data.enhancedProfile.cognitive.patternRecognition.transferAbility}%`}
                        />
                        <StatItem
                          label="Complexity Tolerance"
                          value={data.enhancedProfile.cognitive.workingMemory.complexityTolerance}
                        />
                      </div>
                    </Section>
                  )}

                  {/* Misconceptions */}
                  {data.misconceptions && (
                    <Section title="Misconceptions" icon={AlertTriangle} defaultOpen={data.misconceptions.active > 0}>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-gray-800 rounded p-2 text-center">
                            <div className="text-lg font-bold text-white">{data.misconceptions.total}</div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                          <div className="bg-red-900/20 rounded p-2 text-center">
                            <div className="text-lg font-bold text-red-400">{data.misconceptions.active}</div>
                            <div className="text-xs text-gray-500">Active</div>
                          </div>
                          <div className="bg-green-900/20 rounded p-2 text-center">
                            <div className="text-lg font-bold text-green-400">{data.misconceptions.resolved}</div>
                            <div className="text-xs text-gray-500">Resolved</div>
                          </div>
                        </div>

                        {data.misconceptions.topMisconceptions.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase">Top Issues</span>
                            <div className="space-y-2 mt-2">
                              {data.misconceptions.topMisconceptions.map((m, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-800 rounded p-2">
                                  <div>
                                    <span className="text-sm text-white">{m.type}</span>
                                    <span className="text-xs text-gray-500 ml-2">({m.pattern})</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">{m.occurrences}x</span>
                                    {m.resolved ? (
                                      <span className="text-xs text-green-400">✓</span>
                                    ) : (
                                      <span className="text-xs text-red-400">⚠</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Learning State */}
                  {data.learningState && (
                    <Section title="Learning Progress" icon={TrendingUp}>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-800 rounded p-2 text-center">
                            <div className="text-lg font-bold text-white">{data.learningState.totalProblemsAttempted}</div>
                            <div className="text-xs text-gray-500">Attempted</div>
                          </div>
                          <div className="bg-gray-800 rounded p-2 text-center">
                            <div className="text-lg font-bold text-green-400">{data.learningState.totalProblemsSolved}</div>
                            <div className="text-xs text-gray-500">Solved</div>
                          </div>
                        </div>
                        <StatItem label="Average Performance" value={`${Math.round(data.learningState.averagePerformance)}%`} />
                        <StatItem
                          label="Study Streak"
                          value={`${data.learningState.studyStreak} days`}
                          color={data.learningState.studyStreak >= 7 ? 'text-green-400' : 'text-white'}
                        />
                        <StatItem label="Current Pattern" value={data.learningState.currentPattern || 'None'} />
                        <StatItem
                          label="Patterns Completed"
                          value={data.learningState.patternsCompleted?.length || 0}
                        />
                        {data.learningState.lastActive && (
                          <StatItem
                            label="Last Active"
                            value={new Date(data.learningState.lastActive).toLocaleDateString()}
                          />
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Recent Sessions */}
                  {data.recentSessions && data.recentSessions.length > 0 && (
                    <Section title="Recent Sessions" icon={Clock} defaultOpen={false}>
                      <div className="space-y-2">
                        {data.recentSessions.map((session) => (
                          <div key={session.id} className="flex items-center justify-between bg-gray-800 rounded p-2">
                            <div>
                              <span className="text-sm text-white">{session.problemTitle || session.problemId}</span>
                              <div className="flex gap-2 mt-1">
                                {session.pattern && (
                                  <span className="text-xs text-blue-400">{session.pattern}</span>
                                )}
                                {session.difficulty && (
                                  <span className={`text-xs ${
                                    session.difficulty === 'easy' ? 'text-green-400' :
                                    session.difficulty === 'hard' ? 'text-red-400' : 'text-yellow-400'
                                  }`}>
                                    {session.difficulty}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {session.performance !== undefined && (
                                <span className={`text-sm font-medium ${
                                  session.performance >= 70 ? 'text-green-400' :
                                  session.performance >= 40 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {session.performance}%
                                </span>
                              )}
                              <div className="text-xs text-gray-500">
                                {new Date(session.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* AI Insights */}
                  {data.insights && data.insights.length > 0 && (
                    <Section title="AI Insights" icon={Zap} defaultOpen={false}>
                      <div className="space-y-2">
                        {data.insights.map((insight, i) => (
                          <div key={i} className="bg-gray-800 rounded p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span>{insight.icon}</span>
                              <span className="text-sm font-medium text-white">{insight.title}</span>
                            </div>
                            <p className="text-xs text-gray-400">{insight.description}</p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default UserProfileDrawer
