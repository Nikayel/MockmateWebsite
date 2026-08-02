"use client"

/**
 * /knowledge — "What CodeSparring Thinks You Know"
 *
 * The open learner model: the system's beliefs about the user's knowledge
 * (per-concept FSRS retrievability rollups, per-card evidence), inspectable
 * and — in the open condition — challengeable. Pro-gated like the rest of
 * spaced repetition.
 */

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Brain, Loader2, Lock } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import type {
  CardBelief,
  ChallengeReason,
  ConceptBelief,
  LearnerModelPayload,
} from "@/lib/learner-model/types"
import { ConceptCard } from "./_components/ConceptCard"
import { KnowledgeSummary } from "./_components/KnowledgeSummary"
import { BlackBoxNotice } from "./_components/BlackBoxNotice"
import { EvidenceList, type EvidenceRowView } from "./_components/EvidenceList"
import { ChallengeDialog } from "./_components/ChallengeDialog"

interface ModelResponse {
  enabled: boolean
  condition?: "open" | "black_box"
  model?: LearnerModelPayload
}

const EVIDENCE_LOAD_FAILED =
  "Couldn't load the review history for this problem. Try again in a moment."

/**
 * Why the evidence panel came back empty, in the user's terms.
 *
 * Every outcome used to collapse into one "couldn't load" line, which hid three
 * genuinely different situations — and a 403 is not a failure at all, it is the
 * black-box study condition doing exactly what it is supposed to do. On a page whose
 * entire premise is being honest about what the system knows and why, reporting
 * "withheld by design" as "something went wrong" is the wrong answer.
 */
function evidenceErrorForStatus(status: number): string {
  switch (status) {
    case 401:
      return "Your session expired. Sign in again to see this history."
    case 403:
      return "Review history is hidden for this account."
    case 404:
      return "Review history isn't available on this account yet."
    default:
      return EVIDENCE_LOAD_FAILED
  }
}

