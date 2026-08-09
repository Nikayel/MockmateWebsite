"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowRight, Lock, Clock, Crown } from "lucide-react"
import Link from "next/link"
import type { CompanyQuestionData } from "@/lib/data/company-questions/types"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { isPaidTier } from "@/lib/pricing"
import type { SubscriptionTier } from "@/lib/config"

/**
 * The gated body of a company guide.
 *
 * NOTE FOR FUTURE EDITORS: this component used to open with a banner reading "N engineers prepared
 * for {company} this month", where N was `1200 + (sum of the company name's char codes % 800)`. It
 * was invented social proof, it was deterministic per company so it never even changed, and it was
 * rendered on every one of the statically generated company pages. The same page also told visitors
 * that "the average candidate needs `mustKnowQuestions.length * 2.5` hours", a number with no
 * grounding in anything.
 *
 * Both are gone. If a section here needs a figure, it must come from the company's own authored
 * record (pattern count, difficulty mix, round count, timeline) and it must be labelled as what it
 * is. Do not reintroduce a usage or popularity metric until there is a real one to read.
 */
interface CompanyPrepContentProps {
  company: CompanyQuestionData
}

// Constants for what we show to non-logged-in users
const FREE_PATTERNS_COUNT = 3
const FREE_QUESTIONS_COUNT = 3
const FREE_ROUNDS_COUNT = 1
const FREE_TIPS_COUNT = 1

