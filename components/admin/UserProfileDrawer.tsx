"use client"

/**
 * Admin User Profile Drawer
 *
 * A slide-out drawer showing comprehensive user profile data for admins.
 * Displays cognitive profile, skill insights, misconceptions, and interview readiness.
 */

import { useState, useEffect } from "react"
import {
  X,
  Brain,
  Target,
  AlertTriangle,
  TrendingUp,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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
    authOnly?: boolean
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
  insights: Array<{
    type: string
    icon: string
    title: string
    description: string
    actionable: boolean
  }>
  interviewReadiness: {
    overall: number
    byPattern: Record<string, number>
    estimatedPrepDays: number
  }
  misconceptions: {
    total: number
    resolved: number
    active: number
    totalOccurrences: number
    byPattern: Record<string, number>
    byType: Record<string, number>
    topMisconceptions: Array<{
      type: string
      pattern: string
      occurrences: number
      resolved: boolean
    }>
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

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-gray-800 p-3 transition-colors hover:bg-gray-700"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#c4703f]" />
          <span className="font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gray-900/50 p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${color || "text-white"}`}>{value}</span>
    </div>
  )
}

function ProgressBar({
  value,
  max = 100,
  color = "bg-[#c4703f]",
}: {
  value: number
  max?: number
  color?: string
}) {
  const percentage = Math.min((value / max) * 100, 100)
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
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
        throw new Error(err.error || "Failed to load profile")
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || "Failed to load profile")
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
            className="fixed inset-0 z-40 bg-black"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-gray-700 bg-gray-900"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-gray-900 p-4">
              <h2 className="text-lg font-bold text-white">User Profile</h2>
              <button onClick={onClose} className="rounded p-1 hover:bg-gray-700">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 p-4">
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#c4703f]" />
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-600 bg-red-900/30 p-4">
                  <p className="text-red-400">{error}</p>
                  <button
                    onClick={loadProfile}
                    className="mt-2 text-sm text-[#c4703f] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {data && !loading && (
                <>
                  {/* User Basic Info */}
                  <div className="rounded-lg bg-gray-800 p-4">
                    <h3 className="text-lg font-bold text-white">
                      {data.user.fullName || "No Name"}
                    </h3>
                    <p className="text-sm text-gray-400">{data.user.email}</p>
                    {data.user.authOnly && (
                      <p className="mt-2 text-sm text-amber-400/90">
                        Auth-only user (no Firestore profile yet — signed in but hasn&apos;t
                        completed setup)
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          data.user.subscriptionTier === "pro"
                            ? "bg-yellow-600/20 text-yellow-400"
                            : "bg-gray-600/20 text-gray-400"
                        }`}
                      >
                        {data.user.subscriptionTier || "free"}
                      </span>
                      {data.user.onboardingCompleted && (
                        <span className="rounded bg-green-600/20 px-2 py-1 text-xs font-medium text-green-400">
                          Onboarded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interview Readiness - hide for auth-only users */}
                  {!data.user.authOnly && (
                    <Section title="Interview Readiness" icon={Target} defaultOpen>
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 flex justify-between">
                            <span className="text-sm text-gray-400">Overall Readiness</span>
                            <span className="text-lg font-bold text-white">
                              {data.enhancedProfile?.interviewReadiness?.overall ||
                                data.interviewReadiness?.overall ||
                                0}
                              %
                            </span>
                          </div>
                          <ProgressBar
                            value={
                              data.enhancedProfile?.interviewReadiness?.overall ||
                              data.interviewReadiness?.overall ||
                              0
                            }
                            color={
                              (data.enhancedProfile?.interviewReadiness?.overall || 0) >= 70
                                ? "bg-green-500"
                                : (data.enhancedProfile?.interviewReadiness?.overall || 0) >= 40
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }
                          />
                        </div>
                        <StatItem
                          label="Est. Prep Days Remaining"
                          value={data.enhancedProfile?.interviewReadiness?.estimatedPrepDays || "?"}
                        />
                        {data.interviewReadiness?.byPattern &&
                          Object.keys(data.interviewReadiness.byPattern).length > 0 && (
                            <div className="mt-3">
                              <span className="text-xs text-gray-500 uppercase">By Pattern</span>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {Object.entries(data.interviewReadiness.byPattern)
                                  .slice(0, 6)
                                  .map(([pattern, score]) => (
                                    <div key={pattern} className="flex items-center gap-2">
                                      <span className="flex-1 truncate text-xs text-gray-400">
                                        {pattern}
                                      </span>
                                      <span
                                        className={`text-xs font-medium ${
                                          (score as number) >= 70
                                            ? "text-green-400"
                                            : (score as number) >= 40
                                              ? "text-yellow-400"
                                              : "text-red-400"
                                        }`}
                                      >
                                        {score}%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </Section>
                  )}

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
                          value={
                            data.enhancedProfile.cognitive.problemSolvingApproach.planningTendency
                          }
                        />
                        <StatItem
                          label="Pattern Recognition Speed"
                          value={data.enhancedProfile.cognitive.patternRecognition.speed}
                          color={
                            data.enhancedProfile.cognitive.patternRecognition.speed === "fast"
                              ? "text-green-400"
                              : data.enhancedProfile.cognitive.patternRecognition.speed ===
                                  "moderate"
                                ? "text-yellow-400"
                                : "text-red-400"
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

                  {/* Auth-only with no activity: show message */}
                  {data.user.authOnly && !data.recentSessions?.length && !data.learningState && (
                    <div className="rounded-lg bg-gray-800 p-4 text-center text-gray-400">
                      <p>
                        No activity data yet. Cognitive profile and insights will appear once they
                        complete onboarding.
                      </p>
                    </div>
                  )}

                  {/* Misconceptions */}
                  {data.misconceptions && !data.user.authOnly && (
                    <Section
                      title="Misconceptions"
                      icon={AlertTriangle}
                      defaultOpen={data.misconceptions.active > 0}
                    >
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded bg-gray-800 p-2 text-center">
                            <div className="text-lg font-bold text-white">
                              {data.misconceptions.total}
                            </div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                          <div className="rounded bg-red-900/20 p-2 text-center">
                            <div className="text-lg font-bold text-red-400">
                              {data.misconceptions.active}
                            </div>
                            <div className="text-xs text-gray-500">Active</div>
                          </div>
                          <div className="rounded bg-green-900/20 p-2 text-center">
                            <div className="text-lg font-bold text-green-400">
                              {data.misconceptions.resolved}
                            </div>
                            <div className="text-xs text-gray-500">Resolved</div>
                          </div>
                        </div>

                        {data.misconceptions.topMisconceptions.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase">Top Issues</span>
                            <div className="mt-2 space-y-2">
                              {data.misconceptions.topMisconceptions.map((m, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between rounded bg-gray-800 p-2"
                                >
                                  <div>
                                    <span className="text-sm text-white">{m.type}</span>
                                    <span className="ml-2 text-xs text-gray-500">
                                      ({m.pattern})
                                    </span>
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
                          <div className="rounded bg-gray-800 p-2 text-center">
                            <div className="text-lg font-bold text-white">
                              {data.learningState.totalProblemsAttempted}
                            </div>
                            <div className="text-xs text-gray-500">Attempted</div>
                          </div>
                          <div className="rounded bg-gray-800 p-2 text-center">
                            <div className="text-lg font-bold text-green-400">
                              {data.learningState.totalProblemsSolved}
                            </div>
                            <div className="text-xs text-gray-500">Solved</div>
                          </div>
                        </div>
                        <StatItem
                          label="Average Performance"
                          value={`${Math.round(data.learningState.averagePerformance)}%`}
                        />
                        <StatItem
                          label="Study Streak"
                          value={`${data.learningState.studyStreak} days`}
                          color={
                            data.learningState.studyStreak >= 7 ? "text-green-400" : "text-white"
                          }
                        />
                        <StatItem
                          label="Current Pattern"
                          value={data.learningState.currentPattern || "None"}
                        />
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
                          <div
                            key={session.id}
                            className="flex items-center justify-between rounded bg-gray-800 p-2"
                          >
                            <div>
                              <span className="text-sm text-white">
                                {session.problemTitle || session.problemId}
                              </span>
                              <div className="mt-1 flex gap-2">
                                {session.pattern && (
                                  <span className="text-xs text-blue-400">{session.pattern}</span>
                                )}
                                {session.difficulty && (
                                  <span
                                    className={`text-xs ${
                                      session.difficulty === "easy"
                                        ? "text-green-400"
                                        : session.difficulty === "hard"
                                          ? "text-red-400"
                                          : "text-yellow-400"
                                    }`}
                                  >
                                    {session.difficulty}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {session.performance !== undefined && (
                                <span
                                  className={`text-sm font-medium ${
                                    session.performance >= 70
                                      ? "text-green-400"
                                      : session.performance >= 40
                                        ? "text-yellow-400"
                                        : "text-red-400"
                                  }`}
                                >
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
                          <div key={i} className="rounded bg-gray-800 p-3">
                            <div className="mb-1 flex items-center gap-2">
                              <span>{insight.icon}</span>
                              <span className="text-sm font-medium text-white">
                                {insight.title}
                              </span>
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
