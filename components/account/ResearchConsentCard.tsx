"use client"

import { useCallback, useEffect, useState } from "react"
import { BookOpen, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCurrentUserToken } from "@/lib/firebase-lazy"

/**
 * Research-participation consent, in plain language.
 *
 * The honest split this UI has to communicate, and the reason the copy is specific
 * rather than a generic privacy blurb: the product records your progress and answers
 * either way, because it needs them to work. What this toggle controls is whether that
 * record may also be STUDIED. Saying no costs the learner nothing and changes nothing
 * about their lessons, and the copy says so, because a consent control that implies a
 * penalty is not consent.
 */
interface ConsentState {
  consented: boolean
  version: string
  decidedAt: string
}

export function ResearchConsentCard() {
  const [consent, setConsent] = useState<ConsentState | null>(null)
  const [decided, setDecided] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const authFetch = useCallback(async (init?: RequestInit) => {
    const token = await getCurrentUserToken()
    if (!token) return null
    return fetch("/api/research-consent", {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await authFetch()
        if (!res || !res.ok) return
        const data = (await res.json()) as { consent: ConsentState | null }
        if (cancelled) return
        setConsent(data.consent)
        setDecided(data.consent !== null)
      } catch {
        if (!cancelled) setError("Couldn't load your current choice.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authFetch])

  const choose = async (consented: boolean) => {
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch({ method: "PUT", body: JSON.stringify({ consented }) })
      if (!res || !res.ok) throw new Error("save failed")
      const data = (await res.json()) as { consent: ConsentState }
      setConsent(data.consent)
      setDecided(true)
    } catch {
      setError("Couldn't save that. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const isIn = consent?.consented === true

  return (
    <section className="border-border rounded-xl border p-5">
      <div className="flex items-start gap-3">
        <BookOpen className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-foreground text-base font-semibold">Helping us study learning</h2>

          <div className="text-muted-foreground mt-2 space-y-2 text-sm">
            <p>
              CodeSparring is also a research project about how people learn to code. We want to
              understand which explanations actually work, which mistakes are common, and whether
              spaced repetition helps as much as the literature claims.
            </p>
            <p>
              <span className="text-foreground font-medium">What we record either way:</span> which
              lessons you open and finish, your answers to the inline checks, whether your code
              passed, and whether you used a hint. The product needs this to show your progress and
              to find lessons that are broken.
            </p>
            <p>
              <span className="text-foreground font-medium">What this choice controls:</span>{" "}
              whether that record can be analyzed as research and included in anonymized study data.
              We never publish anything that identifies you, and we never sell it.
            </p>
            <p>
              Saying no changes nothing about your lessons, your progress, or your account. You can
              change your mind here at any time. Withdrawing stops future use; it does not erase
              analyses already done on data you had agreed to.
            </p>
          </div>

          {loading ? (
            <p className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Loading your choice…
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => choose(true)}
                  disabled={saving}
                  variant={isIn ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  {isIn && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  Yes, use my data for research
                </Button>
                <Button
                  onClick={() => choose(false)}
                  disabled={saving}
                  variant={decided && !isIn ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  {decided && !isIn && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  No, product use only
                </Button>
              </div>

              <p className="text-muted-foreground mt-3 text-xs" role="status" aria-live="polite">
                {error
                  ? error
                  : !decided
                    ? "You have not chosen yet. Until you do, your data is used to run the product only."
                    : isIn
                      ? "Thank you. Your learning data is included in research from now on."
                      : "Your data is used to run the product only."}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
