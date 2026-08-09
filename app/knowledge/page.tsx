"use client"

/**
 * /knowledge — "What CodeSparring Thinks You Know"
 *
 * The open learner model: the system's beliefs about the user's knowledge
 * (per-concept FSRS retrievability rollups, per-card evidence), inspectable
 * and — in the open condition — challengeable. Pro-gated like the rest of
 * spaced repetition.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Brain, Loader2, Lock } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { isPaidTier } from "@/lib/pricing"
import type { SubscriptionTier } from "@/lib/config"
import { memoryBandFor } from "@/lib/spaced-repetition/memory-bands"
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
import { ChallengeDialog, type CorrectionSummary } from "./_components/ChallengeDialog"

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
  /** True when we could not determine entitlement — distinct from "not entitled". */
  const [entitlementFailed, setEntitlementFailed] = useState(false)
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

  /**
   * Entitlement check. Three outcomes, not two — the previous version collapsed
   * "not Pro", "the check failed" and "no token" into isPro=false, so a 500 or a
   * network blip rendered the Upgrade wall to a paying subscriber with no error and
   * no retry, and a lapsed token left isPro null forever behind a permanent spinner.
   * Fail closed on ACCESS, never on the explanation.
   */
  const checkSubscription = useCallback(async () => {
    if (!user) return
    setEntitlementFailed(false)
    try {
      const token = await getAuthToken()
      if (!token) {
        setEntitlementFailed(true)
        setIsPro(false)
        return
      }
      const res = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setEntitlementFailed(true)
        setIsPro(false)
        return
      }
      const profile = (await res.json()) as { subscription_tier?: SubscriptionTier }
      setIsPro(isPaidTier(profile.subscription_tier ?? "free"))
    } catch {
      setEntitlementFailed(true)
      setIsPro(false)
    }
  }, [user, getAuthToken])

  useEffect(() => {
    if (initialized && user) void checkSubscription()
  }, [initialized, user, checkSubscription])

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

  // Monotonic token for the evidence fetch. Two fast clicks used to race: whichever
  // request resolved LAST won setEvidence, so card B's panel could render card A's
  // review history. On a page whose premise is "this evidence produced this belief",
  // cross-attributed evidence is the worst possible bug — every await below re-checks
  // that it still speaks for the newest request before touching state.
  const evidenceReq = useRef(0)

  /** Toggle a card's evidence panel; lazily fetch its review history. */
  const handleExpandEvidence = useCallback(
    async (card: CardBelief) => {
      if (expandedCardId === card.problem_id) {
        // Invalidate in-flight work too, or a stale resolve repopulates the panel
        // the next time it opens.
        evidenceReq.current++
        setExpandedCardId(null)
        return
      }
      const reqId = ++evidenceReq.current
      setExpandedCardId(card.problem_id)
      setEvidence([])
      setEvidenceError(null)
      setEvidenceLoading(true)
      void reportEvent("olm_card_evidence_viewed", { problem_id: card.problem_id })
      try {
        const token = await getAuthToken()
        if (reqId !== evidenceReq.current) return
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
        if (reqId !== evidenceReq.current) return
        if (!res.ok) {
          setEvidenceError(evidenceErrorForStatus(res.status))
          return
        }
        const data = await res.json()
        if (reqId !== evidenceReq.current) return
        setEvidence(data.evidence ?? [])
      } catch {
        if (reqId === evidenceReq.current) setEvidenceError(EVIDENCE_LOAD_FAILED)
      } finally {
        if (reqId === evidenceReq.current) setEvidenceLoading(false)
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
      const data = (await res.json()) as {
        challenge?: { correction?: CorrectionSummary | null }
      }
      // A 200 does not guarantee a correction: a challenge whose amendment failed
      // is stored with correction: null. Returning that gave the dialog `null`,
      // which re-rendered the untouched form — no error, no confirmation, spinner
      // gone — so the flagship action failed silently. Treat it as the failure it
      // is and let the dialog's catch say so.
      const correction = data?.challenge?.correction
      if (!correction) throw new Error("Challenge recorded without a correction")
      void fetchModel() // beliefs changed; refresh in the background
      return correction
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

  // Entitlement could not be determined. Access still fails closed — the page below
  // does not render — but the user is told the check failed and given a retry,
  // rather than being shown an upgrade pitch they may already have paid for.
  if (entitlementFailed) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-foreground mb-3 text-2xl font-bold">
              Couldn&apos;t check your account
            </h1>
            <p className="text-muted-foreground mb-8">
              We couldn&apos;t confirm your subscription just now, so this page is holding back.
              Nothing has changed on your account.
            </p>
            <Button
              onClick={() => {
                setIsPro(null)
                void checkSubscription()
              }}
              className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 dark:text-accent border"
            >
              Try again
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="mx-auto max-w-lg text-center">
            {/*
              bg-muted on bg-background is 1.03:1 in light (#f3f2ee on #f9f8f5) and
              1.10:1 in dark, where --muted is the same hex as --card — so this 64px
              badge did not render in either theme and the lock glyph floated in
              space. It is the first screen a fresh demo account sees; it gets the
              page's real surface chrome.
            */}
            <div className="border-border bg-card mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border shadow-sm">
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
              <Button className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 dark:text-accent border">
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

  // The first concept holding an at-risk card opens by default: the evidence IS the
  // product, and the page's natural state must never present as a wall of closed
  // bars. Concepts already arrive most-at-risk-first, so this is usually the top one.
  const defaultOpenPattern = model
    ? ([...model.concepts, ...model.systems].find((c) =>
        c.cards.some(
          (card) =>
            card.retrievability !== null &&
            ["warning", "urgent"].includes(memoryBandFor(card.retrievability).urgency)
        )
      )?.pattern ?? null)
    : null

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
              // The dark surface was bg-rose-500/5 (1.05:1) with a /10 border
              // (1.10:1) — imperceptible, so in dark the alert collapsed to bare
              // rose text floating on the page while light got a real tinted block.
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-600/20 bg-rose-100 p-4 text-sm text-rose-700 dark:border-rose-400/60 dark:bg-rose-500/12 dark:text-rose-400"
            >
              <span>{error}</span>
              {/* The failure is usually a lapsed token or a blip; a dead end here
                  forced a full page reload to find out which. */}
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setIsLoading(true)
                  void fetchModel()
                }}
                // No local focus ring: rose-600/40 measured 1.51:1 over the dark
                // banner, and the page's doctrine is that the full-opacity base ring
                // in globals.css is the sole supplier.
                //
                // Both borders are now FULL opacity. The previous attempt raised only
                // the dark side, to /60, and its comment claimed that cleared 3:1 —
                // it measured 2.96:1, and the light border was never touched at all
                // (rose-600/30 on the rose-100 banner: 1.63:1). This button has no
                // fill and inherits the banner's own text colour, so the border is
                // the only thing identifying it as a control, and it is the page's
                // sole recovery affordance. rose-700 is 5.02:1; rose-400 is 5.95:1.
                className="shrink-0 rounded-md border border-rose-700 px-3 py-1 font-medium transition-colors hover:bg-rose-200/60 dark:border-rose-400 dark:hover:bg-rose-500/10"
              >
                Try again
              </button>
            </div>
          )}

          {isLoading && (
            // Shaped like what actually arrives — a summary block then concept cards.
            // Three identical h-28 blocks guaranteed a layout shift on every load.
            //
            // Skeleton is bg-muted (components/ui/skeleton.tsx), which is 1.03:1 on
            // this page's background in light and 1.10:1 in dark, so the load state
            // was a blank page pulsing on nothing. Borrowing the card surface makes
            // it visible; the heights are re-measured against what actually arrives
            // (summary ~310px, a concept block ~136px) rather than guessed.
            <div className="space-y-4">
              <Skeleton className="border-border bg-card h-56 w-full rounded-xl border" />
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="border-border bg-card h-36 w-full rounded-xl border" />
              ))}
            </div>
          )}

          {!isLoading && response && !response.enabled && (
            <div className="border-border bg-card rounded-xl border p-6">
              <p className="text-foreground mb-2 font-medium">
                The learner model view isn&apos;t available right now.
              </p>
              {/* Was a single flat sentence with no route out of the page. */}
              <p className="text-muted-foreground mb-4 text-sm">
                Your practice history is still being recorded — nothing is lost. Keep practising and
                this will fill in.
              </p>
              <Link href="/practice">
                <Button className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 dark:text-accent border">
                  Go to Practice
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && model && blackBox && <BlackBoxNotice />}

          {!isLoading && model && model.total_cards > 0 && <KnowledgeSummary model={model} />}

          {!isLoading && model && model.total_cards === 0 && (
            <div className="border-border bg-card rounded-xl border p-6 text-center">
              <p className="text-foreground mb-2 font-medium">Nothing here yet</p>
              <p className="text-muted-foreground mb-4 text-sm">
                The system forms beliefs from your practice sessions. Solve a few problems and come
                back.
              </p>
              <Link href="/practice">
                <Button className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 dark:text-accent border">
                  Go to Practice
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && model && model.total_cards > 0 && (
            <div className="space-y-4">
              {/*
                One solid group container, concepts divided inside it: each concept
                as its own translucent card severed the risk strips from each other
                even though they share one 0-100 axis, and bg-card/30 composited to
                ~1.03:1 — borders around nothing, the wireframe look.
              */}
              {/*
                The first group was unlabeled while the second got a lone "Systems"
                heading, so the reader met an unnamed block and had to retroactively
                decide what it was — and ConceptCard emits h3 titles inside it, so
                h3s appeared before any h2 existed (a level skip from the h1).
                Both labels use the 11px uppercase idiom the summary stat row and
                evidence table already use, so a structural label stops competing
                with the summary's verdict line for weight.
              */}
              {/*
                Guarded like the Systems block below it. buildLearnerModel routes
                every case-lab card into `systems`, so a Pro user whose only tracked
                work is Case Labs has concepts: [] with total_cards > 0 — which
                passes the gate above and rendered the "Patterns" heading over a
                childless bordered container: a full-width, ~2px-tall empty lozenge.
              */}
              {model.concepts.length > 0 && (
                <>
                  <h2 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                    Patterns
                  </h2>
                  <div className="divide-border border-border bg-card divide-y overflow-hidden rounded-xl border shadow-sm">
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
                        defaultOpen={concept.pattern === defaultOpenPattern}
                      />
                    ))}
                  </div>
                </>
              )}

              {model.systems.length > 0 && (
                <>
                  <h2 className="text-muted-foreground pt-4 text-[11px] font-medium tracking-wider uppercase">
                    Systems
                  </h2>
                  <div className="divide-border border-border bg-card divide-y overflow-hidden rounded-xl border shadow-sm">
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
                        defaultOpen={concept.pattern === defaultOpenPattern}
                      />
                    ))}
                  </div>
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
