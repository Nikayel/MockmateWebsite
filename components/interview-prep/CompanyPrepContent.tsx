"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowRight, Lock, Users, Clock, Crown } from "lucide-react"
import Link from "next/link"
import type { CompanyQuestionData } from "@/lib/data/company-questions/types"

interface CompanyPrepContentProps {
  company: CompanyQuestionData
}

// Constants for what we show to non-logged-in users
const FREE_PATTERNS_COUNT = 3
const FREE_QUESTIONS_COUNT = 3
const FREE_ROUNDS_COUNT = 1
const FREE_TIPS_COUNT = 1

export function CompanyPrepContent({ company }: CompanyPrepContentProps) {
  const { user, firebaseUser, loading, initialized } = useAuth()
  const isLoggedIn = !!user
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [isCheckingPro, setIsCheckingPro] = useState(false)

  // Check Pro status for logged-in users
  useEffect(() => {
    const checkProStatus = async () => {
      if (!initialized || !user?.id || !firebaseUser) {
        setIsPro(null)
        return
      }

      setIsCheckingPro(true)
      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/user/subscription-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setIsPro(data.tier === "pro" || data.tier === "enterprise")
        }
      } catch {
        // Error checking subscription - assume not pro
        setIsPro(false)
      } finally {
        setIsCheckingPro(false)
      }
    }

    checkProStatus()
  }, [user?.id, firebaseUser, initialized])

  // Calculate locked counts
  const lockedPatternsCount = Math.max(0, company.topPatterns.length - FREE_PATTERNS_COUNT)
  const lockedQuestionsCount = Math.max(0, company.mustKnowQuestions.length - FREE_QUESTIONS_COUNT)
  const lockedRoundsCount = Math.max(0, company.interviewProcess.rounds.length - FREE_ROUNDS_COUNT)
  const lockedTipsCount = Math.max(0, company.interviewProcess.tips.length - FREE_TIPS_COUNT)

  // Generate social proof number (deterministic based on company name)
  const hash = company.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const monthlyCount = 1200 + (hash % 800)

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left Column - Main Content */}
      <div className="space-y-8 lg:col-span-2">
        {/* Social Proof Banner - Only for non-logged-in users */}
        {!isLoggedIn && !loading && (
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900/50">
                  <Users className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-white">
                    <span className="font-semibold text-emerald-400">{monthlyCount.toLocaleString()}</span> engineers prepared for {company.name} this month
                  </p>
                </div>
              </div>
              <Link href={`/login?redirect=/interview-prep/${company.id}`}>
                <Button size="sm" variant="outline" className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/50 text-xs">
                  Join them
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Top Patterns */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Key patterns</h2>
            {!isLoggedIn && lockedPatternsCount > 0 && (
              <span className="text-xs text-zinc-500">
                Showing {FREE_PATTERNS_COUNT} of {company.topPatterns.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {/* Free patterns */}
            {company.topPatterns.slice(0, isLoggedIn ? undefined : FREE_PATTERNS_COUNT).map((pattern, idx) => (
              <div
                key={pattern.pattern}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 w-5">{idx + 1}</span>
                  <span className="text-white capitalize">
                    {pattern.pattern.replace(/-/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={
                    pattern.typicalDifficulty === "easy" ? "text-emerald-400" :
                    pattern.typicalDifficulty === "medium" ? "text-amber-400" : "text-rose-400"
                  }>
                    {pattern.typicalDifficulty}
                  </span>
                  <span className="text-zinc-500">{pattern.frequency}%</span>
                </div>
              </div>
            ))}

            {/* Locked patterns overlay */}
            {!isLoggedIn && lockedPatternsCount > 0 && (
              <LockedContentOverlay
                count={lockedPatternsCount}
                contentType="patterns"
                companyName={company.name}
                companyId={company.id}
                previewItems={company.topPatterns.slice(FREE_PATTERNS_COUNT, FREE_PATTERNS_COUNT + 2).map((p, idx) => (
                  <div
                    key={p.pattern}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-600 w-5">{FREE_PATTERNS_COUNT + idx + 1}</span>
                      <span className="text-white capitalize">
                        {p.pattern.replace(/-/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-amber-400">{p.typicalDifficulty}</span>
                      <span className="text-zinc-500">{p.frequency}%</span>
                    </div>
                  </div>
                ))}
              />
            )}
          </div>
        </div>

        {/* Must-Know Questions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Common questions</h2>
            {!isLoggedIn && lockedQuestionsCount > 0 && (
              <span className="text-xs text-zinc-500">
                Showing {FREE_QUESTIONS_COUNT} of {company.mustKnowQuestions.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {/* Free questions */}
            {company.mustKnowQuestions.slice(0, isLoggedIn ? undefined : FREE_QUESTIONS_COUNT).map((question) => (
              <div
                key={question.scenarioId}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
              >
                <span className="text-white">{question.title}</span>
                <span className={`text-xs ${
                  question.frequency === "very_common" ? "text-rose-400" :
                  question.frequency === "common" ? "text-amber-400" : "text-zinc-500"
                }`}>
                  {question.frequency.replace("_", " ")}
                </span>
              </div>
            ))}

            {/* Locked questions overlay */}
            {!isLoggedIn && lockedQuestionsCount > 0 && (
              <LockedContentOverlay
                count={lockedQuestionsCount}
                contentType="must-know questions"
                companyName={company.name}
                companyId={company.id}
                previewItems={company.mustKnowQuestions.slice(FREE_QUESTIONS_COUNT, FREE_QUESTIONS_COUNT + 2).map((q) => (
                  <div
                    key={q.scenarioId}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                  >
                    <span className="text-white">{q.title}</span>
                    <span className="text-xs text-amber-400">{q.frequency.replace("_", " ")}</span>
                  </div>
                ))}
              />
            )}
          </div>
          <Link href="/interview" className="block mt-4">
            <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Practice these
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Interview Process */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Interview process</h2>
            {!isLoggedIn && lockedRoundsCount > 0 && (
              <span className="text-xs text-zinc-500">
                Showing {FREE_ROUNDS_COUNT} of {company.interviewProcess.rounds.length} rounds
              </span>
            )}
          </div>
          <div className="space-y-3">
            {/* Free rounds */}
            {company.interviewProcess.rounds.slice(0, isLoggedIn ? undefined : FREE_ROUNDS_COUNT).map((round, idx) => (
              <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">
                    {idx + 1}. {round.description}
                  </span>
                  <span className="text-xs text-zinc-500">{round.duration} min</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {round.focusAreas.map((area) => (
                    <span key={area} className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Locked rounds overlay */}
            {!isLoggedIn && lockedRoundsCount > 0 && (
              <LockedContentOverlay
                count={lockedRoundsCount}
                contentType="interview rounds"
                companyName={company.name}
                companyId={company.id}
                previewItems={company.interviewProcess.rounds.slice(FREE_ROUNDS_COUNT, FREE_ROUNDS_COUNT + 1).map((round, idx) => (
                  <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">
                        {FREE_ROUNDS_COUNT + idx + 1}. {round.description}
                      </span>
                      <span className="text-xs text-zinc-500">{round.duration} min</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {round.focusAreas.slice(0, 2).map((area) => (
                        <span key={area} className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Sidebar */}
      <div className="space-y-6">
        {/* Quick facts - Always visible */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-medium text-white mb-3">Quick facts</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Pace</span>
              <span className={
                company.interviewStyle.pace === "fast" ? "text-rose-400" :
                company.interviewStyle.pace === "moderate" ? "text-amber-400" : "text-emerald-400"
              }>{company.interviewStyle.pace}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Optimal required</span>
              <span className={company.interviewStyle.optimalSolutionRequired ? "text-rose-400" : "text-emerald-400"}>
                {company.interviewStyle.optimalSolutionRequired ? "yes" : "no"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Hints given</span>
              <span className={company.interviewStyle.providesHints ? "text-emerald-400" : "text-amber-400"}>
                {company.interviewStyle.providesHints ? "yes" : "rarely"}
              </span>
            </div>
          </div>
        </div>

        {/* Tips - Gated */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">Insider tips</h3>
            {!isLoggedIn && lockedTipsCount > 0 && (
              <span className="text-xs text-zinc-500">{FREE_TIPS_COUNT}/{company.interviewProcess.tips.length}</span>
            )}
          </div>
          <ul className="space-y-2">
            {company.interviewProcess.tips.slice(0, isLoggedIn ? undefined : FREE_TIPS_COUNT).map((tip, idx) => (
              <li key={idx} className="text-sm text-zinc-400 flex gap-2">
                <span className="text-zinc-600">·</span>
                {tip}
              </li>
            ))}
          </ul>

          {/* Locked tips */}
          {!isLoggedIn && lockedTipsCount > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <Link href={`/login?redirect=/interview-prep/${company.id}`}>
                <div className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
                  <Lock className="h-3 w-3" />
                  <span>+{lockedTipsCount} more insider tips</span>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Compensation - Fully gated for non-logged-in users */}
        {company.compensation && (
          isLoggedIn ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="text-sm font-medium text-white mb-3">Compensation (TC)</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Entry</span>
                  <span className="text-emerald-400">{company.compensation.entryLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Mid</span>
                  <span className="text-emerald-400">{company.compensation.midLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Senior</span>
                  <span className="text-emerald-400">{company.compensation.seniorLevel}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/90 z-10" />
              <div className="blur-sm opacity-50">
                <h3 className="text-sm font-medium text-white mb-3">Compensation (TC)</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Entry</span>
                    <span className="text-emerald-400">$XXX,XXX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Mid</span>
                    <span className="text-emerald-400">$XXX,XXX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Senior</span>
                    <span className="text-emerald-400">$XXX,XXX</span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <Link href={`/login?redirect=/interview-prep/${company.id}`}>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors">
                    <Lock className="h-3 w-3" />
                    Unlock salary data
                  </div>
                </Link>
              </div>
            </div>
          )
        )}

        {/* Personalized Roadmap CTA */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-white">Get a {company.name} study plan</h3>
            {isLoggedIn && !isPro && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#00d9ff]/10 border border-[#00d9ff]/30 text-[10px] font-medium text-[#00d9ff]">
                <Crown className="h-2.5 w-2.5" />
                Pro
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            Enter your interview date → we prioritize {company.name}'s top patterns → you get a day-by-day schedule.
          </p>

          {/* Different CTA based on auth/subscription status */}
          {!isLoggedIn ? (
            // Not logged in - prompt to sign up first
            <Link href={`/login?redirect=/interview-prep/${company.id}`}>
              <Button size="sm" className="w-full bg-white text-black hover:bg-zinc-200 text-xs">
                Sign up to create roadmap
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            </Link>
          ) : isPro ? (
            // Pro user - direct to roadmap creation
            <Link href={`/roadmap/new?company=${company.id}`}>
              <Button size="sm" className="w-full bg-white text-black hover:bg-zinc-200 text-xs">
                Create roadmap
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            </Link>
          ) : (
            // Free user - show upgrade CTA
            <Link href="/upgrade">
              <Button size="sm" className="w-full bg-[#00d9ff] text-black hover:bg-[#00d9ff]/90 text-xs">
                <Crown className="mr-1.5 h-3 w-3" />
                Upgrade to Pro
              </Button>
            </Link>
          )}

          {/* Show what Pro includes for free users */}
          {isLoggedIn && !isPro && (
            <p className="text-[10px] text-zinc-500 mt-2 text-center">
              Personalized roadmap is a Pro feature
            </p>
          )}
        </div>

        {/* Urgency CTA for non-logged-in users */}
        {!isLoggedIn && (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-amber-400 mb-1">Interview coming up?</h3>
                <p className="text-xs text-zinc-400 mb-3">
                  The average {company.name} candidate needs {Math.ceil(company.mustKnowQuestions.length * 2.5)} hours to cover all patterns.
                </p>
                <Link href={`/login?redirect=/interview-prep/${company.id}`}>
                  <Button size="sm" variant="outline" className="w-full border-amber-700 text-amber-400 hover:bg-amber-900/30 text-xs">
                    Start preparing now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Locked content overlay component
function LockedContentOverlay({
  count,
  contentType,
  companyName,
  companyId,
  previewItems,
}: {
  count: number
  contentType: string
  companyName: string
  companyId: string
  previewItems: React.ReactNode
}) {
  return (
    <div className="relative mt-2">
      {/* Blur overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/70 to-zinc-900 z-10 rounded-lg pointer-events-none" />

      {/* Blurred preview content */}
      <div className="blur-[2px] opacity-40 pointer-events-none select-none space-y-2">
        {previewItems}
      </div>

      {/* Lock CTA */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <Link href={`/login?redirect=/interview-prep/${companyId}`}>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-5 py-4 text-center backdrop-blur-sm hover:border-zinc-600 transition-colors cursor-pointer group">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
              <Lock className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="text-sm text-white font-medium mb-0.5">
              +{count} more {contentType}
            </p>
            <p className="text-xs text-zinc-500">
              Sign up free to unlock
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