export function CompanyPrepContent({ company }: CompanyPrepContentProps) {
  const { user, firebaseUser, initialized } = useAuth()
  const isLoggedIn = !!user
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [isLoadingPro, setIsLoadingPro] = useState(false)

  // Check Pro status for logged-in users
  useEffect(() => {
    const checkProStatus = async () => {
      // Not initialized yet or no user - reset state
      if (!initialized) {
        return
      }

      if (!user?.id || !firebaseUser) {
        setIsPro(null)
        setIsLoadingPro(false)
        return
      }

      setIsLoadingPro(true)
      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/user/subscription-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = (await response.json()) as { tier?: SubscriptionTier }
          setIsPro(isPaidTier(data.tier ?? "free"))
        } else {
          // API error - default to false but don't assume
          setIsPro(false)
        }
      } catch {
        // Network error - default to false
        setIsPro(false)
      } finally {
        setIsLoadingPro(false)
      }
    }

    checkProStatus()
  }, [user?.id, firebaseUser, initialized])

  // Determine if we should show loading state for Pro-specific UI
  // Only show loading when user is logged in and we're still checking
  const isProLoading = isLoggedIn && (isPro === null || isLoadingPro)

  // Calculate locked counts
  const lockedPatternsCount = Math.max(0, company.topPatterns.length - FREE_PATTERNS_COUNT)
  const lockedQuestionsCount = Math.max(0, company.mustKnowQuestions.length - FREE_QUESTIONS_COUNT)
  const lockedRoundsCount = Math.max(0, company.interviewProcess.rounds.length - FREE_ROUNDS_COUNT)
  const lockedTipsCount = Math.max(0, company.interviewProcess.tips.length - FREE_TIPS_COUNT)

  // The mix of typical difficulties across this company's own patterns. A real fact about the
  // company's data, computed from the company's data, and the only "at a glance" claim this
  // component makes.
  const hardPatternCount = company.topPatterns.filter(
    (pattern) => pattern.typicalDifficulty === "hard"
  ).length

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left Column - Main Content */}
      <div className="space-y-8 lg:col-span-2">
        {/* What this guide contains. Derived from the company record, not from usage we cannot see. */}
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">
            This guide tracks{" "}
            <span className="text-foreground font-medium">
              {company.topPatterns.length} patterns
            </span>
            {hardPatternCount > 0 && <> ({hardPatternCount} of them typically hard)</>},{" "}
            <span className="text-foreground font-medium">
              {company.mustKnowQuestions.length} commonly reported questions
            </span>
            , and a{" "}
            <span className="text-foreground font-medium">
              {company.interviewProcess.totalRounds}-round loop
            </span>{" "}
            that usually runs {company.interviewProcess.timeline}.
          </p>
        </div>

        {/* Top Patterns */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-lg font-medium">Key patterns</h2>
            {!isLoggedIn && lockedPatternsCount > 0 && (
              <span className="text-muted-foreground text-xs">
                Showing {FREE_PATTERNS_COUNT} of {company.topPatterns.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {/* Free patterns */}
            {company.topPatterns
              .slice(0, isLoggedIn ? undefined : FREE_PATTERNS_COUNT)
              .map((pattern, idx) => (
                <div
                  key={pattern.pattern}
                  className="border-border bg-card flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground/70 w-5 text-xs">{idx + 1}</span>
                    <span className="text-foreground capitalize">
                      {pattern.pattern.replace(/-/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={difficultyColorClass(pattern.typicalDifficulty, "text")}>
                      {pattern.typicalDifficulty}
                    </span>
                    <span className="text-muted-foreground">{pattern.frequency}%</span>
                  </div>
                </div>
              ))}

            {/* Locked patterns overlay */}
            {!isLoggedIn && lockedPatternsCount > 0 && (
              <LockedContentOverlay
                count={lockedPatternsCount}
                contentType="patterns"
                companyId={company.id}
                previewItems={company.topPatterns
                  .slice(FREE_PATTERNS_COUNT, FREE_PATTERNS_COUNT + 2)
                  .map((p, idx) => (
                    <div
                      key={p.pattern}
                      className="border-border bg-card flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground/70 w-5 text-xs">
                          {FREE_PATTERNS_COUNT + idx + 1}
                        </span>
                        <span className="text-foreground capitalize">
                          {p.pattern.replace(/-/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-amber-400">{p.typicalDifficulty}</span>
                        <span className="text-muted-foreground">{p.frequency}%</span>
                      </div>
                    </div>
                  ))}
              />
            )}
          </div>
        </div>

        {/* Must-Know Questions */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-lg font-medium">Common questions</h2>
            {!isLoggedIn && lockedQuestionsCount > 0 && (
              <span className="text-muted-foreground text-xs">
                Showing {FREE_QUESTIONS_COUNT} of {company.mustKnowQuestions.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {/* Free questions */}
            {company.mustKnowQuestions
              .slice(0, isLoggedIn ? undefined : FREE_QUESTIONS_COUNT)
              .map((question) => (
                <div
                  key={question.scenarioId}
                  className="border-border bg-card flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-foreground">{question.title}</span>
                  <span
                    className={`text-xs ${
                      question.frequency === "very_common"
                        ? "text-rose-400"
                        : question.frequency === "common"
                          ? "text-amber-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {question.frequency.replace("_", " ")}
                  </span>
                </div>
              ))}

            {/* Locked questions overlay */}
            {!isLoggedIn && lockedQuestionsCount > 0 && (
              <LockedContentOverlay
                count={lockedQuestionsCount}
                contentType="must-know questions"
                companyId={company.id}
                previewItems={company.mustKnowQuestions
                  .slice(FREE_QUESTIONS_COUNT, FREE_QUESTIONS_COUNT + 2)
                  .map((q) => (
                    <div
                      key={q.scenarioId}
                      className="border-border bg-card flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-foreground">{q.title}</span>
                      <span className="text-xs text-amber-400">
                        {q.frequency.replace("_", " ")}
                      </span>
                    </div>
                  ))}
              />
            )}
          </div>
          <Link href="/interview" className="mt-4 block">
            <Button
              variant="outline"
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground w-full"
            >
              Practice these
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Interview Process */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-lg font-medium">Interview process</h2>
            {!isLoggedIn && lockedRoundsCount > 0 && (
              <span className="text-muted-foreground text-xs">
                Showing {FREE_ROUNDS_COUNT} of {company.interviewProcess.rounds.length} rounds
              </span>
            )}
          </div>
          <div className="space-y-3">
            {/* Free rounds */}
            {company.interviewProcess.rounds
              .slice(0, isLoggedIn ? undefined : FREE_ROUNDS_COUNT)
              .map((round, idx) => (
                <div key={idx} className="border-border bg-card rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-foreground font-medium">
                      {idx + 1}. {round.description}
                    </span>
                    <span className="text-muted-foreground text-xs">{round.duration} min</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {round.focusAreas.map((area) => (
                      <span
                        key={area}
                        className="text-muted-foreground bg-muted rounded px-2 py-0.5 text-xs"
                      >
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
                companyId={company.id}
                previewItems={company.interviewProcess.rounds
                  .slice(FREE_ROUNDS_COUNT, FREE_ROUNDS_COUNT + 1)
                  .map((round, idx) => (
                    <div key={idx} className="border-border bg-card rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-foreground font-medium">
                          {FREE_ROUNDS_COUNT + idx + 1}. {round.description}
                        </span>
                        <span className="text-muted-foreground text-xs">{round.duration} min</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {round.focusAreas.slice(0, 2).map((area) => (
                          <span
                            key={area}
                            className="text-muted-foreground bg-muted rounded px-2 py-0.5 text-xs"
                          >
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
        <div className="border-border bg-card rounded-lg border p-4">
          <h3 className="text-foreground mb-3 text-sm font-medium">Quick facts</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pace</span>
              <span
                className={
                  company.interviewStyle.pace === "fast"
                    ? "text-rose-400"
                    : company.interviewStyle.pace === "moderate"
                      ? "text-amber-400"
                      : "text-emerald-400"
                }
              >
                {company.interviewStyle.pace}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Optimal required</span>
              <span
                className={
                  company.interviewStyle.optimalSolutionRequired
                    ? "text-rose-400"
                    : "text-emerald-400"
                }
              >
                {company.interviewStyle.optimalSolutionRequired ? "yes" : "no"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hints given</span>
              <span
                className={
                  company.interviewStyle.providesHints ? "text-emerald-400" : "text-amber-400"
                }
              >
                {company.interviewStyle.providesHints ? "yes" : "rarely"}
              </span>
            </div>
          </div>
        </div>

        {/* Tips - Gated */}
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-foreground text-sm font-medium">Insider tips</h3>
            {!isLoggedIn && lockedTipsCount > 0 && (
              <span className="text-muted-foreground text-xs">
                {FREE_TIPS_COUNT}/{company.interviewProcess.tips.length}
              </span>
            )}
          </div>
          <ul className="space-y-2">
            {company.interviewProcess.tips
              .slice(0, isLoggedIn ? undefined : FREE_TIPS_COUNT)
              .map((tip, idx) => (
                <li key={idx} className="text-muted-foreground flex gap-2 text-sm">
                  <span className="text-muted-foreground/70">·</span>
                  {tip}
                </li>
              ))}
          </ul>

          {/* Locked tips */}
          {!isLoggedIn && lockedTipsCount > 0 && (
            <div className="border-border mt-3 border-t pt-3">
              <Link href={`/login?redirect=/interview-prep/${company.id}`}>
                <div className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-xs transition-colors">
                  <Lock className="h-3 w-3" />
                  <span>+{lockedTipsCount} more insider tips</span>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Compensation - Fully gated for non-logged-in users */}
        {company.compensation &&
          (isLoggedIn ? (
            <div className="border-border bg-card rounded-lg border p-4">
              <h3 className="text-foreground mb-3 text-sm font-medium">Compensation (TC)</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry</span>
                  <span className="text-emerald-400">{company.compensation.entryLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mid</span>
                  <span className="text-emerald-400">{company.compensation.midLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Senior</span>
                  <span className="text-emerald-400">{company.compensation.seniorLevel}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-border bg-card relative overflow-hidden rounded-lg border p-4">
              <div className="to-background/90 absolute inset-0 z-10 bg-gradient-to-b from-transparent" />
              <div className="opacity-50 blur-sm">
                <h3 className="text-foreground mb-3 text-sm font-medium">Compensation (TC)</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entry</span>
                    <span className="text-emerald-400">$XXX,XXX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mid</span>
                    <span className="text-emerald-400">$XXX,XXX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Senior</span>
                    <span className="text-emerald-400">$XXX,XXX</span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <Link href={`/login?redirect=/interview-prep/${company.id}`}>
                  <div className="border-border bg-popover/95 text-muted-foreground hover:border-border hover:text-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors">
                    <Lock className="h-3 w-3" />
                    Unlock salary data
                  </div>
                </Link>
              </div>
            </div>
          ))}

        {/* Personalized Roadmap CTA */}
        <div className="border-border bg-muted rounded-lg border p-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-foreground text-sm font-medium">Get a {company.name} study plan</h3>
            {isLoggedIn && !isProLoading && !isPro && (
              <span className="inline-flex items-center gap-1 rounded border border-[#c4703f]/30 bg-[#c4703f]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#c4703f]">
                <Crown className="h-2.5 w-2.5" />
                Pro
              </span>
            )}
          </div>
          <p className="text-muted-foreground mb-3 text-xs">
            Enter your interview date → we prioritize {company.name}'s top patterns → you get a
            day-by-day schedule.
          </p>

          {/* Different CTA based on auth/subscription status */}
          {!isLoggedIn ? (
            // Not logged in - prompt to sign up first
            <Link href={`/login?redirect=/interview-prep/${company.id}`}>
              <Button size="sm" className="w-full bg-white text-xs text-black hover:bg-zinc-200">
                Sign up to create roadmap
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            </Link>
          ) : isProLoading ? (
            // Loading state - show neutral button
            <Button
              size="sm"
              className="w-full cursor-wait bg-zinc-700 text-xs text-zinc-300"
              disabled
            >
              <span className="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
              Loading...
            </Button>
          ) : isPro ? (
            // Pro user - direct to roadmap creation
            <Link href={`/roadmap/new?company=${company.id}`}>
              <Button size="sm" className="w-full bg-white text-xs text-black hover:bg-zinc-200">
                Create roadmap
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            </Link>
          ) : (
            // Free user - show upgrade CTA
            <Link href="/upgrade">
              <Button
                size="sm"
                className="w-full bg-[#c4703f] text-xs text-black hover:bg-[#c4703f]/90"
              >
                <Crown className="mr-1.5 h-3 w-3" />
                Upgrade to Pro
              </Button>
            </Link>
          )}

          {/* Show what Pro includes for free users */}
          {isLoggedIn && !isProLoading && !isPro && (
            <p className="text-muted-foreground mt-2 text-center text-[10px]">
              Personalized roadmap is a Pro feature
            </p>
          )}
        </div>

        {/* Signed-out CTA. States the real shape of the loop rather than an invented study duration. */}
        {!isLoggedIn && (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <h3 className="mb-1 text-sm font-medium text-amber-400">Interview coming up?</h3>
                <p className="text-muted-foreground mb-3 text-xs">
                  {company.name} runs {company.interviewProcess.totalRounds} rounds over{" "}
                  {company.interviewProcess.timeline}. A free account unlocks the rest of this guide
                  and a full practice round against the AI interviewer.
                </p>
                <Link href={`/login?redirect=/interview-prep/${company.id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-700 text-xs text-amber-400 hover:bg-amber-900/30"
                  >
                    Create a free account
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

// Locked content overlay component. `companyName` used to be passed in and never read; it is gone
// rather than prefixed, since the only string this renders is the count and the content type.
function LockedContentOverlay({
  count,
  contentType,
  companyId,
  previewItems,
}: {
  count: number
  contentType: string
  companyId: string
  previewItems: React.ReactNode
}) {
  return (
    <div className="relative mt-2">
      {/* Blur overlay gradient */}
      <div className="via-background/70 to-background pointer-events-none absolute inset-0 z-10 rounded-lg bg-gradient-to-b from-transparent" />

      {/* Blurred preview content */}
      <div className="pointer-events-none space-y-2 opacity-40 blur-[2px] select-none">
        {previewItems}
      </div>

      {/* Lock CTA */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <Link href={`/login?redirect=/interview-prep/${companyId}`}>
          <div className="border-border bg-popover/95 hover:border-border group cursor-pointer rounded-xl border px-5 py-4 text-center backdrop-blur-sm transition-colors">
            <div className="bg-muted group-hover:bg-accent/20 mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors">
              <Lock className="text-muted-foreground h-4 w-4" />
            </div>
            <p className="text-foreground mb-0.5 text-sm font-medium">
              +{count} more {contentType}
            </p>
            <p className="text-muted-foreground text-xs">Sign up free to unlock</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