export default function KnowledgePage() {
  const router = useRouter()
  const { user, loading: authLoading, initialized } = useAuth()
  const [response, setResponse] = useState<ModelResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const [challengeCard, setChallengeCard] = useState<CardBelief | null>(null)
  const [evidence, setEvidence] = useState<EvidenceRowView[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)

  const getAuthToken = useCallback(async () => {
    const { auth } = await import("@/lib/firebase")
    const currentUser = auth.currentUser
    if (!currentUser) return null
    return currentUser.getIdToken()
  }, [])

  /** Fire-and-forget study-harness event; must never affect the UX. */
  const reportEvent = useCallback(
    async (eventType: string, payload: Record<string, string | number> = {}) => {
      try {
        const token = await getAuthToken()
        if (!token) return
        void fetch("/api/learner-model/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event_type: eventType, payload }),
        })
      } catch {
        // Silently ignored: analytics never breaks the page.
      }
    },
    [getAuthToken]
  )

  const fetchModel = useCallback(async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        // Signed in as far as the auth context knows, but no usable token — the
        // session lapsed mid-visit. Bailing out silently here left isLoading false
        // with no response and no error, so <main> rendered completely empty.
        setError("Your session expired. Sign in again to see what the system knows.")
        return
      }
      const res = await fetch("/api/learner-model", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      setResponse(await res.json())
    } catch {
      setError("Failed to load your learner model. Please try refreshing the page.")
    } finally {
      setIsLoading(false)
    }
  }, [getAuthToken])

  // Subscription check (same pattern as /practice).
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return
      try {
        const token = await getAuthToken()
        if (!token) return
        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const profile = await res.json()
          setIsPro(
            profile.subscription_tier === "pro" || profile.subscription_tier === "enterprise"
          )
        } else {
          setIsPro(false)
        }
      } catch {
        setIsPro(false)
      }
    }
    if (initialized && user) checkSubscription()
  }, [user, initialized, getAuthToken])

  useEffect(() => {
    if (initialized && user && isPro) fetchModel()
  }, [initialized, user, isPro, fetchModel])

  useEffect(() => {
    if (initialized && !user && !authLoading) {
      router.push("/login?redirect=/knowledge")
    }
  }, [initialized, user, authLoading, router])

  const handleConceptExpand = useCallback(
    (concept: ConceptBelief) => {
      void reportEvent("olm_concept_expanded", {
        pattern: concept.pattern,
        card_count: concept.card_count,
      })
    },
    [reportEvent]
  )

  /** Toggle a card's evidence panel; lazily fetch its review history. */
  const handleExpandEvidence = useCallback(
    async (card: CardBelief) => {
      if (expandedCardId === card.problem_id) {
        setExpandedCardId(null)
        return
      }
      setExpandedCardId(card.problem_id)
      setEvidence([])
      setEvidenceError(null)
      setEvidenceLoading(true)
      void reportEvent("olm_card_evidence_viewed", { problem_id: card.problem_id })
      try {
        const token = await getAuthToken()
        if (!token) {
          // Returning silently here left the panel on EvidenceList's empty state,
          // which asserts "No review log yet" — stating a fact about the user's
          // history when we simply never managed to read it.
          setEvidenceError(evidenceErrorForStatus(401))
          return
        }
        const res = await fetch(
          `/api/learner-model/history?problem_id=${encodeURIComponent(card.problem_id)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) {
          setEvidenceError(evidenceErrorForStatus(res.status))
          return
        }
        const data = await res.json()
        setEvidence(data.evidence ?? [])
      } catch {
        setEvidenceError(EVIDENCE_LOAD_FAILED)
      } finally {
        setEvidenceLoading(false)
      }
    },
    [expandedCardId, getAuthToken, reportEvent]
  )

  const evidenceSlot = (
    <EvidenceList loading={evidenceLoading} error={evidenceError} rows={evidence} />
  )

  /** POST the challenge; on success re-fetch the model so the correction shows. */
  const submitChallenge = useCallback(
    async (problemId: string, reason: ChallengeReason, details?: string) => {
      const token = await getAuthToken()
      if (!token) throw new Error("Not signed in")
      const res = await fetch("/api/learner-model/challenge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ problem_id: problemId, reason, details }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      void fetchModel() // beliefs changed; refresh in the background
      return data.challenge.correction
    },
    [getAuthToken, fetchModel]
  )

  if (!initialized || authLoading || (user && isPro === null)) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!user) return null // redirecting

  // Upgrade prompt for non-Pro users
  if (!isPro) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="mx-auto max-w-lg text-center">
            <div className="bg-muted mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
              <Lock className="text-muted-foreground h-8 w-8" />
            </div>
            <h1 className="text-foreground mb-3 text-2xl font-bold">
              What CodeSparring Thinks You Know
            </h1>
            <p className="text-muted-foreground mb-8">
              See the system&apos;s beliefs about your knowledge — with the evidence behind every
              estimate — and correct it when it&apos;s wrong.
            </p>
            <Link href="/pricing">
              <Button className="bg-card text-foreground hover:bg-muted">
                Upgrade to Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const model = response?.model
  const blackBox = response?.condition === "black_box"

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <Brain className="text-muted-foreground h-5 w-5" />
              <h1 className="text-foreground text-2xl font-bold">
                What CodeSparring Thinks You Know
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">
              The system&apos;s current beliefs about your knowledge — and the evidence behind them.
              If something looks wrong, you can say so.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-rose-600/20 bg-rose-100 p-4 text-sm text-rose-700 dark:border-rose-500/10 dark:bg-rose-500/5 dark:text-rose-400"
            >
              {error}
            </div>
          )}

          {isLoading && (
            // Shaped like what actually arrives — a summary block then concept cards.
            // Three identical h-28 blocks guaranteed a layout shift on every load.
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && response && !response.enabled && (
            <div className="border-border bg-card/30 rounded-xl border p-6">
              <p className="text-muted-foreground">
                The learner model view isn&apos;t available right now.
              </p>
            </div>
          )}

          {!isLoading && model && blackBox && <BlackBoxNotice />}

          {!isLoading && model && model.total_cards > 0 && <KnowledgeSummary model={model} />}

          {!isLoading && model && model.total_cards === 0 && (
            <div className="border-border bg-card/30 rounded-xl border p-6 text-center">
              <p className="text-foreground mb-2 font-medium">Nothing here yet</p>
              <p className="text-muted-foreground mb-4 text-sm">
                The system forms beliefs from your practice sessions. Solve a few problems and come
                back.
              </p>
              <Link href="/practice">
                <Button className="bg-card text-foreground hover:bg-muted">
                  Go to Practice
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && model && model.total_cards > 0 && (
            <div className="space-y-4">
              {model.concepts.map((concept) => (
                <ConceptCard
                  key={concept.pattern}
                  concept={concept}
                  challengesEnabled={model.challenges_enabled}
                  onChallenge={model.challenges_enabled ? setChallengeCard : undefined}
                  onExpand={handleConceptExpand}
                  onExpandEvidence={blackBox ? undefined : handleExpandEvidence}
                  expandedCardId={expandedCardId}
                  evidenceSlot={evidenceSlot}
                />
              ))}

              {model.systems.length > 0 && (
                <>
                  <h2 className="text-foreground pt-4 text-lg font-medium">Systems</h2>
                  {model.systems.map((concept) => (
                    <ConceptCard
                      key={concept.pattern}
                      concept={concept}
                      challengesEnabled={model.challenges_enabled}
                      onChallenge={model.challenges_enabled ? setChallengeCard : undefined}
                      onExpand={handleConceptExpand}
                      onExpandEvidence={blackBox ? undefined : handleExpandEvidence}
                      expandedCardId={expandedCardId}
                      evidenceSlot={evidenceSlot}
                    />
                  ))}
                </>
              )}

              <ChallengeDialog
                card={challengeCard}
                onClose={() => setChallengeCard(null)}
                submitChallenge={submitChallenge}
              />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
